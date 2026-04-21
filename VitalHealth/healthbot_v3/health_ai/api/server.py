"""
server.py — Health AI v3 FastAPI application.

Stateless architecture:
    - Phone stores all document chunks and embeddings
    - Server handles: OCR, embedding, and LLM generation
    - No profiles, no vector store on the server

Endpoints:
    POST /upload-and-embed      OCR + chunk + embed a file → return to client
    POST /embed-query           Embed a query string → return vector
    POST /generate              LLM generation from query + chunks
    GET  /health                Health check
    GET  /server/info           Server metadata
"""

import asyncio
import os
import socket
import tempfile
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from health_ai.embeddings.embedder import EmbeddingModel
from health_ai.rag.chunker import TextChunker
from health_ai.utils.document_reader import DocumentReader, SUPPORTED_EXTENSIONS
from health_ai.model.llm_loader import LLMEngine
from health_ai.core.character import (
    classify_intent, get_system_prompt, get_max_tokens,
    detect_urgent, DISCLAIMER, URGENT_NOTICE, OFF_TOPIC_RESPONSE,
    GREETING_MESSAGE, MAX_HISTORY_TURNS,
)
from health_ai.core.safety import apply_safety_layer
from health_ai.rag.context_builder import build_context
from health_ai.core.logger import get_logger
from health_ai.core.exceptions import (
    ModelNotFoundError, UnsupportedFileTypeError,
    EmptyDocumentError, OCRError, EmbeddingError, GenerationError,
)

log = get_logger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Health AI v3",
    description="Offline personal medical AI — Dr. Aria powered by Qwen2.5-14B-Instruct.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Singletons ────────────────────────────────────────────────────────────────

_embedder: Optional[EmbeddingModel] = None
_llm:      Optional[LLMEngine]      = None
_chunker:  Optional[TextChunker]    = None
_reader:   Optional[DocumentReader] = None


def _get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


@app.on_event("startup")
async def startup():
    global _embedder, _llm, _chunker, _reader

    port   = int(os.environ.get("PORT", 8000))
    lan_ip = _get_local_ip()

    print("\n" + "═" * 58)
    print("  🩺  Health AI v3  —  Dr. Aria is loading …")
    print("═" * 58)
    print(f"  Local:   http://localhost:{port}")
    print(f"  Network: http://{lan_ip}:{port}   ← use this in the app")
    print("═" * 58 + "\n")

    log.info("Loading embedding model …")
    _embedder = EmbeddingModel()
    _embedder._ensure_loaded()

    log.info("Loading LLM — this may take up to 60 seconds …")
    try:
        _llm = LLMEngine()
        _llm._ensure_loaded()
    except ModelNotFoundError as e:
        log.error(str(e))
        log.error("Server started but /generate will return 503 until model is placed.")

    _chunker = TextChunker()
    _reader  = DocumentReader()

    print("\n" + "═" * 58)
    print("  ✅  Dr. Aria is ready!")
    print("═" * 58 + "\n")


# ── Request / Response models ─────────────────────────────────────────────────

class EmbedQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)


class EmbedQueryResponse(BaseModel):
    query:     str
    embedding: List[float]
    dim:       int


class GenerateRequest(BaseModel):
    query:   str        = Field(..., min_length=1, max_length=2000)
    chunks:  List[str]  = Field(default=[], description="Top-K chunk texts from on-device RAG.")
    history: List[str]  = Field(default=[], description="Alternating [user, ai, user, ai …] history.")


class GenerateResponse(BaseModel):
    response: str
    intent:   str


class ChunkOut(BaseModel):
    text:      str
    embedding: List[float]
    metadata:  dict


class UploadResponse(BaseModel):
    status:      str
    filename:    str
    doc_type:    str
    chunk_count: int
    chunks:      List[ChunkOut]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/greeting", tags=["System"])
async def greeting():
    """
    Returns Dr. Aria's introduction message.
    Call this on app startup to display the welcome message to the user.
    """
    return {"message": GREETING_MESSAGE, "character": "Dr. Aria"}


@app.get("/health", tags=["System"])
async def health():
    return {
        "status":          "ok",
        "version":         "3.0.0",
        "llm_loaded":      (_llm is not None and _llm._loaded),
        "embedder_loaded": (_embedder is not None and _embedder._loaded),
        "model":           "Qwen2.5-14B-Instruct-Q5_K_M",
    }


@app.get("/server/info", tags=["System"])
async def server_info():
    port = int(os.environ.get("PORT", 8000))
    return {
        "server":          "Health AI v3",
        "character":       "Dr. Aria",
        "lan_ip":          _get_local_ip(),
        "port":            port,
        "llm_ready":       (_llm is not None and _llm._loaded),
        "embedder_ready":  (_embedder is not None and _embedder._loaded),
        "model":           "Qwen2.5-14B-Instruct-Q5_K_M",
        "embedding_model": "all-MiniLM-L6-v2",
    }


@app.post("/upload-and-embed", response_model=UploadResponse, tags=["Documents"])
async def upload_and_embed(file: UploadFile = File(...)):
    """
    Upload a PDF or image → OCR → chunk → embed → return chunks+embeddings to client.
    Server keeps nothing. Client stores everything locally.
    """
    filename = file.filename or "upload"
    ext      = Path(filename).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    suffix = ext or ".tmp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        log.info(f"Processing upload: {filename}")

        try:
            text = _reader.extract(tmp_path)
        except UnsupportedFileTypeError as e:
            raise HTTPException(status_code=415, detail=str(e))
        except EmptyDocumentError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except OCRError as e:
            raise HTTPException(status_code=422, detail=str(e))

        doc_type = _reader.detect_doc_type(filename)
        chunks   = _chunker.chunk(text, {"filename": filename, "doc_type": doc_type})

        if not chunks:
            raise HTTPException(status_code=422, detail="Document produced no text chunks.")

        try:
            embeddings = _embedder.embed([c.text for c in chunks])
        except EmbeddingError as e:
            raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")

        log.info(f"✅ {filename} → {len(chunks)} chunks, doc_type={doc_type}")

        return UploadResponse(
            status="success",
            filename=filename,
            doc_type=doc_type,
            chunk_count=len(chunks),
            chunks=[
                ChunkOut(text=c.text, embedding=embeddings[i].tolist(), metadata=c.metadata)
                for i, c in enumerate(chunks)
            ],
        )
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@app.post("/embed-query", response_model=EmbedQueryResponse, tags=["RAG"])
async def embed_query(request: EmbedQueryRequest):
    """Embed a query string → return 384-dim vector for on-device cosine similarity."""
    try:
        vec = _embedder.embed_single(request.query)
    except EmbeddingError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return EmbedQueryResponse(query=request.query, embedding=vec, dim=len(vec))


@app.post("/generate", response_model=GenerateResponse, tags=["Generation"])
async def generate(request: GenerateRequest):
    """
    LLM generation from query + retrieved chunks.

    The client sends:
        query:   user's question
        chunks:  top-K texts from on-device RAG (empty list for general questions)
        history: previous [user, ai, user, ai ...] turns

    Generation runs in a thread pool so it never blocks the async event loop.
    """
    if _llm is None or not _llm._loaded:
        raise HTTPException(
            status_code=503,
            detail="LLM not loaded. Check /health for status.",
        )

    intent = classify_intent(request.query)

    # Reject off-topic queries immediately — no LLM call, instant response
    if intent == "off_topic":
        log.info(f"Off-topic query rejected: {request.query!r}")
        return GenerateResponse(response=OFF_TOPIC_RESPONSE, intent="off_topic")

    # Enforce server-side context window: keep last MAX_HISTORY_TURNS turns
    trimmed_history = request.history[-(MAX_HISTORY_TURNS * 2):] if request.history else []

    system_prompt = get_system_prompt(intent)
    max_tokens    = get_max_tokens(intent)
    user_prompt   = build_context(request.query, request.chunks, trimmed_history)

    log.info(f"Generate [{intent}] — {len(request.chunks)} chunks, "
             f"history={len(trimmed_history)//2} turns, max_tokens={max_tokens}")

    # Run blocking LLM call in the default thread pool executor.
    # This keeps the async event loop free to handle other requests
    # (e.g. /health checks, uploads) while generation is in progress.
    loop = asyncio.get_running_loop()
    try:
        response = await loop.run_in_executor(
            None,
            lambda: _llm.generate(system_prompt, user_prompt, max_tokens=max_tokens),
        )
    except GenerationError as e:
        raise HTTPException(status_code=500, detail=str(e))

    response = apply_safety_layer(response, request.query)
    return GenerateResponse(response=response, intent=intent)


# ── v2 compatibility routes ───────────────────────────────────────────────────
# Accept old /endpoint/{profile_id} URLs. profile_id is ignored.

@app.post("/generate/{profile_id}", response_model=GenerateResponse, tags=["v2 compat"])
async def generate_compat(profile_id: str, request: GenerateRequest):
    log.info(f"v2 compat: /generate/{profile_id}")
    return await generate(request)


@app.post("/query/{profile_id}", response_model=GenerateResponse, tags=["v2 compat"])
async def query_compat(profile_id: str, request: GenerateRequest):
    log.info(f"v2 compat: /query/{profile_id}")
    return await generate(request)


@app.post("/upload-and-embed/{profile_id}", response_model=UploadResponse, tags=["v2 compat"])
async def upload_compat(profile_id: str, file: UploadFile = File(...)):
    log.info(f"v2 compat: /upload-and-embed/{profile_id}")
    return await upload_and_embed(file)


@app.post("/embed-query/{profile_id}", response_model=EmbedQueryResponse, tags=["v2 compat"])
async def embed_query_compat(profile_id: str, request: EmbedQueryRequest):
    log.info(f"v2 compat: /embed-query/{profile_id}")
    return await embed_query(request)

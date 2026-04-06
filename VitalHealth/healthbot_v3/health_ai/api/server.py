"""
server.py — Health AI v3 FastAPI application.

Architecture:
    This server is stateless with respect to documents.
    The phone/client is responsible for storing document chunks and embeddings.
    The server only handles:
        1. OCR + chunking + embedding of uploaded files → returns to client
        2. Embedding of query strings → returns to client
        3. LLM generation given query + chunks (streaming SSE)
        4. Health check

Endpoints:
    POST /upload-and-embed      Upload a file → OCR → chunk → embed → return chunks
    POST /embed-query           Embed a query string → return vector
    POST /generate              LLM generation (blocking) from query + chunks
    GET  /generate/stream       LLM generation (SSE streaming) from query + chunks
    GET  /health                Health + readiness check
    GET  /server/info           Server metadata for UI display
"""

import json
import os
import socket
import tempfile
import asyncio
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from health_ai.embeddings.embedder import EmbeddingModel
from health_ai.rag.chunker import TextChunker
from health_ai.utils.document_reader import DocumentReader, SUPPORTED_EXTENSIONS
from health_ai.model.llm_loader import LLMEngine
from health_ai.core.character import (
    classify_intent,
    get_system_prompt,
    get_max_tokens,
    detect_urgent,
)
from health_ai.core.safety import apply_safety_layer, DISCLAIMER, URGENT_NOTICE
from health_ai.rag.context_builder import build_context
from health_ai.core.logger import get_logger
from health_ai.core.exceptions import (
    ModelNotFoundError, UnsupportedFileTypeError,
    EmptyDocumentError, OCRError, EmbeddingError, GenerationError,
)

log = get_logger(__name__)

# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Health AI v3",
    description=(
        "Offline personal medical AI — powered by Dr. Aria and Qwen2.5-14B-Instruct.\n\n"
        "The server is stateless: documents are OCR'd and embedded here, "
        "but stored on the client device. Retrieval happens on-device; "
        "only the matched context is sent here for LLM generation."
    ),
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Singletons (loaded at startup) ───────────────────────────────────────────

_embedder: Optional[EmbeddingModel] = None
_llm: Optional[LLMEngine] = None
_chunker: Optional[TextChunker] = None
_reader: Optional[DocumentReader] = None


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

    port = int(os.environ.get("PORT", 8000))
    lan_ip = _get_local_ip()

    print("\n" + "═" * 58)
    print("  🩺  Health AI v3  —  Dr. Aria is loading …")
    print("═" * 58)
    print(f"  Local:   http://localhost:{port}")
    print(f"  Network: http://{lan_ip}:{port}   ← use this in the app")
    print("═" * 58 + "\n")

    # Load embedding model first (fast, ~2s)
    log.info("Loading embedding model …")
    _embedder = EmbeddingModel()
    _embedder._ensure_loaded()

    # Load LLM (slow, 20–60s depending on hardware)
    log.info("Loading LLM — this may take a minute …")
    try:
        _llm = LLMEngine()
        _llm._ensure_loaded()
    except ModelNotFoundError as e:
        log.error(str(e))
        log.error("Server will start but /generate endpoints will return 503 until the model is placed.")

    _chunker = TextChunker()
    _reader  = DocumentReader()

    print("\n" + "═" * 58)
    print("  ✅  Dr. Aria is ready. Start chatting!")
    print("═" * 58 + "\n")


# ── Pydantic request/response models ─────────────────────────────────────────

class EmbedQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="Query text to embed.")


class EmbedQueryResponse(BaseModel):
    query: str
    embedding: List[float]
    dim: int


class GenerateRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    chunks: List[str] = Field(
        default=[],
        description="Pre-retrieved chunk texts from the client's on-device RAG.",
    )
    history: List[str] = Field(
        default=[],
        description=(
            "Flat list of alternating [user_msg, ai_msg, ...]. "
            "Most recent last. Pass [] to start fresh."
        ),
    )


class ChunkResponse(BaseModel):
    text: str
    embedding: List[float]
    metadata: dict


class UploadResponse(BaseModel):
    status: str
    filename: str
    doc_type: str
    chunk_count: int
    chunks: List[ChunkResponse]


class HealthResponse(BaseModel):
    status: str
    version: str
    llm_loaded: bool
    embedder_loaded: bool
    model_name: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health():
    """
    Health and readiness check.
    Returns 200 when the server is up. 'llm_loaded' tells you if generation is ready.
    """
    return HealthResponse(
        status="ok",
        version="3.0.0",
        llm_loaded=(_llm is not None and _llm._loaded),
        embedder_loaded=(_embedder is not None and _embedder._loaded),
        model_name="Qwen2.5-14B-Instruct-Q5_K_M",
    )


@app.get("/server/info", tags=["System"])
async def server_info():
    """Server metadata — useful for UI status displays."""
    port = int(os.environ.get("PORT", 8000))
    return {
        "server": "Health AI v3",
        "version": "3.0.0",
        "character": "Dr. Aria",
        "lan_ip": _get_local_ip(),
        "port": port,
        "llm_ready": (_llm is not None and _llm._loaded),
        "embedder_ready": (_embedder is not None and _embedder._loaded),
        "model": "Qwen2.5-14B-Instruct-Q5_K_M",
        "embedding_model": "all-MiniLM-L6-v2",
        "streaming_supported": True,
    }


@app.post("/upload-and-embed", response_model=UploadResponse, tags=["Documents"])
async def upload_and_embed(file: UploadFile = File(...)):
    """
    Upload a PDF or image → OCR → chunk → embed → return chunks with embeddings.

    The client (phone) stores the returned chunks locally.
    The server keeps nothing — fully stateless.

    Supported formats: PDF, JPG, JPEG, PNG, BMP, TIFF, WEBP
    """
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{ext}'. "
                f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            ),
        )

    # Save upload to a temp file
    suffix = ext if ext else ".tmp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # 1. Extract text
        log.info(f"Extracting text from upload: {filename}")
        try:
            text = _reader.extract(tmp_path)
        except UnsupportedFileTypeError as e:
            raise HTTPException(status_code=415, detail=str(e))
        except EmptyDocumentError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except OCRError as e:
            raise HTTPException(status_code=422, detail=str(e))

        # 2. Detect document type
        doc_type = _reader.detect_doc_type(filename)

        # 3. Chunk
        base_metadata = {
            "filename": filename,
            "doc_type": doc_type,
            "source": "upload",
        }
        chunks = _chunker.chunk(text, base_metadata)
        if not chunks:
            raise HTTPException(
                status_code=422,
                detail="Document produced no text chunks after extraction.",
            )

        # 4. Embed all chunks in one batch (efficient)
        log.info(f"Embedding {len(chunks)} chunks from {filename} …")
        try:
            chunk_texts = [c.text for c in chunks]
            embeddings = _embedder.embed(chunk_texts)   # shape (N, 384)
        except EmbeddingError as e:
            raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")

        # 5. Build response
        chunk_responses = [
            ChunkResponse(
                text=chunk.text,
                embedding=embeddings[i].tolist(),
                metadata=chunk.metadata,
            )
            for i, chunk in enumerate(chunks)
        ]

        log.info(
            f"✅ Upload complete: {filename} → {len(chunks)} chunks, "
            f"doc_type={doc_type}"
        )

        return UploadResponse(
            status="success",
            filename=filename,
            doc_type=doc_type,
            chunk_count=len(chunks),
            chunks=chunk_responses,
        )

    finally:
        # Always clean up the temp file
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@app.post("/embed-query", response_model=EmbedQueryResponse, tags=["RAG"])
async def embed_query(request: EmbedQueryRequest):
    """
    Embed a query string and return its 384-dimensional vector.

    The client uses this vector to run cosine similarity against its
    locally stored chunk embeddings and identify the top-K most relevant chunks.
    """
    try:
        vec = _embedder.embed_single(request.query)
    except EmbeddingError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return EmbedQueryResponse(
        query=request.query,
        embedding=vec,
        dim=len(vec),
    )


@app.post("/generate", tags=["Generation"])
async def generate(request: GenerateRequest):
    """
    Blocking LLM generation.

    The client sends:
        - query:   the user's question
        - chunks:  the top-K chunk texts retrieved on-device (can be empty for general queries)
        - history: previous conversation turns (optional)

    Returns the full response as a JSON object:
        { "response": "...", "intent": "lab" }
    """
    if _llm is None or not _llm._loaded:
        raise HTTPException(
            status_code=503,
            detail=(
                "LLM not loaded. Place the model file at the configured path and restart. "
                "See /health for current status."
            ),
        )

    intent       = classify_intent(request.query)
    system_prompt = get_system_prompt(intent)
    max_tokens    = get_max_tokens(intent)
    user_prompt   = build_context(request.query, request.chunks, request.history)

    log.info(f"Generating [{intent}] — {len(request.chunks)} chunks, max_tokens={max_tokens}")

    try:
        response = _llm.generate(system_prompt, user_prompt, max_tokens=max_tokens)
    except GenerationError as e:
        raise HTTPException(status_code=500, detail=str(e))

    response = apply_safety_layer(response, request.query)

    return {"response": response, "intent": intent}


@app.post("/generate/stream", tags=["Generation"])
async def generate_stream(request: GenerateRequest):
    """
    Streaming SSE LLM generation.

    Returns a text/event-stream response.
    Each SSE event contains one token:
        data: <token>\\n\\n

    Special events:
        data: [INTENT]:<intent>\\n\\n   — sent first, tells UI the query type
        data: [DONE]\\n\\n              — signals end of generation
        data: [ERROR]:<message>\\n\\n   — sent if generation fails mid-stream

    The safety disclaimer is appended as regular tokens at the end,
    before the [DONE] event.

    Client usage (JavaScript):
        const es = new EventSource('/generate/stream', { method: 'POST', body: ... });
        es.onmessage = (e) => {
            if (e.data === '[DONE]') { es.close(); return; }
            appendToChat(e.data);
        };
    """
    if _llm is None or not _llm._loaded:
        raise HTTPException(
            status_code=503,
            detail="LLM not loaded. See /health for status.",
        )

    intent        = classify_intent(request.query)
    system_prompt = get_system_prompt(intent)
    max_tokens    = get_max_tokens(intent)
    user_prompt   = build_context(request.query, request.chunks, request.history)
    is_urgent     = detect_urgent(request.query)

    log.info(f"Streaming [{intent}] — {len(request.chunks)} chunks, max_tokens={max_tokens}")

    async def event_generator():
        # First event: tell the client what intent was detected
        yield f"data: [INTENT]:{intent}\n\n"

        # If urgent, send the urgent notice first
        if is_urgent:
            yield f"data: {URGENT_NOTICE}\n\n"

        # Stream the LLM response token by token
        try:
            # llama_cpp streaming is synchronous — run in a thread pool
            # so we don't block the async event loop
            loop = asyncio.get_event_loop()
            token_queue = asyncio.Queue()

            def run_stream():
                try:
                    for token in _llm.stream(system_prompt, user_prompt, max_tokens=max_tokens):
                        loop.call_soon_threadsafe(token_queue.put_nowait, token)
                except GenerationError as e:
                    loop.call_soon_threadsafe(token_queue.put_nowait, f"[ERROR]:{e}")
                finally:
                    loop.call_soon_threadsafe(token_queue.put_nowait, None)  # sentinel

            import concurrent.futures
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
            loop.run_in_executor(executor, run_stream)

            while True:
                token = await token_queue.get()
                if token is None:
                    break
                if token.startswith("[ERROR]:"):
                    yield f"data: {token}\n\n"
                    return
                # Escape newlines inside the token so SSE framing is valid
                safe_token = token.replace("\n", "\\n")
                yield f"data: {safe_token}\n\n"

        except Exception as e:
            log.error(f"Streaming error: {e}")
            yield f"data: [ERROR]:{e}\n\n"
            return

        # Append disclaimer as final tokens
        disclaimer_safe = DISCLAIMER.replace("\n", "\\n")
        yield f"data: {disclaimer_safe}\n\n"

        # Signal done
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disables nginx buffering
        },
    )

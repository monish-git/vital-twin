"""
settings.py — Central configuration for Health AI v3.

All tuneable values live here. No magic numbers scattered across the codebase.
"""
from pathlib import Path

# ── Directory layout ──────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent   # health_ai/
MODEL_DIR = BASE_DIR / "model"
LOG_DIR   = BASE_DIR / "logs"

for _d in [MODEL_DIR, LOG_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

# ── Model ─────────────────────────────────────────────────────────────────────

# Split GGUF — point to shard 1 only. llama-cpp-python loads the rest automatically.
# All 3 files must be in the model/ folder:
#   qwen2.5-14b-instruct-q5_k_m-00001-of-00003.gguf  ← shard 1 (point here)
#   qwen2.5-14b-instruct-q5_k_m-00002-of-00003.gguf
#   qwen2.5-14b-instruct-q5_k_m-00003-of-00003.gguf
# Download all 3 from: https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF
LLM_MODEL_PATH = MODEL_DIR / "qwen2.5-14b-instruct-q5_k_m-00001-of-00003.gguf"

# llama-cpp-python load settings
LLM_CONTEXT_LENGTH = 8192       # tokens; Qwen2.5 supports 128K but 8K is fast
LLM_N_THREADS      = 8          # CPU threads; increase if you have more cores
LLM_N_BATCH        = 512        # prompt eval batch size
LLM_N_GPU_LAYERS   = -1         # -1 = offload all layers to GPU if available
LLM_TEMPERATURE    = 0.2        # low = factual, deterministic
LLM_TOP_P          = 0.9
LLM_REPEAT_PENALTY = 1.15

# ── Embedding model ───────────────────────────────────────────────────────────

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"   # 90 MB, 384-dim, normalised
EMBEDDING_DIM        = 384

# ── Chunking ──────────────────────────────────────────────────────────────────

CHUNK_SIZE    = 500    # words per chunk
CHUNK_OVERLAP = 100    # word overlap between consecutive chunks

# ── RAG retrieval ─────────────────────────────────────────────────────────────

TOP_K_CHUNKS = 5       # number of chunks sent from phone → server for generation

# ── OCR ───────────────────────────────────────────────────────────────────────

OCR_MIN_CONFIDENCE = 0.40   # keep handwritten / low-contrast prescription text
OCR_MIN_LINE_CHARS = 2      # discard single-character OCR artefacts

# ── Generation token budgets ──────────────────────────────────────────────────

MAX_TOKENS_GENERAL     = 400
MAX_TOKENS_LAB         = 700    # lab summaries need more room
MAX_TOKENS_PRESCRIPTION= 600
MAX_TOKENS_SYMPTOM     = 450

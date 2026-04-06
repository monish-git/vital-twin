"""
llm_loader.py — Qwen2.5-14B-Instruct GGUF singleton for Health AI v3.

Model: Qwen2.5-14B-Instruct-Q5_K_M.gguf
Download: https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF
          → pick the file: qwen2.5-14b-instruct-q5_k_m.gguf  (~10.7 GB)

Supports:
    - Blocking generation   → generate()
    - Streaming generation  → stream()  (yields token strings)

Chat template (Qwen2.5 Instruct format):
    <|im_start|>system
    {system}<|im_end|>
    <|im_start|>user
    {user}<|im_end|>
    <|im_start|>assistant
"""

from threading import Lock
from typing import Generator

from health_ai.config.settings import (
    LLM_MODEL_PATH,
    LLM_CONTEXT_LENGTH,
    LLM_N_THREADS,
    LLM_N_BATCH,
    LLM_N_GPU_LAYERS,
    LLM_TEMPERATURE,
    LLM_TOP_P,
    LLM_REPEAT_PENALTY,
)
from health_ai.core.logger import get_logger
from health_ai.core.exceptions import ModelNotFoundError, ModelLoadError, GenerationError

log = get_logger(__name__)

# Tokens that signal the model has finished a turn
_STOP_TOKENS = ["<|im_end|>", "<|endoftext|>", "<|im_start|>"]


def _build_prompt(system_prompt: str, user_prompt: str) -> str:
    """Format input using the Qwen2.5-Instruct chat template."""
    return (
        f"<|im_start|>system\n{system_prompt.strip()}<|im_end|>\n"
        f"<|im_start|>user\n{user_prompt.strip()}<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )


def _clean_token(token: str) -> str:
    """Strip any leaked special tokens from a generated token."""
    for t in _STOP_TOKENS + ["</s>", "<|end|>"]:
        token = token.replace(t, "")
    return token


class LLMEngine:
    """
    Singleton LLM wrapper for Qwen2.5-14B-Instruct (GGUF).

    Loaded once at server startup, reused for all requests.
    Thread safety: llama_cpp releases the GIL during generation;
    simultaneous requests are serialised by the generation_lock to
    prevent VRAM contention.
    """

    _instance = None
    _creation_lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._creation_lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._loaded = False
                    cls._instance._generation_lock = Lock()
        return cls._instance

    def _ensure_loaded(self):
        if self._loaded:
            return

        if not LLM_MODEL_PATH.exists():
            raise ModelNotFoundError(
                f"Model shard 1 not found at: {LLM_MODEL_PATH}\n"
                "This is a split GGUF model. You need ALL 3 shards in the model/ folder:\n"
                "  qwen2.5-14b-instruct-q5_k_m-00001-of-00003.gguf  ← shard 1 (required)\n"
                "  qwen2.5-14b-instruct-q5_k_m-00002-of-00003.gguf\n"
                "  qwen2.5-14b-instruct-q5_k_m-00003-of-00003.gguf\n"
                "Download from: https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF"
            )
        # Check remaining shards exist too
        model_dir = LLM_MODEL_PATH.parent
        for shard in ["00002-of-00003", "00003-of-00003"]:
            shard_path = model_dir / f"qwen2.5-14b-instruct-q5_k_m-{shard}.gguf"
            if not shard_path.exists():
                raise ModelNotFoundError(
                    f"Missing model shard: {shard_path.name}\n"
                    "All 3 shards must be in the same folder for the model to load."
                )

        log.info(f"Loading LLM: {LLM_MODEL_PATH.name} …")
        log.info("This takes 20–60 seconds on first load. Please wait.")

        try:
            from llama_cpp import Llama
            self._llm = Llama(
                model_path=str(LLM_MODEL_PATH),
                n_ctx=LLM_CONTEXT_LENGTH,
                n_threads=LLM_N_THREADS,
                n_batch=LLM_N_BATCH,
                n_gpu_layers=LLM_N_GPU_LAYERS,
                verbose=False,
            )
            self._loaded = True
            log.info("✅ LLM loaded and ready.")
        except Exception as e:
            raise ModelLoadError(f"Failed to load LLM: {e}") from e

    # ── Blocking generation ───────────────────────────────────────────────────

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 500,
    ) -> str:
        """
        Generate a complete response and return it as a single string.

        Args:
            system_prompt: The character/task instruction for the model.
            user_prompt:   The user's query + any retrieved context.
            max_tokens:    Maximum tokens to generate.

        Returns:
            Generated response string (special tokens stripped).

        Raises:
            GenerationError: if the LLM call fails.
        """
        self._ensure_loaded()
        prompt = _build_prompt(system_prompt, user_prompt)

        try:
            with self._generation_lock:
                output = self._llm(
                    prompt,
                    max_tokens=max_tokens,
                    temperature=LLM_TEMPERATURE,
                    top_p=LLM_TOP_P,
                    repeat_penalty=LLM_REPEAT_PENALTY,
                    stop=_STOP_TOKENS,
                    echo=False,
                )
            raw = output["choices"][0]["text"].strip()
            return _clean_token(raw)
        except Exception as e:
            raise GenerationError(f"LLM generation failed: {e}") from e

    # ── Streaming generation ──────────────────────────────────────────────────

    def stream(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 500,
    ) -> Generator[str, None, None]:
        """
        Stream the response token by token.

        Yields:
            Individual token strings as they are generated.
            The caller is responsible for concatenating them.

        Usage (in FastAPI SSE endpoint):
            async def event_generator():
                for token in llm.stream(sys_prompt, user_prompt):
                    yield f"data: {token}\\n\\n"

        Raises:
            GenerationError: if the LLM stream fails to start.
        """
        self._ensure_loaded()
        prompt = _build_prompt(system_prompt, user_prompt)

        try:
            with self._generation_lock:
                for chunk in self._llm(
                    prompt,
                    max_tokens=max_tokens,
                    temperature=LLM_TEMPERATURE,
                    top_p=LLM_TOP_P,
                    repeat_penalty=LLM_REPEAT_PENALTY,
                    stop=_STOP_TOKENS,
                    echo=False,
                    stream=True,
                ):
                    token = chunk["choices"][0].get("text", "")
                    token = _clean_token(token)
                    if token:
                        yield token
        except Exception as e:
            raise GenerationError(f"LLM streaming failed: {e}") from e

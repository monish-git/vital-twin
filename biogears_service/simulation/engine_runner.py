"""
engine_runner.py — BioGears subprocess launcher (v2).

Improvements vs v1:
  - Logs engine stderr to BASE_DIR/logs/engine_{user_id}_{ts}.log
  - Configurable timeout (default 120 s) — kills subprocess if exceeded
  - Returns {success, log_path} dict (backward compat: dict is truthy on success)
"""

import os
import subprocess
import datetime
import logging
from pathlib import Path

from biogears_service.simulation.config import (
    BIOGEARS_EXECUTABLE, BIOGEARS_BIN_DIR, LOGS_DIR
)

logger = logging.getLogger("DigitalTwin.Engine")

ENGINE_TIMEOUT_SECONDS = int(os.environ.get("ENGINE_TIMEOUT_SECONDS", "600"))


class EngineResult:
    """Dict-like result that is truthy when the engine succeeded."""
    def __init__(self, success: bool, log_path: str, return_code: int):
        self.success       = success
        self.log_path      = log_path
        self.return_code   = return_code

    def __bool__(self):
        return self.success

    def __repr__(self):
        return f"EngineResult(success={self.success}, rc={self.return_code})"


def run_biogears(scenario_path: str, user_id: str = "unknown") -> EngineResult:
    """
    Launches BioGears CLI for the given scenario file.

    Args:
        scenario_path: Absolute path to the scenario XML.
        user_id:       Used only for log file naming.

    Returns:
        EngineResult — truthy if engine exited with code 0 within timeout.
    """
    ts        = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path  = LOGS_DIR / f"engine_{user_id}_{ts}.log"
    rel_scenario = os.path.relpath(scenario_path, BIOGEARS_BIN_DIR)
    command   = f'"{BIOGEARS_EXECUTABLE.name}" Scenario "{rel_scenario}"'

    logger.info(f"🚀 Engine launch | user={user_id} | scenario={rel_scenario}")

    try:
        proc = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            shell=True,
            cwd=str(BIOGEARS_BIN_DIR),
        )

        output_lines = []
        try:
            stdout, _ = proc.communicate(timeout=ENGINE_TIMEOUT_SECONDS)
            output_lines = stdout.splitlines()
            for line in output_lines:
                logger.debug(f"⚙️  {line}")
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.communicate()
            logger.error(f"⏰ Engine timeout after {ENGINE_TIMEOUT_SECONDS}s — killed.")
            _write_log(log_path, output_lines + [f"[TIMEOUT after {ENGINE_TIMEOUT_SECONDS}s]"])
            return EngineResult(success=False, log_path=str(log_path), return_code=-1)

        _write_log(log_path, output_lines)
        rc = proc.returncode
        success = (rc == 0)

        if success:
            logger.info(f"✅ Engine finished OK | log={log_path}")
        else:
            logger.error(f"❌ Engine exited rc={rc} | log={log_path}")

        return EngineResult(success=success, log_path=str(log_path), return_code=rc)

    except Exception as e:
        logger.error(f"❌ Engine launch exception: {e}")
        _write_log(log_path, [f"[LAUNCH ERROR] {e}"])
        return EngineResult(success=False, log_path=str(log_path), return_code=-2)


def _write_log(path: Path, lines: list):
    try:
        Path(path).write_text("\n".join(lines), encoding="utf-8")
    except Exception:
        pass  # Log writing is best-effort


def get_latest_log(user_id: str) -> str | None:
    """Returns the content of the most recent engine log for a user, or None."""
    logs = sorted(LOGS_DIR.glob(f"engine_{user_id}_*.log"),
                  key=os.path.getmtime, reverse=True)
    if not logs:
        return None
    try:
        return logs[0].read_text(encoding="utf-8")
    except Exception:
        return None
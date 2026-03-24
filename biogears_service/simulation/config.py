from pathlib import Path
import os

# Base directory: C:\health-digital-twin
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Engine Workspace
BIOGEARS_BIN_DIR = BASE_DIR / "biogears_service" / "engine" / "BioGears" / "bin"
BIOGEARS_EXECUTABLE = BIOGEARS_BIN_DIR / "bg-cli.exe"
SCENARIO_API_DIR = BIOGEARS_BIN_DIR / "Scenarios" / "API"

# Clinical Repository
CLINICAL_DATA_DIR = BASE_DIR / "clinical_data"
USER_STATES_DIR = CLINICAL_DATA_DIR / "states"
USER_HISTORY_DIR = CLINICAL_DATA_DIR / "history"
REPORTS_DIR = BASE_DIR / "reports"

# BioGears sub-directories (read-only asset folders)
SUBSTANCES_DIR = BIOGEARS_BIN_DIR / "substances"
ENVIRONMENTS_DIR = BIOGEARS_BIN_DIR / "environments"
NUTRITION_DIR = BIOGEARS_BIN_DIR / "nutrition"

# Engine debug logs
LOGS_DIR = BASE_DIR / "logs"

# Satisfy legacy imports
BIO_OUTPUT_DIR = BIOGEARS_BIN_DIR

# Create directories
for path in [SCENARIO_API_DIR, USER_STATES_DIR, USER_HISTORY_DIR, REPORTS_DIR, LOGS_DIR]:
    path.mkdir(parents=True, exist_ok=True)
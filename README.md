# BioGears Digital Twin — Backend API

Physiological simulation engine API powered by [BioGears](https://github.com/BioGearsEngine/core).  
Built for the VitalTwin health app integration.

---

## ⚙️ Requirements

| Requirement | Detail |
|---|---|
| OS | **Windows 10/11 or Ubuntu 22.04 LTS** |
| CPU | **x86-64 only** (NO ARM — BioGears is x86-64 compiled) |
| RAM | 8 GB minimum (16 GB recommended) |
| Python | 3.11+ |
| BioGears | Precompiled binary (see below) |

---

## 🚀 Setup

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd health-digital-twin
```

### 2. Create virtual environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Install BioGears engine binary
BioGears is a C++ compiled binary that is NOT included in this repo (too large).

- Download from: https://github.com/BioGearsEngine/core/releases
- Extract to: `biogears_service/engine/`
- The binary should be at: `biogears_service/engine/bin/BioGearsEngine` (Linux) or `BioGearsEngine.exe` (Windows)

### 5. Configure paths
Edit `biogears_service/simulation/config.py` and set:
```python
BIOGEARS_BIN_DIR = Path("path/to/biogears/bin")
```

### 6. Start the server
```bash
# Development (auto-reload)
uvicorn biogears_service.api.server:app --host 0.0.0.0 --port 8000 --reload

# Production
uvicorn biogears_service.api.server:app --host 0.0.0.0 --port 8000 --workers 4
```

Server will start at `http://0.0.0.0:8000`  
API docs at `http://localhost:8000/docs`

---

## 🔌 Connecting from the VitalTwin App

In the VitalTwin app → **Settings → Digital Twin Server**, enter:
```
http://<YOUR_PC_IP>:8000
```

Find your PC's IP:
- **Windows:** `ipconfig` → look for IPv4 Address
- **Linux:** `hostname -I`

All devices on the same WiFi network can connect.

---

## 📡 Key Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Server health check |
| `/register` | POST | Create a new Digital Twin |
| `/sync/batch` | POST | Run physiological simulation |
| `/health-score/{user_id}` | GET | Composite health score (A–F) |
| `/analytics/recovery-readiness/{user_id}` | GET | Recovery readiness (0–100) |
| `/analytics/cvd-risk/{user_id}` | GET | 10-year CVD risk score |
| `/analytics/predicted-hba1c/{user_id}` | GET | Predicted HbA1c from simulation |
| `/analytics/weekly-summary/{user_id}` | GET | Weekly health insights |
| `/metrics/{user_id}` | GET | BMI, BSA, ideal weight |
| `/history/{user_id}` | GET | List simulation sessions |
| `/vitals/{user_id}/trends` | GET | Long-term vital trends |

Full API documentation: `http://localhost:8000/docs`

---

## 🔐 Optional API Key

Set environment variable to enable API key protection:
```bash
# Windows
set DIGITAL_TWIN_API_KEY=your-secret-key

# Linux
export DIGITAL_TWIN_API_KEY=your-secret-key
```

Then include `X-API-Key: your-secret-key` in all requests.

---

## 📁 Project Structure

```
health-digital-twin/
├── biogears_service/
│   ├── api/
│   │   ├── server.py          # FastAPI app + all endpoints
│   │   ├── analytics.py       # Health analytics functions
│   │   ├── db.py              # Patient profile store
│   │   └── streaming.py       # Streaming support
│   └── simulation/
│       ├── config.py          # Paths configuration
│       ├── scenario_builder.py# BioGears XML generation
│       ├── engine_runner.py   # BioGears subprocess
│       ├── patient_builder.py # Patient XML builder
│       ├── validator.py       # Event validation
│       └── substance_registry.py # 79-substance database
├── requirements.txt
└── README.md
```

---

## ⚕️ Disclaimer

This is a **research simulation tool**, not a medical device.  
All outputs are physiological estimates for educational purposes only.  
Not for diagnosis or clinical decision making.

---

## 📖 References

- BioGears Engine: https://biogearsengine.com/
- FastAPI: https://fastapi.tiangolo.com/
- WHO South Asian BMI thresholds (2004)
- Framingham Risk Score
- ADAG HbA1c formula: Nathan et al. (2008)

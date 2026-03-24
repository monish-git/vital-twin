# 🧬 Health Digital Twin — Frontend Developer Guide

> **Backend** is a FastAPI server running at `http://127.0.0.1:8000`  
> **All responses** are JSON unless noted. **CORS is open** (`*`) — no auth headers needed.

---

## 📋 Full API Reference

| Method | Endpoint | What It Does |
|--------|----------|--------------|
| `GET`  | `/profiles` | List all registered twins |
| `POST` | `/register` | Create & calibrate a new twin |
| `DELETE` | `/profiles/{user_id}` | Permanently delete a twin |
| `POST` | `/sync/batch` | Log health events & get back vitals |
| `GET`  | `/history/{user_id}` | Get list of past sessions |
| `GET`  | `/history/{user_id}/{session_id}` | Get full timeseries data for a session |
| `POST` | `/predict/recovery` | Run a 4-hour physiological forecast |
| `GET`  | `/view-reports/{filename}` | Static file: download/view `.png` reports |

---

## 📱 Recommended Pages (Screens)

### Page 1 — Dashboard / Home (`/`)

**Purpose:** The landing screen. Shows all existing digital twins.

**API Call:**
```
GET http://127.0.0.1:8000/profiles
```

**Response Shape:**
```json
{
  "profiles": [
    { "user_id": "alice", "status": "Calibrated", "last_active": "2026-03-22T15:00:00" }
  ]
}
```

**What to show:**
- A card for each profile showing `user_id`, [status](file:///c:/health-digital-twin/biogears_service/api/server.py#491-512), and `last_active` (formatted as a readable date).
- A **"New Twin"** button → navigates to the Registration page.
- Each card should have:
  - A **"View"** button → navigates to the Twin Detail page for that `user_id`.
  - A **"Delete"** button → calls `DELETE /profiles/{user_id}` then refreshes the list.

**Delete Confirmation call:**
```
DELETE http://127.0.0.1:8000/profiles/{user_id}
```

---

### Page 2 — Register New Twin (`/register`)

**Purpose:** Create a new patient digital twin by entering demographics and conditions.

**API Call (on form submit):**
```
POST http://127.0.0.1:8000/register
Content-Type: application/json
```

**Request Body (all fields):**
```json
{
  "user_id": "alice",
  "age": 30,
  "weight": 65.0,
  "height": 165.0,
  "sex": "Female",
  "body_fat": 0.22,
  "resting_hr": 68.0,
  "systolic_bp": 118.0,
  "diastolic_bp": 76.0,
  "is_smoker": false,
  "has_anemia": false,
  "has_type1_diabetes": false,
  "has_type2_diabetes": false
}
```

> **Notes:**
> - `sex` must be `"Male"` or `"Female"` (BioGears standard).
> - `body_fat` is a fraction `0.0–1.0` (e.g. 22% = `0.22`).
> - The optional fields all have defaults — they are not required.
> - Only ONE of `has_type1_diabetes` or `has_type2_diabetes` should be true.
> - `user_id` must be **unique** — no spaces, keep it alphanumeric.

**Success Response:**
```json
{ "status": "success", "message": "Twin alice calibrated." }
```

**Form Fields to Build:**
- Text: `user_id`
- Number: [age](file:///c:/health-digital-twin/biogears_service/simulation/substance_manager.py#4-39), `weight (kg)`, `height (cm)`, `body_fat (%)`, `resting_hr`, `systolic_bp`, `diastolic_bp`
- Radio/Select: `sex` → `Male` / `Female`
- Checkboxes: `is_smoker`, `has_anemia`, `has_type1_diabetes`, `has_type2_diabetes`

> ⚠️ Registration runs a full BioGears simulation — it takes **10–30 seconds**. Show a loading spinner!

---

### Page 3 — Twin Detail / Health Log (`/twin/:user_id`)

**Purpose:** Main screen for a twin. Log health events and see current vitals.

#### Part A — Log a Health Event

**API Call:**
```
POST http://127.0.0.1:8000/sync/batch
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "alice",
  "events": [
    {
      "event_type": "exercise",
      "value": 0.5,
      "time_offset": 0
    },
    {
      "event_type": "meal",
      "value": 600,
      "time_offset": 300
    }
  ]
}
```

**Supported `event_type` values:**

| `event_type` | [value](file:///c:/health-digital-twin/biogears_service/api/analytics.py#42-55) meaning | `substance_name` needed? |
|---|---|---|
| `"exercise"` | Intensity 0.0 (rest) → 1.0 (max) | No |
| `"sleep"` | Hours of sleep (e.g. `8`) | No |
| `"meal"` | Calories consumed (e.g. `600`) | No |
| `"substance"` | Dose amount (number) | **Yes** |

**Available `substance_name` values:**

| Category | Names |
|---|---|
| Blood products (IV) | `Blood_APositive`, `Blood_ANegative`, `Blood_BPositive`, `Blood_BNegative`, `Blood_ABPositive`, `Blood_ABNegative`, `Blood_OPositive`, `Blood_ONegative`, `Albuminar_25`, `Albuminex` |
| Oral | `Caffeine`, `Acetaminophen`, `Aspirin` |
| Nasal (inhaled) | `Albuterol` |
| IV bolus | `Fentanyl`, `Epinephrine`, `Morphine`, and others |

**Success Response:**
```json
{
  "status": "success",
  "vitals": {
    "heart_rate": 78.3,
    "blood_pressure": "120/80",
    "glucose": 95.2,
    "respiration": 15.1
  },
  "report_url": "http://127.0.0.1:8000/view-reports/alice_report.png"
}
```

**What to show after sync:**
- Current vitals in 4 cards: **Heart Rate**, **Blood Pressure**, **Glucose**, **Respiration Rate**
- An embedded image from `report_url` (it's a `.png` — just use `<img src={report_url} />`)

> ⚠️ Sync also takes **10–30 seconds** — show a loading spinner!

#### Part B — UI for building events

Suggest a simple form:
- A dropdown: `event_type` ([exercise](file:///c:/health-digital-twin/biogears_service/simulation/scenario_builder.py#156-162), `sleep`, [meal](file:///c:/health-digital-twin/biogears_service/simulation/scenario_builder.py#59-83), [substance](file:///c:/health-digital-twin/biogears_service/simulation/substance_manager.py#37-39))
- When [substance](file:///c:/health-digital-twin/biogears_service/simulation/substance_manager.py#37-39) selected → show a second dropdown for `substance_name`
- A number input for [value](file:///c:/health-digital-twin/biogears_service/api/analytics.py#42-55)
- A `time_offset` input (seconds from start — start at 0 for the first event)
- An **"Add Event"** button to queue multiple events in a list
- A **"Run Simulation"** button to POST the whole batch

---

### Page 4 — History Browser (`/twin/:user_id/history`)

**Purpose:** Browse all past simulation sessions for a twin.

#### Step 1 — List all sessions

```
GET http://127.0.0.1:8000/history/{user_id}
```

**Response:**
```json
{
  "user_id": "alice",
  "sessions": [
    { "session_id": "20260322_150000", "timestamp": "2026-03-22T15:00:00" }
  ]
}
```

Show each session as a row with its timestamp. Clicking opens the session detail.

#### Step 2 — Load session data

```
GET http://127.0.0.1:8000/history/{user_id}/{session_id}
```

**Response:** An array of up to 100 data points (downsampled):
```json
[
  {
    "Time": 10,
    "HeartRate": 72.3,
    "SystolicArterialPressure": 120.0,
    "DiastolicArterialPressure": 80.0,
    "RespirationRate": 14.5,
    "Glucose-BloodConcentration": 95.0,
    "AchievedExerciseLevel": 0.0
  }
]
```

**What to show:**
- A **line chart** plotting `HeartRate`, `SystolicArterialPressure`, `DiastolicArterialPressure`, `RespirationRate`, and `Glucose-BloodConcentration` over `Time`.
- Use a charting library like **Chart.js**, **Recharts**, or **Plotly**.

---

### Page 5 — 4-Hour Forecast (`/twin/:user_id/forecast`)

**Purpose:** Predict what the patient's vitals will look like in the next 4 hours.

**API Call:**
```
POST http://127.0.0.1:8000/predict/recovery
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "alice",
  "hours": 4
}
```

> `hours` is optional — defaults to 4. You can offer a slider (1–12 hours).

**Success Response:**
```json
{
  "status": "success",
  "forecast_chart": "http://127.0.0.1:8000/view-reports/alice_alice_forecast_1234567890_forecast.png"
}
```

**What to show:**
- A prominent **"Run Forecast"** button.
- On success, embed the `forecast_chart` image (shows predicted Glucose + Heart Rate).
- Show a disclaimer: *"This is a physiological simulation, not medical advice."*

> ⚠️ Forecast also takes **10–45 seconds**. Show a loading state!

---

## 🗺️ Recommended Navigation Structure

```
/ (Dashboard — list of all twins)
├── /register (New twin form)
└── /twin/:user_id
    ├── (Default tab: Log Events / Current Vitals)
    ├── /twin/:user_id/history (Past Sessions)
    │   └── /twin/:user_id/history/:session_id (Session Chart)
    └── /twin/:user_id/forecast (4-Hour Prediction)
```

---

## 🚀 Advanced Capabilities available

The backend now fully supports everything your frontend will need out of the box:

1. **`GET /profiles/{user_id}`** — Fetch individual profile metadata perfectly.
2. **`GET /substances`** — Auto-discovered list of all 45 available substances and their proper injection/oral routes. No hardcoding necessary!
3. **`POST /predict/whatif`** — Send an intervention event and the backend will run two parallel simulations, giving you a beautiful baseline vs intervention comparison chart.
4. **Server-Sent Events (SSE)** — Real-time progress streaming for long-running simulations so your UI can show a live progress bar.
5. **Detailed Engine Logs** — `GET /engine/log/{user_id}` allows you to see exactly what BioGears is doing under the hood for debugging.

## 🔧 Tech Stack Suggestions for Frontend

| Concern | Recommendation |
|---|---|
| Framework | React (with Vite) or Next.js |
| HTTP calls | `fetch` or `axios` |
| Charts | `Recharts` or `Chart.js` |
| Loading states | `react-query` or manual `useState` |
| Routing | `react-router-dom` |
| UI components | Shadcn/ui or MUI |

---

## 🧪 Quick Test (verify backend is running)

Open a browser and go to:
```
http://127.0.0.1:8000/docs
```
This opens the **FastAPI Swagger UI** — your friend can use it to try every endpoint manually before writing any frontend code.

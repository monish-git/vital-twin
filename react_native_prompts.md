# 📱 React Native AI Generation Prompts

*Give these prompts directly to your AI code generator (like ChatGPT, Claude, Cursor, or v0). They are specifically designed to force the AI to respect your existing theme while perfectly integrating all of our custom BioGears backend features.*

---

## 🏗️ Prompt 0: The "System Prompt" (Send this first)

**Copy and paste this first to set the ground rules for your UI theme and our backend:**

> "I am building a React Native mobile application for a Health Digital Twin. I already have an existing design theme and UI components. 
> 
> **CRITICAL RULES FOR ALL GENERATED CODE:**
> 1. **Do not hallucinate CSS/Styles:** Use my existing custom components (e.g., `<MyButton>`, `<Card>`, `<Text>`) or style it using the design system I provide you (e.g., NativeWind className, or React Native Paper). If I give you a component library reference, ONLY use those components.
> 2. **Backend API:** The backend is a FastAPI server. Assume `const BASE_URL = 'http://127.0.0.1:8000'`. Always use `fetch` or `axios` for network calls.
> 3. **Loading States:** Many backend simulations take 10-40 seconds. You MUST include robust `<ActivityIndicator>` or skeleton loading states that prevent the user from pressing buttons multiple times while waiting.
> 4. **Error Handling:** Always wrap API calls in `try/catch` and show user-friendly alerts using `Alert.alert('Error', error.message)`.
> 5. **Images:** The backend returns PNG charts as URLs. You must use the React Native `<Image>` component passing `source={{ uri: url }}` to display them. Set `resizeMode="contain"` and give them a fixed `height` (e.g., 300) and `width="100%"`."

---

## 🏠 Prompt 1: The Dashboard (Profiles List)

**Copy and paste this:**

> "Generate a React Native screen called `DashboardScreen.tsx`.
> 
> **Features:**
> 1. Uses `useEffect` to fetch data from `GET ${BASE_URL}/profiles`.
> 2. The response is JSON: `{ "profiles": [ { "user_id": "alice", "status": "Calibrated", "last_active": "2026-03-22T15:00:00" } ] }`.
> 3. Render a scrollable list (using `FlatList` or `ScrollView`) of profile cards. 
> 4. Each card displays the `user_id` and a clean, localized `last_active` date.
> 5. Each card needs a 'View Twin' button that calls `navigation.navigate('TwinDetail', { userId: item.user_id })`.
> 6. Include a 'New Digital Twin' Floating Action Button (FAB) or prominent primary button at the top/bottom that navigates to `RegistrationScreen`.
> 7. Add a pull-to-refresh mechanism (`RefreshControl`) to reload the profiles.
> 
> Please generate the code strictly using my existing UI theme components."

---

## 📝 Prompt 2: The Registration Screen

**Copy and paste this:**

> "Generate a React Native screen called `RegistrationScreen.tsx`.
> 
> **Features:**
> 1. A scrollable form (`KeyboardAwareScrollView` or `ScrollView` with `KeyboardAvoidingView`) to create a new digital twin. 
> 2. Needs the following inputs:
>    - `user_id` (Text input, no spaces, required)
>    - `sex` (Picker/Dropdown: 'Male' or 'Female', required)
>    - [age](file:///c:/health-digital-twin/biogears_service/simulation/substance_manager.py#4-39) (Numeric input, default 30)
>    - `weight` (Numeric input in kg, default 70)
>    - `height` (Numeric input in cm, default 170)
>    - `body_fat` (Numeric input fraction 0.0-1.0, default 0.2)
>    - `resting_hr` (Numeric input, default 72)
>    - `systolic_bp` (Numeric input, default 115)
>    - `diastolic_bp` (Numeric input, default 75)
>    - Checkboxes/Switches for: `is_smoker`, `has_anemia`, `has_type1_diabetes`, `has_type2_diabetes`. (Ensure type 1 and type 2 are mutually exclusive).
> 3. A massive 'Calibrate Twin' primary submit button.
> 4. On submit, POST the data as JSON to `${BASE_URL}/register`.
> 5. **Crucial:** Registration takes up to 30-45 seconds. Disable the submit button and show a full-screen or prominent loading spinner with text 'Calibrating Engine...' while waiting.
> 6. On success (status 200), show an alert 'Calibration Successful' and `navigation.goBack()`.
> 
> Please generate the code matching our established UI patterns."

---

## 🏥 Prompt 3: Twin Detail & Health Event Logging

**Copy and paste this:**

> "Generate a React Native screen called `TwinDetailScreen.tsx`. It receives `userId` via route params.
> 
> **Features:**
> 1. Fetch available substances from `GET ${BASE_URL}/substances` on mount. The API returns `{ "substances": { "ORAL": ["Caffeine", ...], "IV_BOLUS": [...] } }`. Extract all values into a single array of strings for a substance dropdown.
> 2. **UI Section 1 (Current Vitals):** A grid or row of cards to display current vitals (`heart_rate`, `blood_pressure`, `glucose`, `respiration`, `spo2`, `core_temperature`). Initialize these to '---' or 0.
> 3. **UI Section 2 (Event Builder):** A form to build one or more health events into a local React state array.
>    - `event_type` (Dropdown: 'exercise', 'meal', 'substance', 'water', 'environment')
>    - IF 'substance' is selected: Show a dropdown for `substance_name` (using the fetched list).
>    - IF 'meal' is selected: Show a dropdown for `meal_type` ('balanced', 'high_carb', 'high_protein', 'fast_food', 'ketogenic').
>    - IF 'environment' is selected: Show a dropdown/text-input for `environment_name` (e.g., 'HotEnvironment', 'ColdEnvironment').
>    - [value](file:///c:/health-digital-twin/biogears_service/api/analytics.py#42-55) (Numeric input: ml/mg/kcal/intensity).
>    - `time_offset` (Numeric input: seconds from start of simulation).
> 4. Allow the user to press 'Add Event' to pile up multiple events in an ongoing list array in the UI. Allow deleting items from this list.
> 5. **UI Section 3 (Submit):** A 'Run Batch Simulation' button.
>    - POST the accumulated event array to `${BASE_URL}/sync/batch`.
>    - Payload format: `{ "user_id": "alice", "events": [...] }`.
>    - Show a heavy loading state (takes 20+ seconds) with text 'Simulating...'.
>    - Upon success, the API returns `{ "status": "success", "vitals": { ... }, "report_url": "http..." }`.
>    - Update the 'Current Vitals' section with the new data.
>    - Display the chart Image using `<Image source={{ uri: returnData.report_url }} style={{ width: '100%', height: 350 }} resizeMode="contain" />`.
> 
> Keep the styling perfectly consistent with my theme."

---

## 🔮 Prompt 4: What-If Predictive Analytics

**Copy and paste this:**

> "Generate a React Native screen called `WhatIfScreen.tsx`. It receives `userId` via params.
> 
> This screen lets the user predict the outcome of a single intervention over a set period of time without actually saving the state.
> 
> **Features:**
> 1. A form for a single 'Intervention Event'. Use inputs for `event_type`, [value](file:///c:/health-digital-twin/biogears_service/api/analytics.py#42-55), and `substance_name`/`meal_type`/`environment_name` exactly like the Event Builder screen.
> 2. A slider or numeric input for `Prediction Duration (Hours)` ranging from `0.25` to `4.0`.
> 3. A massive 'Generate What-If Forecast' button that POSTs to `${BASE_URL}/predict/whatif`.
>    - Payload: `{ "user_id": "alice", "event": { "event_type": "...", "value": 100, "time_offset": 0 }, "hours": 1.5 }`
> 4. **Loading State:** This runs two full simulations in the background. It takes 30-90 seconds. Show a very clear 'Running AI Prediction Framework...' full-screen loading overlay with an activity indicator. Let the user know it takes a while.
> 5. **Success State:** The API will return `{ "status": "success", "baseline_chart": "url", "intervention_chart": "url", "comparison_chart": "url" }`.
> 6. Inside a `<ScrollView>`, render the three `<Image>` components stacked vertically to display the baseline chart, intervention chart, and the overlay comparison chart. Give each image a descriptive title.
> 
> Please cleanly apply our existing theme styles."

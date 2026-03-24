import requests
import time
import sys

BASE_URL = "http://127.0.0.1:8000"
USER_ID = "test_twin_001"

def wait_for_server():
    for _ in range(15):
        try:
            r = requests.get(f"{BASE_URL}/docs")
            if r.status_code == 200:
                print("✅ Server is up.")
                return True
        except:
            pass
        time.sleep(1)
    print("❌ Server did not start in time.")
    return False

def run_tests():
    # 1. Register a new twin
    print("\n--- 1. Testing /register ---")
    reg_payload = {
        "user_id": USER_ID,
        "age": 30, "weight": 80.0, "height": 180.0, "sex": "Male",
        "resting_hr": 70.0, "systolic_bp": 120.0, "diastolic_bp": 80.0,
        "is_smoker": False, "has_anemia": False,
        "has_type1_diabetes": False, "has_type2_diabetes": False
    }
    r = requests.post(f"{BASE_URL}/register", json=reg_payload)
    if r.status_code != 200:
        print(f"❌ Failed to register: {r.text}")
        return False
    print("✅ Registration successful.")

    # 2. Test fetching substances
    print("\n--- 2. Testing /substances ---")
    r = requests.get(f"{BASE_URL}/substances")
    if r.status_code != 200:
        print(f"❌ Failed to get substances: {r.text}")
        return False
    subs = r.json()
    total = sum(len(v) for v in subs.get("substances", {}).values())
    if total < 40:
        print(f"❌ Substance registry looks empty: {total} substances found.")
        return False
    print(f"✅ Found {total} substances.")

    # 3. Test batch sync with new events
    print("\n--- 3. Testing /sync/batch ---")
    sync_payload = {
        "user_id": USER_ID,
        "events": [
            {"event_type": "water", "value": 250, "time_offset": 0},
            {"event_type": "meal", "value": 400, "time_offset": 60, "meal_type": "high_protein"},
            {"event_type": "substance", "value": 100, "time_offset": 120, "substance_name": "Caffine"},
            {"event_type": "exercise", "value": 0.5, "time_offset": 180, "duration_seconds": 120},
            {"event_type": "environment", "value": 0, "time_offset": 300, "environment_name": "StandardEnvironment"}
        ]
    }
    print("Calling /sync/batch (this will run BioGears and take 10-20s)...")
    t0 = time.time()
    r = requests.post(f"{BASE_URL}/sync/batch", json=sync_payload)
    if r.status_code != 200:
        print(f"❌ Batch sync failed: {r.text}")
        
        # Pull the log to see why
        print("Fetching engine log...")
        log_r = requests.get(f"{BASE_URL}/engine/log/{USER_ID}")
        if log_r.status_code == 200:
            print(log_r.json().get('log', '')[-500:])
        return False
    
    print(f"✅ Batch sync successful in {int(time.time() - t0)}s.")
    print("Keys in response:", list(r.json().keys()))

    # 4. Test What-if prediction
    print("\n--- 4. Testing /predict/whatif ---")
    whatif_payload = {
        "user_id": USER_ID,
        "event": {"event_type": "substance", "value": 50, "time_offset": 0, "substance_name": "Albuterol"},
        "hours": 0.25
    }
    print("Calling /predict/whatif (this runs TWO simulations simultaneously)...")
    t0 = time.time()
    r = requests.post(f"{BASE_URL}/predict/whatif", json=whatif_payload)
    if r.status_code != 200:
        print(f"❌ What-if prediction failed: {r.text}")
        return False
    print(f"✅ What-if successful in {int(time.time() - t0)}s.")

    print("\n🎉 All integration tests passed successfully!")
    return True

if __name__ == "__main__":
    if wait_for_server():
        success = run_tests()
        sys.exit(0 if success else 1)
    else:
        sys.exit(1)

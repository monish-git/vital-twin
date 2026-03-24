import requests
import json
import datetime
import os
import time
from colorama import Fore, Style, init
from tabulate import tabulate

# Initialize Colorama for terminal compatibility
init(autoreset=True)

# --- CONFIGURATION ---
BASE_URL = "http://127.0.0.1:8000"
DB_FILE = "twins_database.json"

# --- PERSISTENCE LAYER ---
def load_db():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_to_db(user_id, reg_time, conditions):
    db = load_db()
    db[user_id] = {
        "reg_time": reg_time.isoformat(),
        "conditions": conditions
    }
    with open(DB_FILE, 'w') as f:
        json.dump(db, f, indent=4)

# --- GLOBAL STATE ---
current_user = None
registration_time = None
active_conditions = []

DRUG_LIBRARY = {
    "1": {"name": "Caffeine", "unit": "mg", "info": "Metabolic Stimulant"},
    "2": {"name": "Nicotine", "unit": "mg", "info": "Vascular Constrictor"},
    "3": {"name": "Fentanyl", "unit": "ug", "info": "Powerful Narcotic (Opioid)"},
    "4": {"name": "Morphine", "unit": "mg", "info": "Analgesic (Pain Relief)"},
    "5": {"name": "Epinephrine", "unit": "mg", "info": "Emergency Cardiac Stimulant"},
    "6": {"name": "Atropine", "unit": "mg", "info": "Anticholinergic (Increase HR)"},
    "7": {"name": "Albuterol", "unit": "mg", "info": "Bronchodilator (Respiratory)"},
    "8": {"name": "Blood_OPositive", "unit": "mL", "info": "Volume Replacement/Transfusion"},
}

# --- UTILS ---
def get_relative_seconds(time_input):
    global registration_time
    if not registration_time: return 0
    try:
        if time_input.lower() == 'now':
            target = datetime.datetime.now()
        else:
            h, m = map(int, time_input.split(':'))
            target = datetime.datetime.now().replace(hour=h, minute=m, second=0, microsecond=0)
        
        delta = target - registration_time
        return max(0, int(delta.total_seconds()))
    except:
        return None

def print_header():
    os.system('cls' if os.name == 'nt' else 'clear')
    print(Fore.CYAN + "═"*70)
    print(Fore.WHITE + Style.BRIGHT + "   🔬 BIOGEARS CLINICAL COMMAND CENTER | FULL CAPABILITY")
    print(Fore.CYAN + "═"*70)
    
    if current_user:
        uptime_sec = (datetime.datetime.now() - registration_time).total_seconds()
        print(f" {Fore.WHITE}Patient ID: {Fore.YELLOW}{current_user.upper()} {Fore.WHITE}| Uptime: {Fore.GREEN}{int(uptime_sec // 60)}m {int(uptime_sec % 60)}s")
        
        cond_str = ", ".join(active_conditions) if active_conditions else "Optimal / Healthy"
        print(f" {Fore.WHITE}Clinical Profile: {Fore.RED}{cond_str}")
    else:
        print(f" {Fore.RED}STATUS: ENGINE OFFLINE - PLEASE LOAD OR REGISTER A PATIENT")
    print(Fore.CYAN + "═"*70 + "\n")

# --- CORE MENU ---
def run_menu():
    global registration_time, current_user, active_conditions
    
    while True:
        print_header()
        menu = [
            ["1", "👤 Register New Twin", "Calibrate engine with stable pathologies"],
            ["2", "📂 Load Database", "Restore existing patient state"],
            ["3", "⚡ Sync Health Events", "Log Meals, Exercise, Water, or Meds"],
            ["4", "📈 Recovery Forecast", "Predict 4-hour physiological drift"],
            ["5", "🛑 Shutdown", "Exit console"]
        ]
        print(tabulate(menu, headers=["#", "Command", "Functionality"], tablefmt="simple"))
        
        choice = input(f"\n{Fore.CYAN}Selection > {Style.RESET_ALL}")

        if choice == '1':
            print(f"\n{Fore.YELLOW}--- BASIC BIOMETRICS ---")
            u_id = input("Patient ID: ")
            age = int(input("Age: "))
            weight = float(input("Weight (kg): "))
            height = float(input("Height (cm): "))
            sex = input("Sex (Male/Female): ").capitalize()
            
            print(f"\n{Fore.YELLOW}--- CLINICAL CALIBRATION ---")
            r_hr = input("Resting HR (bpm) [72]: ")
            s_bp = input("Systolic BP (mmHg) [114]: ")
            d_bp = input("Diastolic BP (mmHg) [73]: ")
            
            resting_hr = float(r_hr) if r_hr else 72.0
            systolic_bp = float(s_bp) if s_bp else 114.0
            diastolic_bp = float(d_bp) if d_bp else 73.5

            print(f"\n{Fore.YELLOW}--- STABLE PATHOLOGY OVERRIDES ---")
            payload = {
                "user_id": u_id, "age": age, "weight": weight, "height": height, "sex": sex,
                "resting_hr": resting_hr, "systolic_bp": systolic_bp, "diastolic_bp": diastolic_bp,
                "has_type1_diabetes": input("Type 1 Diabetes? (y/n): ").lower() == 'y',
                "has_type2_diabetes": input("Type 2 Diabetes? (y/n): ").lower() == 'y',
                "has_anemia": input("Anemic? (y/n): ").lower() == 'y',
                "is_smoker": input("Chronic Smoker (COPD)? (y/n): ").lower() == 'y',
            }

            print(f"\n{Fore.CYAN}🔄 CALIBRATING: Solving physiological steady-state...")
            try:
                res = requests.post(f"{BASE_URL}/register", json=payload, timeout=600)
                if res.status_code == 200:
                    registration_time = datetime.datetime.now()
                    current_user = u_id
                    active_conditions = [k.replace('has_','').replace('is_','').title().replace('_',' ') 
                                       for k, v in payload.items() if v is True and isinstance(v, bool)]
                    save_to_db(u_id, registration_time, active_conditions)
                    print(f"\n{Fore.GREEN}✅ Engine Converged! Professional Twin {u_id} is online.")
                    time.sleep(2)
                else:
                    print(f"\n{Fore.RED}❌ Initialization Failed: {res.text}")
                    time.sleep(4)
            except Exception as e:
                print(f"\n{Fore.RED}❌ Connection Error: {e}")
                time.sleep(2)

        elif choice == '2':
            db = load_db()
            if not db:
                print(f"{Fore.RED}No records found."); time.sleep(1.5); continue
            
            table_data = []
            valid_uids = []
            for uid, info in db.items():
                if isinstance(info, dict):
                    reg_time = info.get('reg_time', 'Unknown')[:16]
                    conds = info.get('conditions', [])
                    cond_str = ", ".join(conds) if isinstance(conds, list) else str(conds)
                    table_data.append([len(table_data) + 1, uid, reg_time, cond_str])
                    valid_uids.append(uid)
            
            if not table_data:
                print(f"{Fore.RED}Database empty."); time.sleep(1.5); continue

            print("\n" + tabulate(table_data, headers=["#", "ID", "Created", "Conditions"], tablefmt="pretty"))
            
            try:
                sel = int(input(f"\n{Fore.CYAN}Load Index # > {Style.RESET_ALL}")) - 1
                if 0 <= sel < len(valid_uids):
                    uid = valid_uids[sel]
                    current_user = uid
                    info = db[uid]
                    registration_time = datetime.datetime.fromisoformat(info["reg_time"])
                    active_conditions = info.get("conditions", [])
                    print(f"{Fore.GREEN}✅ Twin {uid} Loaded."); time.sleep(1)
            except:
                print(f"{Fore.RED}Invalid Selection.")

        elif choice == '3':
            if not current_user:
                print(Fore.RED + "Load a Twin first!"); time.sleep(1); continue
                
            events = []
            print(f"\n{Fore.YELLOW}Entering Health Event Stream (Type 'done' to process)")
            while True:
                etype = input(f"\n{Fore.WHITE}Event (meal/exercise/substance/water/sleep/done): ").lower()
                if etype == 'done': break
                
                t_input = input("Time (HH:MM or 'now'): ")
                seconds = get_relative_seconds(t_input)
                if seconds is None: continue

                val = 0; drug_name = None
                if etype == "meal": 
                    val = float(input("Estimated Calories: "))
                elif etype == "water":
                    val = float(input("Water Intake (mL): "))
                elif etype == "sleep": 
                    val = float(input("Duration (Hours): "))
                elif etype == "exercise": 
                    val = float(input("Intensity (0.1 - 0.9): "))
                elif etype == "substance":
                    drug_table = [[k, v['name'], v['info']] for k, v in DRUG_LIBRARY.items()]
                    print("\n" + tabulate(drug_table, headers=["ID", "Substance", "Mechanism"], tablefmt="simple"))
                    s_idx = input("Drug ID: ")
                    if s_idx in DRUG_LIBRARY:
                        drug_name = DRUG_LIBRARY[s_idx]['name']
                        val = float(input(f"Dose ({DRUG_LIBRARY[s_idx]['unit']}): "))
                    else:
                        print(Fore.RED + "Invalid ID"); continue
                
                events.append({"event_type": etype, "time_offset": seconds, "value": val, "substance_name": drug_name})

            if events:
                print(f"\n{Fore.CYAN}🚀 Syncing Stream...")
                try:
                    res = requests.post(f"{BASE_URL}/sync/batch", json={"user_id": current_user, "events": events}, timeout=300)
                    if res.status_code == 200:
                        print(f"\n{Fore.GREEN}📈 Synchronized! Report: {Fore.YELLOW}{res.json().get('view_report')}")
                        input("\nPress Enter to return...")
                    else:
                        print(f"{Fore.RED}❌ Sync Failed: {res.json().get('detail')}")
                except Exception as e:
                    print(f"{Fore.RED}Error: {e}")

        elif choice == '4':
            if not current_user: continue
            print(f"\n{Fore.CYAN}🔮 Projecting Recovery Path...")
            try:
                res = requests.post(f"{BASE_URL}/predict/recovery", json={"user_id": current_user, "hours": 4}, timeout=300)
                if res.status_code == 200:
                    print(f"{Fore.GREEN}✅ Forecast: {Fore.YELLOW}{res.json().get('forecast_chart')}")
                    input("\nPress Enter to return...")
            except:
                print(Fore.RED + "Connection Timeout.")

        elif choice == '5':
            break

if __name__ == "__main__":
    try:
        run_menu()
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}Console Session Terminated.")
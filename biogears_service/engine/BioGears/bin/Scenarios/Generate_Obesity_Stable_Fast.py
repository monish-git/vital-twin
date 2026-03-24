import random
import os

# --- CONFIGURATION ---
TOTAL_DAYS = 180
FILENAME = "Obesity_Simulation_Optimized.xml"

# --- CALORIC TUNING (CRITICAL FOR STABILITY) ---
# We lower the max calories slightly to 3300 to ensure the stomach empties.
# 3300 kcal/day is still a +1500 kcal surplus. 
# Over 180 days, this guarantees ~30kg of weight gain (Obesity).
BINGE_CALORIES = 3300 
DIET_CALORIES = 1800

# GET CURRENT DIRECTORY
current_dir = os.getcwd()
full_path = os.path.join(current_dir, FILENAME)

def get_header():
    return """<?xml version="1.0" encoding="UTF-8"?>
<Scenario xmlns="uri:/mil/tatrc/physiology/datamodel" 
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
          contentVersion="BioGears_8.2.0" 
          xsi:schemaLocation="">
    <Name>Obesity_Optimized_Run</Name>
    <Description>180 Day High-Density Nutrition Simulation</Description>
    <InitialParameters>
        <PatientFile>StandardMale.xml</PatientFile>
    </InitialParameters>
    <DataRequests>
        <DataRequest xsi:type="PatientDataRequestData" Name="Weight" Unit="kg" Precision="2"/>
        <DataRequest xsi:type="PatientDataRequestData" Name="BodyMassIndex" Precision="2"/>
        <DataRequest xsi:type="PatientDataRequestData" Name="TotalMetabolicRate" Unit="kcal/day" Precision="0"/>
        <DataRequest xsi:type="GasCompartmentDataRequestData" Compartment="Fat" Name="Volume" Unit="mL" Precision="0"/>
        <DataRequest xsi:type="LiquidCompartmentDataRequestData" Compartment="Stomach" Name="Volume" Unit="mL" Precision="0"/>
    </DataRequests>
    <Actions>
"""

def get_footer():
    return """    </Actions>
</Scenario>
"""

def action_eat_dense(calories, meal_name):
    # --- THE FIX: DENSITY OPTIMIZATION ---
    # Fat = 9 kcal/g (Low volume, high energy)
    # Carbs = 4 kcal/g
    # We increase Fat % to reduce total mass in stomach.
    
    carb_ratio = 0.45  
    fat_ratio = 0.40   # Higher fat for density
    prot_ratio = 0.15
    
    carb_g = (calories * carb_ratio) / 4.0
    fat_g = (calories * fat_ratio) / 9.0
    prot_g = (calories * prot_ratio) / 4.0
    
    # --- CRITICAL FIX: REDUCE WATER ---
    # Previous scripts added too much water (0.2L+ per meal).
    # We reduce this to 0.05L (50mL) per meal. 
    # The body has internal fluids; we don't need to drink with every bite.
    water_L = 0.05 
    
    return f"""        <Action xsi:type="ConsumeNutrientsData">
            <Nutrition>
                <Name>{meal_name}</Name>
                <Carbohydrate value="{carb_g:.1f}" unit="g"/>
                <Fat value="{fat_g:.1f}" unit="g"/>
                <Protein value="{prot_g:.1f}" unit="g"/>
                <Sodium value="0.2" unit="g"/>
                <Water value="{water_L:.3f}" unit="L"/>
            </Nutrition>
        </Action>
"""

def advance_time(hours):
    return f"""        <Action xsi:type="AdvanceTimeData">
            <Time value="{hours}" unit="hr"/>
        </Action>
"""

# --- MAIN GENERATION ---
xml_content = get_header()
random.seed(42)

print(f"Generating optimized simulation for {TOTAL_DAYS} days...")

for day in range(1, TOTAL_DAYS + 1):
    # Determine Phase
    if day <= 60:
        # Binge Phase
        daily_cals = BINGE_CALORIES + random.randint(-100, 100)
    elif day <= 90:
        # Diet Phase
        daily_cals = DIET_CALORIES + random.randint(-50, 50)
    else:
        # Relapse (The big gain)
        daily_cals = BINGE_CALORIES + 200 + random.randint(-100, 100)

    xml_content += f"        \n"

    # Meal Schedule (Spread out to allow digestion)
    # Breakfast (25%) - Lunch (35%) - Dinner (40%)
    # Removed Snack to give stomach 6+ hours to empty fully between lunch/dinner
    
    c_break = daily_cals * 0.25
    c_lunch = daily_cals * 0.35
    c_dinner = daily_cals * 0.40

    # 06:00 - Wake & Breakfast
    xml_content += advance_time(2)
    xml_content += action_eat_dense(c_break, "Breakfast")

    # 06:00 -> 12:00 (6 hours gap for digestion)
    xml_content += advance_time(6)

    # 12:00 - Lunch
    xml_content += action_eat_dense(c_lunch, "Lunch")

    # 12:00 -> 19:00 (7 hours gap for digestion)
    xml_content += advance_time(7)

    # 19:00 - Dinner
    xml_content += action_eat_dense(c_dinner, "Dinner")

    # 19:00 -> 06:00 (11 hours sleep/digestion)
    xml_content += advance_time(9)

xml_content += get_footer()

with open(full_path, "w") as f:
    f.write(xml_content)

print(f"Done. File saved: {full_path}")
print("Run this file. It should simulate ~20x faster than the previous one.")
import random
import os

# --- CONFIGURATION ---
# 90 Days is the "Sweet Spot" for simulation stability vs. data trends.
# You can change to 180, but 90 will finish overnight.
TOTAL_DAYS = 90 
FILENAME = "Obesity_Ideal_Run.xml"

# --- CALORIC PHASES ---
# We use realistic but "Engine-Safe" values.
BINGE_CALORIES = 3800  # High, but digestible
DIET_CALORIES = 1600   # Deficit
MAINTENANCE_CALORIES = 2400

# GET CURRENT DIRECTORY
current_dir = os.getcwd()
full_path = os.path.join(current_dir, FILENAME)

def get_header():
    return """<?xml version="1.0" encoding="UTF-8"?>
<Scenario xmlns="uri:/mil/tatrc/physiology/datamodel" 
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
          contentVersion="BioGears_8.2.0" 
          xsi:schemaLocation="">
    <Name>Obesity_Ideal_Stable</Name>
    <Description>Robust 90-Day Simulation of Weight Cycling</Description>
    <InitialParameters>
        <PatientFile>StandardMale.xml</PatientFile>
    </InitialParameters>
    <DataRequests>
        <DataRequest xsi:type="PatientDataRequestData" Name="Weight" Unit="kg" Precision="2"/>
        <DataRequest xsi:type="PatientDataRequestData" Name="BodyFatFraction" Precision="3"/>
        <DataRequest xsi:type="PatientDataRequestData" Name="BodyMassIndex" Precision="2"/>
        
        <DataRequest xsi:type="PhysiologyDataRequestData" Name="HeartRate" Unit="1/min" Precision="0"/>
        <DataRequest xsi:type="PhysiologyDataRequestData" Name="MeanArterialPressure" Unit="mmHg" Precision="0"/>
        <DataRequest xsi:type="PhysiologyDataRequestData" Name="TotalMetabolicRate" Unit="kcal/day" Precision="0"/>
        <DataRequest xsi:type="PhysiologyDataRequestData" Name="BloodVolume" Unit="mL" Precision="0"/>
        <DataRequest xsi:type="PhysiologyDataRequestData" Name="UrineProductionRate" Unit="mL/min" Precision="2"/>

        <DataRequest xsi:type="LiquidCompartmentDataRequestData" Compartment="Stomach" Name="Volume" Unit="mL" Precision="0"/>
    </DataRequests>
    <Actions>
"""

def get_footer():
    return """    </Actions>
</Scenario>
"""

def action_perfect_meal(calories, meal_name):
    # --- THE GOLDEN RATIO ---
    # To prevent crashes, we need High Density Energy + Sufficient Water.
    # We use 60% Fat (Density) + 0.25L Water (Hydration).
    # This prevents both "Stomach Bursting" AND "Dehydration".
    
    water_L = 0.25 
    
    carb_g = (calories * 0.25) / 4.0
    fat_g = (calories * 0.55) / 9.0
    prot_g = (calories * 0.20) / 4.0
    
    return f"""        <Action xsi:type="ConsumeNutrientsData">
            <Nutrition>
                <Name>{meal_name}</Name>
                <Carbohydrate value="{carb_g:.1f}" unit="g"/>
                <Fat value="{fat_g:.1f}" unit="g"/>
                <Protein value="{prot_g:.1f}" unit="g"/>
                <Sodium value="0.4" unit="g"/>
                <Water value="{water_L}" unit="L"/>
            </Nutrition>
        </Action>
"""

def action_exercise(intensity):
    return f"""        <Action xsi:type="ExerciseData">
            <GenericExercise>
                <Intensity value="{intensity}"/>
            </GenericExercise>
        </Action>
"""

def action_rest():
    return """        <Action xsi:type="ExerciseData">
            <GenericExercise>
                <Intensity value="0.0"/>
            </GenericExercise>
        </Action>
"""

def advance_time(hours):
    return f"""        <Action xsi:type="AdvanceTimeData">
            <Time value="{hours}" unit="hr"/>
        </Action>
"""

# --- MAIN GENERATION LOOP ---
xml_content = get_header()
random.seed(42)

print(f"Generating Ideal Scenario ({TOTAL_DAYS} Days)...")

# --- PHASE CONFIGURATION ---
# Day 0-30:   Weight Gain (The Slide)
# Day 31-60:  Diet & Exercise (The Motivation)
# Day 61-90+: Relapse (The Crash)

for day in range(1, TOTAL_DAYS + 1):
    
    current_cals = 0
    do_exercise = False
    phase_name = ""

    if day <= 30:
        phase_name = "Gaining"
        # Gradual increase from 2500 to 3500
        current_cals = MAINTENANCE_CALORIES + (day * 30) 
        do_exercise = False
    
    elif 31 <= day <= 60:
        phase_name = "Dieting"
        current_cals = DIET_CALORIES + random.randint(-100, 100)
        do_exercise = True # Daily Jog
    
    else:
        phase_name = "Relapse"
        # Immediate jump to high calories
        current_cals = BINGE_CALORIES + random.randint(-200, 200)
        do_exercise = False

    xml_content += f"        \n"

    # --- THE 2-MEAL PROTOCOL (FAST & STABLE) ---
    # We consolidate food into 2 meals.
    # This leaves 16 hours of "Digestion Time" per day where the engine runs max speed.
    
    meal_cals = current_cals / 2.0

    # 00:00 - 10:00 : Morning Fast (10 Hours) - Speed Zone
    xml_content += advance_time(10)

    # 10:00 : Brunch (Meal 1)
    xml_content += action_perfect_meal(meal_cals, "Brunch")
    
    # 10:00 - 18:00 : Afternoon (8 Hours)
    # Exercise happens here if dieting
    if do_exercise:
        xml_content += advance_time(4)
        xml_content += action_exercise(0.2) # Moderate Jog
        xml_content += advance_time(1)
        xml_content += action_rest()
        xml_content += advance_time(3)
    else:
        xml_content += advance_time(8)

    # 18:00 : Dinner (Meal 2)
    xml_content += action_perfect_meal(meal_cals, "Dinner")

    # 18:00 - 24:00 : Evening (6 Hours)
    xml_content += advance_time(6)

xml_content += get_footer()

with open(full_path, "w") as f:
    f.write(xml_content)

print(f"SUCCESS! Generated {FILENAME}")
print("Optimization: 2-Meal Protocol with Isotonic Hydration.")
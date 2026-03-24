import random
import os

# --- CONFIGURATION ---
TOTAL_DAYS = 180
FILENAME = "Obesity_YoYo_Run.xml"

# --- CALORIC SETTINGS ---
BINGE_CALORIES = 4500  # Relapse
DIET_CALORIES = 1800   # Diet
MAINTENANCE_CALORIES = 2800 # Start

# GET CURRENT DIRECTORY
current_dir = os.getcwd()
full_path = os.path.join(current_dir, FILENAME)

def get_header():
    return """<?xml version="1.0" encoding="UTF-8"?>
<Scenario xmlns="uri:/mil/tatrc/physiology/datamodel" 
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
          contentVersion="BioGears_8.2.0" 
          xsi:schemaLocation="">
    <Name>Obesity_YoYo_Cycle</Name>
    <Description>180 Days of Weight Gain, Dieting, and Relapse</Description>
    <InitialParameters>
        <PatientFile>StandardMale.xml</PatientFile>
    </InitialParameters>
    <DataRequests>
        <DataRequest xsi:type="PatientDataRequestData" Name="Weight" Unit="kg" Precision="2"/>
        <DataRequest xsi:type="PatientDataRequestData" Name="BodyFatFraction" Precision="3"/>
        
        <DataRequest xsi:type="PhysiologyDataRequestData" Name="HeartRate" Unit="1/min" Precision="0"/>
        <DataRequest xsi:type="PhysiologyDataRequestData" Name="MeanArterialPressure" Unit="mmHg" Precision="0"/>
        <DataRequest xsi:type="PhysiologyDataRequestData" Name="TotalMetabolicRate" Unit="kcal/day" Precision="0"/>
        <DataRequest xsi:type="PhysiologyDataRequestData" Name="CardiacOutput" Unit="L/min" Precision="1"/>

        <DataRequest xsi:type="LiquidCompartmentDataRequestData" Compartment="Stomach" Name="Volume" Unit="mL" Precision="0"/>
    </DataRequests>
    <Actions>
"""

def get_footer():
    return """    </Actions>
</Scenario>
"""

def action_eat_dense(calories, meal_name):
    # --- THE FIX ---
    # 1. XML Order: Name -> Carb -> Fat -> Protein -> Sodium -> Water
    # 2. Water: 0.03L (30mL) to prevents "Infinite Density" crash
    # 3. Density: 85% Fat for speed
    
    water_L = 0.03 
    
    fat_g = (calories * 0.85) / 9.0
    prot_g = (calories * 0.15) / 4.0
    
    return f"""        <Action xsi:type="ConsumeNutrientsData">
            <Nutrition>
                <Name>{meal_name}</Name>
                <Carbohydrate value="0.0" unit="g"/>
                <Fat value="{fat_g:.2f}" unit="g"/>
                <Protein value="{prot_g:.2f}" unit="g"/>
                <Sodium value="0.0" unit="g"/>
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

print(f"Generating 180-Day Yo-Yo Scenario (Corrected DataRequests)...")

for day in range(1, TOTAL_DAYS + 1):
    
    # --- PHASE LOGIC ---
    current_cals = 0
    do_exercise = False
    phase_name = ""

    if day <= 60:
        # Phase 1: The Slide
        phase_name = "Gaining"
        current_cals = MAINTENANCE_CALORIES + (day * 20) + random.randint(-200, 200)
        do_exercise = False
    
    elif 61 <= day <= 90:
        # Phase 2: The Motivation
        phase_name = "Dieting"
        current_cals = DIET_CALORIES + random.randint(-100, 100)
        do_exercise = True 
    
    else:
        # Phase 3: The Relapse
        phase_name = "Relapse"
        current_cals = BINGE_CALORIES + random.randint(0, 500)
        do_exercise = False

    xml_content += f"        \n"

    # --- DAILY SCHEDULE ---
    meal_cals = current_cals / 4.0

    # 06:00 - Breakfast
    xml_content += advance_time(2)
    xml_content += action_eat_dense(meal_cals, "Breakfast")
    
    # 06:00 to 10:00 
    xml_content += advance_time(4)

    # 10:00 - Exercise Block
    if do_exercise:
        xml_content += action_exercise(0.25)
        xml_content += advance_time(1)
        xml_content += action_rest()
        xml_content += advance_time(1)
    else:
        xml_content += advance_time(2)

    # 12:00 - Lunch
    xml_content += action_eat_dense(meal_cals, "Lunch")

    # 12:00 to 18:00
    xml_content += advance_time(6)

    # 18:00 - Dinner
    xml_content += action_eat_dense(meal_cals, "Dinner")

    # 18:00 to 23:00
    xml_content += advance_time(5)
    xml_content += action_eat_dense(meal_cals, "LateSnack")

    # 23:00 to 06:00
    xml_content += advance_time(4)

xml_content += get_footer()

with open(full_path, "w") as f:
    f.write(xml_content)

print(f"SUCCESS! Generated {FILENAME}")
print("Run this file. The 'Unknown Data Request' errors are fixed.")
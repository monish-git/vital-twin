// app/data/symptomData.ts

export type SymptomOption = {
  id: string;
  label: string;
  description?: string;
  severity?: 'mild' | 'moderate' | 'severe';
};

export type SymptomQuestion = {
  id: string;
  text: string;
  type: 'yesno' | 'scale' | 'multiple';
  options?: string[];
  followUp?: string;
};

export type SymptomAnalysis = {
  severity: 'mild' | 'moderate' | 'severe' | 'emergency';
  recommendation: string;
  actions: string[];
  seeDoctor: boolean;
  homeRemedies: string[];
  warningSigns: string[];
};

export type SymptomCategory = {
  id: string;
  label: string;
  icon: string;
  color: string;
  options: SymptomOption[];
  questions: SymptomQuestion[];
  analyze: (answers: Record<string, any>) => SymptomAnalysis;
};

export const symptomDB: Record<string, SymptomCategory> = {
  headache: {
    id: 'headache',
    label: "HEADACHE",
    icon: "🧠",
    color: "#ef476f",
    options: [
      { id: 'throbbing', label: "Throbbing/Pulsating", description: "Pain that comes and goes with heartbeat", severity: 'moderate' },
      { id: 'behind_eyes', label: "Behind Eyes", description: "Pressure or pain localized behind one or both eyes", severity: 'moderate' },
      { id: 'tension', label: "Tension Band", description: "Tight feeling around forehead or back of head", severity: 'mild' },
      { id: 'sharp', label: "Sharp/Stabbing", description: "Sudden, intense pain", severity: 'severe' },
      { id: 'one_sided', label: "One-Sided", description: "Pain localized to one side of head", severity: 'moderate' },
      { id: 'neck_pain', label: "Neck Pain", description: "Pain radiating from neck to head", severity: 'moderate' },
    ],
    questions: [
      { 
        id: 'duration', 
        text: "How long have you had this headache?", 
        type: 'multiple',
        options: ['Less than 4 hours', '4-24 hours', '1-3 days', 'More than 3 days']
      },
      { 
        id: 'frequency', 
        text: "How often do you get headaches?", 
        type: 'multiple',
        options: ['First time', 'Occasionally (1-2 per month)', 'Frequently (weekly)', 'Daily']
      },
      { 
        id: 'nausea', 
        text: "Do you feel nauseous or have you vomited?", 
        type: 'yesno' 
      },
      { 
        id: 'light_sensitivity', 
        text: "Are you sensitive to light or sound?", 
        type: 'yesno' 
      },
      { 
        id: 'aura', 
        text: "Did you experience any visual disturbances before the headache (flashing lights, blind spots)?", 
        type: 'yesno' 
      },
      { 
        id: 'medication', 
        text: "Have you taken any pain medication?", 
        type: 'yesno',
        followUp: "What did you take and did it help?"
      },
      { 
        id: 'triggers', 
        text: "What triggers your headache?", 
        type: 'multiple',
        options: ['Stress', 'Lack of sleep', 'Hunger', 'Weather changes', 'Screen time', 'Caffeine', 'Alcohol', 'Unknown']
      },
      { 
        id: 'pain_level', 
        text: "On a scale of 1-10, how would you rate your pain?", 
        type: 'scale' 
      },
    ],
    analyze: (answers) => {
      const severe = answers.pain_level > 7 || answers.nausea === true || answers.aura === true;
      const emergency = answers.neck_pain && answers.fever || answers.sudden === 'worst_of_life';
      
      if (emergency) {
        return {
          severity: 'emergency',
          recommendation: "⚠️ SEEK IMMEDIATE MEDICAL ATTENTION",
          actions: [
            "Go to emergency room immediately",
            "Do not drive yourself",
            "Tell doctor about sudden severe headache"
          ],
          seeDoctor: true,
          homeRemedies: [],
          warningSigns: [
            "Sudden, severe headache (worst of your life)",
            "Headache with fever and stiff neck",
            "Headache after head injury"
          ]
        };
      }
      
      if (severe) {
        return {
          severity: 'severe',
          recommendation: "You're experiencing a severe headache. Please consult a doctor.",
          actions: [
            "Take prescribed pain medication",
            "Rest in a dark, quiet room",
            "Apply cold compress to forehead",
            "Stay hydrated"
          ],
          seeDoctor: true,
          homeRemedies: [
            "Cold compress on forehead",
            "Caffeine (small amount)",
            "Gentle neck stretches",
            "Peppermint oil on temples"
          ],
          warningSigns: [
            "Headache with confusion",
            "Difficulty speaking",
            "Weakness on one side",
            "Fever over 102°F"
          ]
        };
      }
      
      return {
        severity: 'mild',
        recommendation: "This appears to be a tension headache. Try these remedies:",
        actions: [
          "Rest in a quiet environment",
          "Stay hydrated",
          "Use over-the-counter pain relief if needed",
          "Practice relaxation techniques"
        ],
        seeDoctor: false,
        homeRemedies: [
          "Warm compress on neck",
          "Gentle massage of temples",
          "Deep breathing exercises",
          "Avoid screen time"
        ],
        warningSigns: [
          "If pain becomes severe",
          "If accompanied by fever",
          "If vision changes occur"
        ]
      };
    },
  },

  heart: {
    id: 'heart',
    label: "HEART / CHEST",
    icon: "❤️",
    color: "#ff6b6b",
    options: [
      { id: 'tightness', label: "Chest Tightness", description: "Squeezing or pressure in chest", severity: 'severe' },
      { id: 'burning', label: "Burning Sensation", description: "Heat or burning in chest", severity: 'moderate' },
      { id: 'sharp_pain', label: "Sharp Pain", description: "Stabbing chest pain", severity: 'severe' },
      { id: 'palpitations', label: "Heart Palpitations", description: "Racing or fluttering heart", severity: 'moderate' },
    ],
    questions: [
      { 
        id: 'radiation', 
        text: "Does the pain spread to your arm, jaw, or back?", 
        type: 'yesno' 
      },
      { 
        id: 'breathlessness', 
        text: "Do you feel short of breath?", 
        type: 'yesno' 
      },
      { 
        id: 'sweating', 
        text: "Are you experiencing cold sweats?", 
        type: 'yesno' 
      },
      { 
        id: 'dizziness', 
        text: "Do you feel dizzy or lightheaded?", 
        type: 'yesno' 
      },
      { 
        id: 'onset', 
        text: "When did this start?", 
        type: 'multiple',
        options: ['Sudden (minutes)', 'Gradual (hours)', 'Ongoing (days)']
      },
      { 
        id: 'activity', 
        text: "Did this start during physical activity or rest?", 
        type: 'multiple',
        options: ['During exercise', 'At rest', 'During sleep', 'After stress']
      },
    ],
    analyze: (answers) => {
      const emergency = answers.radiation === true || answers.breathlessness === true || answers.sweating === true;
      
      if (emergency) {
        return {
          severity: 'emergency',
          recommendation: "⚠️ EMERGENCY: Possible heart attack symptoms",
          actions: [
            "Call emergency services immediately",
            "Chew aspirin if available (unless allergic)",
            "Sit down and rest",
            "Unlock door for paramedics"
          ],
          seeDoctor: true,
          homeRemedies: [],
          warningSigns: [
            "Chest pain spreading to arm/jaw",
            "Shortness of breath",
            "Cold sweats",
            "Nausea or lightheadedness"
          ]
        };
      }
      
      return {
        severity: 'moderate',
        recommendation: "Schedule a doctor's appointment soon",
        actions: [
          "Rest and avoid strenuous activity",
          "Monitor symptoms",
          "Keep a diary of episodes",
          "Avoid caffeine and stress"
        ],
        seeDoctor: true,
        homeRemedies: [
          "Deep breathing exercises",
          "Stress reduction techniques",
          "Light walking if comfortable"
        ],
        warningSigns: [
          "Worsening chest pain",
          "Difficulty breathing",
          "Fainting"
        ]
      };
    },
  },

  breathing: {
    id: 'breathing',
    label: "BREATHING",
    icon: "🫁",
    color: "#4ecdc4",
    options: [
      { id: 'shortness', label: "Shortness of Breath", description: "Difficulty catching breath", severity: 'severe' },
      { id: 'wheezing', label: "Wheezing", description: "Whistling sound when breathing", severity: 'moderate' },
      { id: 'cough', label: "Persistent Cough", description: "Frequent coughing", severity: 'mild' },
      { id: 'chest_tightness', label: "Chest Tightness", description: "Feeling of chest constriction", severity: 'moderate' },
    ],
    questions: [
      { 
        id: 'onset', 
        text: "Did this start suddenly or gradually?", 
        type: 'multiple',
        options: ['Sudden', 'Gradual', 'After activity', 'At rest']
      },
      { 
        id: 'triggers', 
        text: "What triggers your breathing difficulty?", 
        type: 'multiple',
        options: ['Exercise', 'Allergies', 'Cold air', 'Stress', 'Lying down', 'Unknown']
      },
      { 
        id: 'relief', 
        text: "What helps you breathe better?", 
        type: 'multiple',
        options: ['Sitting up', 'Medication', 'Fresh air', 'Nothing']
      },
      { 
        id: 'color', 
        text: "Have your lips or fingernails turned blue?", 
        type: 'yesno' 
      },
      { 
        id: 'speak', 
        text: "Can you speak in full sentences?", 
        type: 'yesno' 
      },
    ],
    analyze: (answers) => {
      if (answers.color === true || answers.speak === false) {
        return {
          severity: 'emergency',
          recommendation: "⚠️ SEEK EMERGENCY CARE IMMEDIATELY",
          actions: [
            "Call emergency services",
            "Sit upright",
            "Use rescue inhaler if available",
            "Stay calm"
          ],
          seeDoctor: true,
          homeRemedies: [],
          warningSigns: [
            "Blue lips or fingernails",
            "Cannot speak",
            "Chest retractions",
            "Confusion"
          ]
        };
      }
      
      return {
        severity: 'moderate',
        recommendation: "You should see a doctor for proper evaluation",
        actions: [
          "Use prescribed inhalers",
          "Avoid triggers",
          "Practice pursed-lip breathing",
          "Keep a symptom diary"
        ],
        seeDoctor: true,
        homeRemedies: [
          "Breathing exercises",
          "Steam inhalation",
          "Humidifier use",
          "Avoid smoke and allergens"
        ],
        warningSigns: [
          "Worsening shortness of breath",
          "Chest pain",
          "Fever with cough"
        ]
      };
    },
  },

  stomach: {
    id: 'stomach',
    label: "STOMACH",
    icon: "🍱",
    color: "#f9ca24",
    options: [
      { id: 'cramping', label: "Abdominal Cramping", description: "Painful muscle contractions", severity: 'moderate' },
      { id: 'bloating', label: "Bloating", description: "Swollen or full abdomen", severity: 'mild' },
      { id: 'nausea', label: "Nausea", description: "Feeling of vomiting", severity: 'moderate' },
      { id: 'burning', label: "Burning Pain", description: "Acid-like burning sensation", severity: 'moderate' },
    ],
    questions: [
      { 
        id: 'location', 
        text: "Where is the pain located?", 
        type: 'multiple',
        options: ['Upper abdomen', 'Lower abdomen', 'Right side', 'Left side', 'All over']
      },
      { 
        id: 'food_relation', 
        text: "When does the pain occur relative to eating?", 
        type: 'multiple',
        options: ['Before eating', 'During eating', 'Right after', 'Hours after', 'No relation']
      },
      { 
        id: 'vomiting', 
        text: "Have you vomited?", 
        type: 'yesno' 
      },
      { 
        id: 'diarrhea', 
        text: "Do you have diarrhea?", 
        type: 'yesno' 
      },
      { 
        id: 'fever', 
        text: "Do you have a fever?", 
        type: 'yesno' 
      },
      { 
        id: 'blood', 
        text: "Have you noticed blood in vomit or stool?", 
        type: 'yesno' 
      },
    ],
    analyze: (answers) => {
      if (answers.blood === true || (answers.fever === true && answers.vomiting === true)) {
        return {
          severity: 'emergency',
          recommendation: "⚠️ SEEK IMMEDIATE MEDICAL ATTENTION",
          actions: [
            "Go to emergency room",
            "Stop eating and drinking",
            "Bring sample if possible",
            "Note when symptoms started"
          ],
          seeDoctor: true,
          homeRemedies: [],
          warningSigns: [
            "Blood in vomit or stool",
            "Severe abdominal pain",
            "High fever",
            "Unable to keep fluids down"
          ]
        };
      }
      
      return {
        severity: 'moderate',
        recommendation: "Monitor your symptoms and try these remedies:",
        actions: [
          "Stay hydrated with clear fluids",
          "Eat bland foods (BRAT diet)",
          "Rest your stomach",
          "Avoid dairy and spicy foods"
        ],
        seeDoctor: answers.vomiting === true || answers.fever === true,
        homeRemedies: [
          "Ginger tea for nausea",
          "Peppermint for bloating",
          "Heating pad for cramps",
          "Small, frequent meals"
        ],
        warningSigns: [
          "Severe pain",
          "Blood in stool",
          "Signs of dehydration",
          "Pain lasting >3 days"
        ]
      };
    },
  },

  ent: {
    id: 'ent',
    label: "EAR / NOSE / THROAT",
    icon: "👂",
    color: "#a55eea",
    options: [
      { id: 'sore_throat', label: "Sore Throat", description: "Pain or scratchiness in throat", severity: 'mild' },
      { id: 'ear_pain', label: "Ear Pain", description: "Pain in one or both ears", severity: 'moderate' },
      { id: 'congestion', label: "Nasal Congestion", description: "Blocked or stuffy nose", severity: 'mild' },
      { id: 'sinus', label: "Sinus Pressure", description: "Pressure around eyes and nose", severity: 'moderate' },
    ],
    questions: [
      { 
        id: 'duration', 
        text: "How long have you had these symptoms?", 
        type: 'multiple',
        options: ['1-2 days', '3-5 days', '1 week', 'More than a week']
      },
      { 
        id: 'swallowing', 
        text: "Is it painful to swallow?", 
        type: 'yesno' 
      },
      { 
        id: 'fever', 
        text: "Do you have a fever?", 
        type: 'yesno' 
      },
      { 
        id: 'discharge', 
        text: "Any discharge from ear or nose?", 
        type: 'multiple',
        options: ['Clear', 'Yellow/Green', 'Bloody', 'None']
      },
      { 
        id: 'hearing', 
        text: "Has your hearing been affected?", 
        type: 'yesno' 
      },
    ],
    analyze: (answers) => {
      if (answers.discharge === 'Bloody' || (answers.fever === true && answers.duration === 'More than a week')) {
        return {
          severity: 'severe',
          recommendation: "You should see a doctor within 24 hours",
          actions: [
            "Schedule doctor appointment",
            "Take temperature regularly",
            "Rest and hydrate",
            "Avoid irritants"
          ],
          seeDoctor: true,
          homeRemedies: [
            "Salt water gargle",
            "Warm compress for ears",
            "Steam inhalation",
            "Honey and lemon tea"
          ],
          warningSigns: [
            "Difficulty breathing",
            "Unable to swallow",
            "High fever",
            "Severe pain"
          ]
        };
      }
      
      return {
        severity: 'mild',
        recommendation: "This appears to be a common cold or mild infection",
        actions: [
          "Rest and hydrate",
          "Use over-the-counter remedies",
          "Monitor symptoms",
          "Avoid spreading to others"
        ],
        seeDoctor: false,
        homeRemedies: [
          "Warm salt water gargle",
          "Honey for cough",
          "Steam for congestion",
          "Chicken soup"
        ],
        warningSigns: [
          "Symptoms worsen after 5 days",
          "Difficulty breathing",
          "High fever",
          "Severe pain"
        ]
      };
    },
  },

  vision: {
    id: 'vision',
    label: "VISION / EYES",
    icon: "👁️",
    color: "#20bf6b",
    options: [
      { id: 'blurred', label: "Blurred Vision", description: "Difficulty focusing", severity: 'moderate' },
      { id: 'redness', label: "Red Eyes", description: "Bloodshot or irritated eyes", severity: 'mild' },
      { id: 'pain', label: "Eye Pain", description: "Pain in or around eye", severity: 'severe' },
      { id: 'floaters', label: "Floaters/Flashing", description: "Spots or flashes of light", severity: 'severe' },
    ],
    questions: [
      { 
        id: 'onset', 
        text: "When did this start?", 
        type: 'multiple',
        options: ['Suddenly', 'Gradually', 'After injury', 'After screen time']
      },
      { 
        id: 'one_or_both', 
        text: "Is it in one eye or both?", 
        type: 'multiple',
        options: ['One eye', 'Both eyes']
      },
      { 
        id: 'pain', 
        text: "Is there any pain?", 
        type: 'yesno' 
      },
      { 
        id: 'light_sensitivity', 
        text: "Are you sensitive to light?", 
        type: 'yesno' 
      },
      { 
        id: 'discharge', 
        text: "Any discharge from eyes?", 
        type: 'multiple',
        options: ['Watery', 'Thick/yellow', 'None']
      },
    ],
    analyze: (answers) => {
      if (answers.floaters === true || answers.onset === 'Suddenly' || answers.pain === true) {
        return {
          severity: 'emergency',
          recommendation: "⚠️ SEEK IMMEDIATE EYE CARE",
          actions: [
            "Go to emergency room or eye doctor immediately",
            "Do not rub eyes",
            "Avoid bright lights",
            "Do not drive"
          ],
          seeDoctor: true,
          homeRemedies: [],
          warningSigns: [
            "Sudden vision loss",
            "Flashes or floaters",
            "Eye pain with nausea",
            "Curtain-like shadow"
          ]
        };
      }
      
      return {
        severity: 'mild',
        recommendation: "This appears to be eye strain or minor irritation",
        actions: [
          "Rest your eyes",
          "Reduce screen time",
          "Use artificial tears",
          "Apply warm compress"
        ],
        seeDoctor: false,
        homeRemedies: [
          "20-20-20 rule (every 20 min, look 20 feet for 20 sec)",
          "Cold cucumber slices",
          "Eye exercises",
          "Proper lighting"
        ],
        warningSigns: [
          "Worsening vision",
          "Severe pain",
          "Light sensitivity",
          "Discharge"
        ]
      };
    },
  },

  dental: {
    id: 'dental',
    label: "DENTAL / ORAL",
    icon: "🦷",
    color: "#d4a5a5",
    options: [
      { id: 'tooth_pain', label: "Tooth Pain", description: "Aching or sharp tooth pain", severity: 'moderate' },
      { id: 'gum_swelling', label: "Gum Swelling", description: "Swollen or bleeding gums", severity: 'moderate' },
      { id: 'sensitivity', label: "Temperature Sensitivity", description: "Pain with hot/cold", severity: 'mild' },
      { id: 'jaw_pain', label: "Jaw Pain", description: "Pain in jaw joint", severity: 'moderate' },
    ],
    questions: [
      { 
        id: 'location', 
        text: "Which area is affected?", 
        type: 'multiple',
        options: ['Upper teeth', 'Lower teeth', 'Front teeth', 'Back teeth', 'Gums', 'Jaw']
      },
      { 
        id: 'pain_type', 
        text: "What type of pain?", 
        type: 'multiple',
        options: ['Sharp', 'Throbbing', 'Constant ache', 'Only when chewing']
      },
      { 
        id: 'swelling', 
        text: "Is there visible swelling?", 
        type: 'yesno' 
      },
      { 
        id: 'fever', 
        text: "Do you have a fever?", 
        type: 'yesno' 
      },
      { 
        id: 'bleeding', 
        text: "Are your gums bleeding?", 
        type: 'yesno' 
      },
    ],
    analyze: (answers) => {
      if (answers.swelling === true && answers.fever === true) {
        return {
          severity: 'emergency',
          recommendation: "⚠️ POSSIBLE DENTAL ABSCESS - SEEK CARE NOW",
          actions: [
            "See dentist immediately",
            "Go to emergency if dentist unavailable",
            "Rinse with warm salt water",
            "Take over-the-counter pain relief"
          ],
          seeDoctor: true,
          homeRemedies: [],
          warningSigns: [
            "Facial swelling",
            "Difficulty breathing/swallowing",
            "Fever",
            "Pus from gums"
          ]
        };
      }
      
      return {
        severity: 'moderate',
        recommendation: "Schedule a dental appointment soon",
        actions: [
            "Call dentist for appointment",
          "Maintain oral hygiene",
          "Avoid hot/cold if sensitive",
          "Use soft toothbrush"
        ],
        seeDoctor: true,
        homeRemedies: [
          "Salt water rinse",
          "Cold compress for swelling",
          "Clove oil for pain",
          "Avoid chewing on affected side"
        ],
        warningSigns: [
          "Increasing pain",
          "Facial swelling",
          "Fever",
          "Difficulty opening mouth"
        ]
      };
    },
  },

  sleep: {
    id: 'sleep',
    label: "SLEEP / ENERGY",
    icon: "😴",
    color: "#4834d4",
    options: [
      { id: 'insomnia', label: "Insomnia", description: "Difficulty falling/staying asleep", severity: 'moderate' },
      { id: 'fatigue', label: "Daytime Fatigue", description: "Excessive tiredness during day", severity: 'moderate' },
      { id: 'snoring', label: "Loud Snoring", description: "Frequent loud snoring", severity: 'mild' },
      { id: 'apnea', label: "Breathing Pauses", description: "Stop breathing during sleep", severity: 'severe' },
    ],
    questions: [
      { 
        id: 'hours', 
        text: "How many hours do you sleep on average?", 
        type: 'multiple',
        options: ['Less than 4', '4-6', '6-8', 'More than 8']
      },
      { 
        id: 'quality', 
        text: "How would you rate your sleep quality?", 
        type: 'multiple',
        options: ['Poor', 'Fair', 'Good', 'Excellent']
      },
      { 
        id: 'waking', 
        text: "Do you wake up feeling refreshed?", 
        type: 'yesno' 
      },
      { 
        id: 'daytime_sleep', 
        text: "Do you feel sleepy during the day?", 
        type: 'yesno' 
      },
      { 
        id: 'apnea_witnessed', 
        text: "Has anyone witnessed you stop breathing during sleep?", 
        type: 'yesno' 
      },
      { 
        id: 'caffeine', 
        text: "Do you consume caffeine?", 
        type: 'multiple',
        options: ['None', 'Morning only', 'Afternoon', 'Evening']
      },
    ],
    analyze: (answers) => {
      if (answers.apnea_witnessed === true) {
        return {
          severity: 'severe',
          recommendation: "You may have sleep apnea - see a sleep specialist",
          actions: [
            "Consult sleep specialist",
            "Consider sleep study",
            "Avoid sleeping on back",
            "Maintain healthy weight"
          ],
          seeDoctor: true,
          homeRemedies: [
            "Side sleeping position",
            "Avoid alcohol before bed",
            "Elevate head of bed",
            "Use nasal strips"
          ],
          warningSigns: [
            "Witnessed breathing pauses",
            "Gasping/choking at night",
            "Excessive daytime sleepiness",
            "Morning headaches"
          ]
        };
      }
      
      return {
        severity: 'mild',
        recommendation: "Improve your sleep hygiene with these tips:",
        actions: [
          "Maintain consistent sleep schedule",
          "Create relaxing bedtime routine",
          "Limit screen time before bed",
          "Avoid caffeine after 2 PM"
        ],
        seeDoctor: false,
        homeRemedies: [
          "Melatonin supplements",
          "White noise machine",
          "Dark, cool room",
          "Herbal tea before bed"
        ],
        warningSigns: [
          "Persistent insomnia",
          "Daytime hallucinations",
          "Falling asleep while driving",
          "Mood changes"
        ]
      };
    },
  },

  urinary: {
    id: 'urinary',
    label: "URINARY",
    icon: "💧",
    color: "#3498db",
    options: [
      { id: 'frequency', label: "Frequent Urination", description: "Urinating more often than usual", severity: 'moderate' },
      { id: 'burning', label: "Burning Sensation", description: "Pain or burning during urination", severity: 'moderate' },
      { id: 'urgency', label: "Urgent Need", description: "Sudden strong urge to urinate", severity: 'moderate' },
      { id: 'blood', label: "Blood in Urine", description: "Pink, red, or cola-colored urine", severity: 'severe' },
    ],
    questions: [
      { 
        id: 'frequency_count', 
        text: "How many times do you urinate in 24 hours?", 
        type: 'multiple',
        options: ['4-6 times', '7-9 times', '10-12 times', 'More than 12']
      },
      { 
        id: 'night_waking', 
        text: "Do you wake up at night to urinate?", 
        type: 'multiple',
        options: ['Never', '1-2 times', '3-4 times', 'More than 4']
      },
      { 
        id: 'pain', 
        text: "Is there pain or burning?", 
        type: 'yesno' 
      },
      { 
        id: 'blood', 
        text: "Have you noticed blood in urine?", 
        type: 'yesno' 
      },
      { 
        id: 'fever', 
        text: "Do you have a fever or chills?", 
        type: 'yesno' 
      },
      { 
        id: 'back_pain', 
        text: "Do you have pain in your back or side?", 
        type: 'yesno' 
      },
    ],
    analyze: (answers) => {
      if (answers.blood === true || (answers.fever === true && answers.back_pain === true)) {
        return {
          severity: 'emergency',
          recommendation: "⚠️ SEEK IMMEDIATE MEDICAL ATTENTION",
          actions: [
            "Go to emergency room or urgent care",
            "Bring urine sample if possible",
            "Drink water if no vomiting",
            "Note when symptoms started"
          ],
          seeDoctor: true,
          homeRemedies: [],
          warningSigns: [
            "Blood in urine",
            "Fever with back pain",
            "Inability to urinate",
            "Severe abdominal pain"
          ]
        };
      }
      
      return {
        severity: 'moderate',
        recommendation: "You may have a UTI. See a doctor within 24-48 hours",
        actions: [
          "Schedule doctor appointment",
          "Drink plenty of water",
          "Avoid caffeine and alcohol",
          "Urinate frequently"
        ],
        seeDoctor: true,
        homeRemedies: [
          "Cranberry juice (unsweetened)",
          "Heating pad for comfort",
          "Vitamin C",
          "Probiotics"
        ],
        warningSigns: [
          "Worsening symptoms",
          "Blood in urine",
          "Fever",
          "Back pain"
        ]
      };
    },
  },

  muscle: {
    id: 'muscle',
    label: "MUSCLE / JOINT",
    icon: "🦴",
    color: "#f0932b",
    options: [
      { id: 'joint_pain', label: "Joint Pain", description: "Pain in one or more joints", severity: 'moderate' },
      { id: 'muscle_ache', label: "Muscle Aches", description: "General muscle soreness", severity: 'mild' },
      { id: 'stiffness', label: "Stiffness", description: "Difficulty moving joints", severity: 'mild' },
      { id: 'swelling', label: "Joint Swelling", description: "Visible swelling in joints", severity: 'severe' },
    ],
    questions: [
      { 
        id: 'location', 
        text: "Which joints/muscles are affected?", 
        type: 'multiple',
        options: ['Knees', 'Hips', 'Shoulders', 'Back', 'Neck', 'Hands', 'Feet', 'Multiple']
      },
      { 
        id: 'timing', 
        text: "When is the pain worst?", 
        type: 'multiple',
        options: ['Morning', 'After activity', 'At night', 'Constant']
      },
      { 
        id: 'swelling', 
        text: "Is there swelling or redness?", 
        type: 'yesno' 
      },
      { 
        id: 'injury', 
        text: "Did this start after an injury?", 
        type: 'yesno' 
      },
      { 
        id: 'fever', 
        text: "Do you have a fever?", 
        type: 'yesno' 
      },
    ],
    analyze: (answers) => {
      if (answers.swelling === true && answers.fever === true) {
        return {
          severity: 'emergency',
          recommendation: "⚠️ POSSIBLE SEPTIC ARTHRITIS - SEEK CARE NOW",
          actions: [
            "Go to emergency room",
            "Do not delay treatment",
            "Avoid putting weight on joint",
            "Apply cold compress"
          ],
          seeDoctor: true,
          homeRemedies: [],
          warningSigns: [
            "Hot, red, swollen joint",
            "Fever",
            "Inability to move joint",
            "Severe pain"
          ]
        };
      }
      
      return {
        severity: 'mild',
        recommendation: "This appears to be muscle strain or minor arthritis",
        actions: [
          "Rest the affected area",
          "Apply ice for first 48 hours",
          "Then heat for comfort",
          "Gentle stretching"
        ],
        seeDoctor: answers.swelling === true,
        homeRemedies: [
          "Epsom salt bath",
          "Turmeric milk",
          "Gentle massage",
          "Anti-inflammatory foods"
        ],
        warningSigns: [
          "Severe pain",
          "Joint deformity",
          "Numbness/tingling",
          "Fever"
        ]
      };
    },
  },

  skin: {
    id: 'skin',
    label: "SKIN / DERMA",
    icon: "🧴",
    color: "#eb4d4b",
    options: [
      { id: 'rash', label: "Rash", description: "Red, irritated skin area", severity: 'mild' },
      { id: 'itching', label: "Itching", description: "Persistent itchiness", severity: 'mild' },
      { id: 'dryness', label: "Dry Skin", description: "Flaky, peeling skin", severity: 'mild' },
      { id: 'hives', label: "Hives", description: "Raised, itchy welts", severity: 'moderate' },
    ],
    questions: [
      { 
        id: 'appearance', 
        text: "What does it look like?", 
        type: 'multiple',
        options: ['Red patches', 'Bumps', 'Blisters', 'Scales', 'Cracks']
      },
      { 
        id: 'location', 
        text: "Where on your body?", 
        type: 'multiple',
        options: ['Face', 'Arms', 'Legs', 'Torso', 'Hands', 'Feet', 'Widespread']
      },
      { 
        id: 'itch', 
        text: "Does it itch?", 
        type: 'yesno' 
      },
      { 
        id: 'spreading', 
        text: "Is it spreading?", 
        type: 'yesno' 
      },
      { 
        id: 'triggers', 
        text: "What triggers it?", 
        type: 'multiple',
        options: ['Food', 'Medication', 'Stress', 'Weather', 'Products', 'Unknown']
      },
    ],
    analyze: (answers) => {
      if (answers.hives === true && answers.breathing_difficulty === true) {
        return {
          severity: 'emergency',
          recommendation: "⚠️ POSSIBLE ALLERGIC REACTION - SEEK EMERGENCY CARE",
          actions: [
            "Call emergency services",
            "Use epinephrine if available",
            "Sit upright",
            "Loosen tight clothing"
          ],
          seeDoctor: true,
          homeRemedies: [],
          warningSigns: [
            "Difficulty breathing",
            "Swelling of face/lips",
            "Dizziness",
            "Confusion"
          ]
        };
      }
      
      return {
        severity: 'mild',
        recommendation: "Try these remedies for your skin condition:",
        actions: [
          "Avoid scratching",
          "Use gentle, fragrance-free products",
          "Keep skin moisturized",
          "Identify and avoid triggers"
        ],
        seeDoctor: answers.spreading === true,
        homeRemedies: [
          "Oatmeal baths",
          "Coconut oil",
          "Aloe vera",
          "Cold compresses"
        ],
        warningSigns: [
          "Signs of infection (pus, warmth)",
          "Spreading rapidly",
          "Fever",
          "Blisters"
        ]
      };
    },
  },
};

export const getSymptomById = (id: string): SymptomCategory | undefined => {
  return symptomDB[id];
};

export const getAllSymptoms = (): SymptomCategory[] => {
  return Object.values(symptomDB);
};
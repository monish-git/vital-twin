import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore"; // ✅ STEP 1: ADD IMPORTS
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../services/firebase"; // ✅ STEP 1: ADD IMPORTS

import { useTheme } from "../../context/ThemeContext";

const COMMON_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Asthma",
  "Heart Disease",
  "Thyroid",
  "Arthritis",
  "Migraine",
  "PCOD",
];

const COMMON_FAMILY = [
  "Heart Disease",
  "Diabetes",
  "Cancer",
  "Stroke",
  "Hypertension",
  "Mental Health",
  "Kidney Disease",
];

const COMMON_MEDICATIONS = [
  "Aspirin",
  "Metformin",
  "Amlodipine", 
  "Atorvastatin",
  "Levothyroxine",
  "Paracetamol",
  "Ibuprofen",
  "Losartan",
];


export default function History() {

  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();

  const colors = theme === "light"
    ? {
        background: "#f8fafc",
        card: "#ffffff",
        text: "#020617",
        subText: "#475569",
        border: "#e2e8f0",
        inputBg: "#ffffff",
        inputBorder: "#cbd5e1",
        inputFocusedBorder: "#3b82f6",
        inputText: "#0f172a",
        inputPlaceholder: "#94a3b8",
        labelText: "#334155",
        iconBadgeBg: "#e2e8f0",
        titleText: "#0f172a",
        subtitleText: "#475569",
        progressTrackBg: "#cbd5e1",
        progressFillBg: "#2563eb",
        progressText: "#64748b",
        orb1: "#3b82f6",
        orb2: "#60a5fa",
        orb3: "#1d4ed8",
        nextBtnBg: "#2563eb",
        nextBtnText: "#ffffff",
        chipBg: "#ffffff",
        chipBorder: "#cbd5e1",
        chipText: "#334155",
        chipActiveBg: "#2563eb",
        chipActiveBorder: "#2563eb",
        chipActiveText: "#ffffff",
        sectionCardBg: "#ffffff",
        sectionCardBorder: "#e2e8f0",
        sectionTitle: "#334155",
        backButtonBg: "#ffffff",
        backButtonBorder: "#cbd5e1",
        backButtonText: "#334155",
        safeAreaBg: "#f8fafc",
      }
    : {
        background: "#040a14",
        card: "#0d1f38",
        text: "#f0f8ff",
        subText: "#93c5fd",
        border: "#1e3a5f",
        inputBg: "#0d1f38",
        inputBorder: "#1e3a5f",
        inputFocusedBorder: "#3b82f6",
        inputText: "#f0f8ff",
        inputPlaceholder: "#4a7fa8",
        labelText: "#93c5fd",
        iconBadgeBg: "#0d1f38",
        titleText: "#f0f8ff",
        subtitleText: "#60a5fa",
        progressTrackBg: "#1e3a5f",
        progressFillBg: "#3b82f6",
        progressText: "#4a7fa8",
        orb1: "#3b82f6",
        orb2: "#60a5fa",
        orb3: "#1d4ed8",
        nextBtnBg: "#2563eb",
        nextBtnText: "#ffffff",
        chipBg: "#0d1f38",
        chipBorder: "#1e3a5f",
        chipText: "#4a7fa8",
        chipActiveBg: "#1e3a5f",
        chipActiveBorder: "#3b82f6",
        chipActiveText: "#f0f8ff",
        sectionCardBg: "#070f1c",
        sectionCardBorder: "#1e3a5f",
        sectionTitle: "#93c5fd",
        backButtonBg: "#0d1f38",
        backButtonBorder: "#1e3a5f",
        backButtonText: "#93c5fd",
        safeAreaBg: "#040a14",
      };

  const [diseases,setDiseases] = useState("");
  const [surgeries,setSurgeries] = useState("");
  const [familyHistory,setFamilyHistory] = useState("");

  const [selectedConditions,setSelectedConditions] = useState<string[]>([]);
  const [selectedFamily,setSelectedFamily] = useState<string[]>([]);

  // Focus states
  const [diseasesFocused, setDiseasesFocused] = useState(false);
  const [surgeriesFocused, setSurgeriesFocused] = useState(false);
  const [familyHistoryFocused, setFamilyHistoryFocused] = useState(false);

  // Medications states
  const [currentMedications, setCurrentMedications] = useState("");
  const [selectedMedications, setSelectedMedications] = useState<string[]>([]);
  const [medicationsFocused, setMedicationsFocused] = useState(false);

  ///////////////////////////////////////////////////////////

  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb3Y = useRef(new Animated.Value(0)).current;

  useEffect(()=>{

    const makeLoop = (
      anim:Animated.Value,
      duration:number,
      delay:number
    )=>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim,{
            toValue:-20,
            duration,
            easing:Easing.inOut(Easing.sin),
            useNativeDriver:true
          }),
          Animated.timing(anim,{
            toValue:0,
            duration,
            easing:Easing.inOut(Easing.sin),
            useNativeDriver:true
          })
        ])
      );

    makeLoop(orb1Y,3600,0).start();
    makeLoop(orb2Y,4200,800).start();
    makeLoop(orb3Y,3100,1500).start();

  },[]);

  ///////////////////////////////////////////////////////////

  const toggleCondition = (item:string)=>{
    setSelectedConditions(prev =>
      prev.includes(item)
        ? prev.filter(c => c !== item)
        : [...prev,item]
    );
  };

  const toggleFamily = (item:string)=>{
    setSelectedFamily(prev =>
      prev.includes(item)
        ? prev.filter(c => c !== item)
        : [...prev,item]
    );
  };

  const toggleMedication = (item:string)=>{
    setSelectedMedications(prev =>
      prev.includes(item)
        ? prev.filter(c => c !== item)
        : [...prev,item]
    );
  };

  ///////////////////////////////////////////////////////////

  // ✅ STEP 2: REPLACE goToReview WITH THIS
  const goToReview = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("User not logged in");
      return;
    }

    try {
      // 🔥 PREPARE DATA
      const allMedications = [
        ...selectedMedications,
        currentMedications
      ].filter(Boolean).join(", ");

      // 🔥 SAVE HISTORY TO FIREBASE
      await updateDoc(doc(db, "users", user.uid), {
        history: {
          diseases,
          surgeries,
          familyHistory,
          selectedConditions,
          selectedFamily,
          medications: allMedications,
        },
        updatedAt: new Date().toISOString(),
      });

      // 👉 THEN navigate (existing logic)
      router.push({
        pathname: "/onboarding/review",
        params: {
          ...params,
          diseases,
          surgeries,
          familyHistory,
          selectedConditions: JSON.stringify(selectedConditions),
          selectedFamily: JSON.stringify(selectedFamily),
          currentMedications: allMedications,
        },
      });

    } catch (error: any) {
      alert(error.message);
    }
  };

  ///////////////////////////////////////////////////////////

  return(

    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.safeAreaBg }]}>

      <KeyboardAvoidingView
        style={{flex:1}}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]}
        >

          {/* BACK BUTTON */}

          <TouchableOpacity
            style={[styles.backButton, { 
              backgroundColor: colors.backButtonBg,
              borderColor: colors.backButtonBorder,
            }]}
            onPress={()=>router.back()}
            activeOpacity={0.8}
          >
            <Text style={[styles.backText, { color: colors.backButtonText }]}>← Back</Text>
          </TouchableOpacity>

          {/* STEP PROGRESS */}

          <View style={styles.progressContainer}>

            <View style={styles.progressHeaderRow}>
              <Text style={[styles.stepText, { color: colors.progressText }]}>Step 4 of 4</Text>
              <Text style={[styles.stepLabel, { color: colors.progressText }]}>History</Text>
            </View>

            <View style={[styles.progressBar, { backgroundColor: colors.progressTrackBg }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.progressFillBg }]} />
            </View>

          </View>

          {/* Animated Orbs */}

          <Animated.View 
            style={[styles.orb, styles.orb1, { 
              backgroundColor: colors.orb1,
              transform: [{translateY: orb1Y}],
              opacity: theme === "light" ? 0.08 : 0.1,
            }]} 
          />
          <Animated.View 
            style={[styles.orb, styles.orb2, { 
              backgroundColor: colors.orb2,
              transform: [{translateY: orb2Y}],
              opacity: theme === "light" ? 0.06 : 0.07,
            }]} 
          />
          <Animated.View 
            style={[styles.orb, styles.orb3, { 
              backgroundColor: colors.orb3,
              transform: [{translateY: orb3Y}],
              opacity: theme === "light" ? 0.07 : 0.09,
            }]} 
          />

          {/* HEADER */}

          <View style={styles.header}>

            <View style={[styles.iconBadge, { backgroundColor: colors.iconBadgeBg }]}>
              <Text style={styles.iconEmoji}>📋</Text>
            </View>

            <Text style={[styles.title, { color: colors.titleText }]}>Medical History</Text>

            <Text style={[styles.subtitle, { color: colors.subtitleText }]}>
              This helps us give better health guidance
            </Text>

          </View>

          {/* CONDITIONS */}

          <View style={[styles.sectionCard, { 
            backgroundColor: colors.sectionCardBg,
            borderColor: colors.sectionCardBorder,
          }]}>

            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Chronic Conditions</Text>

            <View style={styles.chipGrid}>
              {COMMON_CONDITIONS.map(item =>(
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chip,
                    { 
                      backgroundColor: selectedConditions.includes(item) ? colors.chipActiveBg : colors.chipBg,
                      borderColor: selectedConditions.includes(item) ? colors.chipActiveBorder : colors.chipBorder,
                      borderWidth: selectedConditions.includes(item) ? 1.5 : 1,
                    }
                  ]}
                  onPress={()=>toggleCondition(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedConditions.includes(item) ? colors.chipActiveText : colors.chipText }
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[
              styles.inputWrapper, 
              { 
                backgroundColor: colors.inputBg,
                borderColor: diseasesFocused ? colors.inputFocusedBorder : colors.inputBorder,
                borderWidth: 1.5,
              }
            ]}>
              <TextInput
                placeholder="Other conditions..."
                placeholderTextColor={colors.inputPlaceholder}
                value={diseases}
                onChangeText={setDiseases}
                style={[styles.input, { color: colors.inputText }]}
                blurOnSubmit={false}
                onFocus={() => setDiseasesFocused(true)}
                onBlur={() => setDiseasesFocused(false)}
              />
            </View>

          </View>

          {/* CURRENT MEDICATIONS */}

          <View style={[styles.sectionCard, { 
            backgroundColor: colors.sectionCardBg,
            borderColor: colors.sectionCardBorder,
          }]}>

            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Current Medications</Text>

            <View style={styles.chipGrid}>
              {COMMON_MEDICATIONS.map(item =>(
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chip,
                    { 
                      backgroundColor: selectedMedications.includes(item) ? colors.chipActiveBg : colors.chipBg,
                      borderColor: selectedMedications.includes(item) ? colors.chipActiveBorder : colors.chipBorder,
                      borderWidth: selectedMedications.includes(item) ? 1.5 : 1,
                    }
                  ]}
                  onPress={()=>toggleMedication(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedMedications.includes(item) ? colors.chipActiveText : colors.chipText }
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[
              styles.inputWrapper, 
              { 
                backgroundColor: colors.inputBg,
                borderColor: medicationsFocused ? colors.inputFocusedBorder : colors.inputBorder,
                borderWidth: 1.5,
              }
            ]}>
              <TextInput
                placeholder="Other medications..."
                placeholderTextColor={colors.inputPlaceholder}
                value={currentMedications}
                onChangeText={setCurrentMedications}
                style={[styles.input, { color: colors.inputText }]}
                blurOnSubmit={false}
                onFocus={() => setMedicationsFocused(true)}
                onBlur={() => setMedicationsFocused(false)}
              />
            </View>

          </View>

          {/* SURGERIES */}

          <View style={[styles.sectionCard, { 
            backgroundColor: colors.sectionCardBg,
            borderColor: colors.sectionCardBorder,
          }]}>

            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Past Surgeries</Text>

            <View style={[
              styles.inputWrapper, 
              { 
                backgroundColor: colors.inputBg,
                borderColor: surgeriesFocused ? colors.inputFocusedBorder : colors.inputBorder,
                borderWidth: 1.5,
              }
            ]}>
              <TextInput
                placeholder="Appendectomy 2018..."
                placeholderTextColor={colors.inputPlaceholder}
                value={surgeries}
                onChangeText={setSurgeries}
                style={[styles.input, { color: colors.inputText }]}
                blurOnSubmit={false}
                onFocus={() => setSurgeriesFocused(true)}
                onBlur={() => setSurgeriesFocused(false)}
              />
            </View>

          </View>

          {/* FAMILY */}

          <View style={[styles.sectionCard, { 
            backgroundColor: colors.sectionCardBg,
            borderColor: colors.sectionCardBorder,
          }]}>

            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Family Medical History</Text>

            <View style={styles.chipGrid}>
              {COMMON_FAMILY.map(item =>(
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chip,
                    { 
                      backgroundColor: selectedFamily.includes(item) ? colors.chipActiveBg : colors.chipBg,
                      borderColor: selectedFamily.includes(item) ? colors.chipActiveBorder : colors.chipBorder,
                      borderWidth: selectedFamily.includes(item) ? 1.5 : 1,
                    }
                  ]}
                  onPress={()=>toggleFamily(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedFamily.includes(item) ? colors.chipActiveText : colors.chipText }
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[
              styles.inputWrapper, 
              { 
                backgroundColor: colors.inputBg,
                borderColor: familyHistoryFocused ? colors.inputFocusedBorder : colors.inputBorder,
                borderWidth: 1.5,
              }
            ]}>
              <TextInput
                placeholder="Other family conditions..."
                placeholderTextColor={colors.inputPlaceholder}
                value={familyHistory}
                onChangeText={setFamilyHistory}
                style={[styles.input, { color: colors.inputText }]}
                blurOnSubmit={false}
                onFocus={() => setFamilyHistoryFocused(true)}
                onBlur={() => setFamilyHistoryFocused(false)}
              />
            </View>

          </View>

          {/* CONTINUE */}

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.nextBtnBg }]}
            onPress={goToReview}
          >
            <Text style={[styles.nextBtnText, { color: colors.nextBtnText }]}>Review Profile</Text>
          </TouchableOpacity>

        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>

  );

}

///////////////////////////////////////////////////////////

const styles = StyleSheet.create({

safeArea: {
  flex: 1,
},

scroll:{
  paddingHorizontal:20,
  paddingTop:40,
  paddingBottom:60,
  flexGrow: 1,
},

/* BACK BUTTON */

backButton:{
  flexDirection:"row",
  alignItems:"center",
  alignSelf:"flex-start",
  paddingHorizontal:14,
  paddingVertical:8,
  borderRadius:10,
  borderWidth:1.5,
  marginBottom:18
},

backText:{
  fontSize:14,
  fontWeight:"600"
},

/* STEP PROGRESS */

progressContainer:{
  marginBottom:20
},

progressHeaderRow:{
  flexDirection:"row",
  justifyContent:"space-between",
  marginBottom:6
},

stepText:{
  fontSize:13,
  fontWeight:"600"
},

stepLabel:{
  fontSize:13,
  fontWeight:"600"
},

progressBar:{
  height:6,
  borderRadius:6,
  overflow:"hidden"
},

progressFill:{
  width:"100%",
  height:"100%",
},

/* ORBS */

orb:{position:"absolute",borderRadius:999},

orb1:{width:260,height:260,top:-50,right:-90},
orb2:{width:200,height:200,bottom:100,left:-80},
orb3:{width:130,height:130,top:"50%",right:-30},

/* HEADER */

header:{alignItems:"center",marginBottom:20},

iconBadge:{
  width:62,
  height:62,
  borderRadius:18,
  alignItems:"center",
  justifyContent:"center",
  marginBottom:12
},

iconEmoji:{fontSize:26},

title:{fontSize:28,fontWeight:"800"},

subtitle:{fontSize:13,textAlign:"center"},

/* SECTIONS */

sectionCard:{
  borderWidth:1,
  borderRadius:16,
  padding:16,
  marginBottom:14
},

sectionTitle:{fontSize:13,fontWeight:"700"},

chipGrid:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:10},

chip:{
  paddingHorizontal:12,
  paddingVertical:7,
  borderRadius:10
},

chipText:{},

inputWrapper:{
  marginTop:10,
  borderRadius:12,
  paddingHorizontal:12,
  height:48,
  justifyContent:"center"
},

input:{fontSize:14},

nextBtn:{
  height:52,
  borderRadius:14,
  alignItems:"center",
  justifyContent:"center",
  marginTop:20
},

nextBtnText:{fontSize:16,fontWeight:"700"}

});
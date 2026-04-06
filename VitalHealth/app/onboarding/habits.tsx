import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore"; // ✅ STEP 1: ADD IMPORTS
import React, { useEffect, useRef, useState } from "react";
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

const ACTIVITY_LEVELS = [
  { label: "Sedentary", icon: "🪑", desc: "Little to no exercise" },
  { label: "Moderate", icon: "🚶", desc: "Light exercise 1–3 days" },
  { label: "Active", icon: "🏃", desc: "Hard exercise 4–5 days" },
];

const WATER_OPTIONS = ["1L", "2L", "3L", "4L", "5L", "6L"];

////////////////////////////////////////////////////////////

const TimeField = ({ label, icon, value, onChange, placeholder, colors, focused, onFocus, onBlur }: any) => {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={[styles.fieldLabel, { color: colors.labelText }]}>{label}</Text>

      <View style={[
        styles.inputWrapper, 
        { 
          backgroundColor: colors.inputBg,
          borderColor: focused ? colors.inputFocusedBorder : colors.inputBorder,
        }
      ]}>
        <Text style={styles.inputIcon}>{icon}</Text>

        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.inputPlaceholder}
          value={value}
          onChangeText={onChange}
          style={[styles.input, { color: colors.inputText }]}
          blurOnSubmit={false}
          onFocus={onFocus}
          onBlur={onBlur}
        />

        {value.length > 0 && <Text style={[styles.checkIcon, { color: colors.checkIconColor }]}>✓</Text>}
      </View>
    </View>
  );
};

////////////////////////////////////////////////////////////

export default function Habits() {

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
        activityCardBg: "#ffffff",
        activityCardBorder: "#e2e8f0",
        activityCardActiveBorder: "#2563eb",
        activityLabel: "#020617",
        activityDesc: "#64748b",
        backText: "#2563eb",
        checkIconColor: "#22c55e",
        safeAreaBg: "#f8fafc",
        waterDrop: "#3b82f6",
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
        activityCardBg: "#0d1f38",
        activityCardBorder: "#1e3a5f",
        activityCardActiveBorder: "#3b82f6",
        activityLabel: "#f0f8ff",
        activityDesc: "#2d5a8e",
        backText: "#60a5fa",
        checkIconColor: "#3b82f6",
        safeAreaBg: "#040a14",
        waterDrop: "#3b82f6",
      };

  const [wakeUp, setWakeUp] = useState("");
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [dinner, setDinner] = useState("");
  const [sleep, setSleep] = useState("");

  const [water, setWater] = useState("2L");
  const [activity, setActivity] = useState("");

  // Focus states for time fields
  const [wakeUpFocused, setWakeUpFocused] = useState(false);
  const [breakfastFocused, setBreakfastFocused] = useState(false);
  const [lunchFocused, setLunchFocused] = useState(false);
  const [dinnerFocused, setDinnerFocused] = useState(false);
  const [sleepFocused, setSleepFocused] = useState(false);

  ///////////////////////////////////////////////////////////

  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb3Y = useRef(new Animated.Value(0)).current;

  useEffect(()=>{

    const makeLoop = (anim:Animated.Value,duration:number,delay:number)=>
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

    makeLoop(orb1Y,3400,0).start();
    makeLoop(orb2Y,4000,700).start();
    makeLoop(orb3Y,3000,1400).start();

  },[]);

  ///////////////////////////////////////////////////////////

  // ✅ STEP 2: REPLACE goNext WITH THIS
  const goNext = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("User not logged in");
      return;
    }

    try {
      // 🔥 SAVE HABITS TO FIREBASE
      await updateDoc(doc(db, "users", user.uid), {
        habits: {
          wakeUp,
          breakfast,
          lunch,
          dinner,
          sleep,
          water,
          activity,
        },
        updatedAt: new Date().toISOString(),
      });

      // 👉 THEN navigate (your existing logic)
      router.push({
        pathname: "/onboarding/history",
        params: {
          ...params,
          wakeUp,
          breakfast,
          lunch,
          dinner,
          sleep,
          water,
          activity,
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]}
        >

          {/* BACK BUTTON */}

          <TouchableOpacity
            style={styles.backBtn}
            onPress={()=>router.back()}
          >
            <Text style={[styles.backArrow, { color: colors.backText }]}>‹</Text>
            <Text style={[styles.backText, { color: colors.backText }]}>Back</Text>
          </TouchableOpacity>

          {/* STEP PROGRESS */}

          <View style={styles.progressContainer}>

            <View style={styles.progressHeaderRow}>
              <Text style={[styles.stepText, { color: colors.progressText }]}>Step 3 of 4</Text>
              <Text style={[styles.stepLabel, { color: colors.progressText }]}>Habits</Text>
            </View>

            <View style={[styles.progressBar, { backgroundColor: colors.progressTrackBg }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.progressFillBg }]} />
            </View>

          </View>

          {/* ORBS */}

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
              opacity: theme === "light" ? 0.06 : 0.08,
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
              <Text style={styles.iconEmoji}>🌿</Text>
            </View>

            <Text style={[styles.title, { color: colors.titleText }]}>Daily Habits</Text>

            <Text style={[styles.subtitle, { color: colors.subtitleText }]}>
              Your routine helps us build a personalised health schedule
            </Text>

          </View>

          {/* DAILY SCHEDULE */}

          <View style={[styles.sectionCard, { 
            backgroundColor: colors.sectionCardBg,
            borderColor: colors.sectionCardBorder,
          }]}>

            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Daily Schedule</Text>

            <TimeField 
              label="Wake Up" 
              icon="🌅" 
              value={wakeUp} 
              onChange={setWakeUp} 
              placeholder="6:30 AM"
              colors={colors}
              focused={wakeUpFocused}
              onFocus={() => setWakeUpFocused(true)}
              onBlur={() => setWakeUpFocused(false)}
            />
            <TimeField 
              label="Breakfast" 
              icon="🍳" 
              value={breakfast} 
              onChange={setBreakfast} 
              placeholder="8:00 AM"
              colors={colors}
              focused={breakfastFocused}
              onFocus={() => setBreakfastFocused(true)}
              onBlur={() => setBreakfastFocused(false)}
            />
            <TimeField 
              label="Lunch" 
              icon="🥗" 
              value={lunch} 
              onChange={setLunch} 
              placeholder="1:00 PM"
              colors={colors}
              focused={lunchFocused}
              onFocus={() => setLunchFocused(true)}
              onBlur={() => setLunchFocused(false)}
            />
            <TimeField 
              label="Dinner" 
              icon="🍽️" 
              value={dinner} 
              onChange={setDinner} 
              placeholder="8:30 PM"
              colors={colors}
              focused={dinnerFocused}
              onFocus={() => setDinnerFocused(true)}
              onBlur={() => setDinnerFocused(false)}
            />
            <TimeField 
              label="Sleep" 
              icon="🌙" 
              value={sleep} 
              onChange={setSleep} 
              placeholder="11:00 PM"
              colors={colors}
              focused={sleepFocused}
              onFocus={() => setSleepFocused(true)}
              onBlur={() => setSleepFocused(false)}
            />

          </View>

          {/* WATER */}

          <View style={[styles.sectionCard, { 
            backgroundColor: colors.sectionCardBg,
            borderColor: colors.sectionCardBorder,
          }]}>

            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Daily Water Intake</Text>

            <View style={styles.chipRow}>
              {WATER_OPTIONS.map(opt=>(
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.chip,
                    { 
                      backgroundColor: water === opt ? colors.chipActiveBg : colors.chipBg,
                      borderColor: water === opt ? colors.chipActiveBorder : colors.chipBorder,
                    }
                  ]}
                  onPress={()=>setWater(opt)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: water === opt ? colors.chipActiveText : colors.chipText }
                  ]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.waterVisual}>
              {Array.from({length: parseInt(water) || 2}).map((_,i)=>(
                <Text key={i} style={[styles.waterDrop, { color: colors.waterDrop }]}>💧</Text>
              ))}
            </View>

          </View>

          {/* ACTIVITY */}

          <View style={[styles.sectionCard, { 
            backgroundColor: colors.sectionCardBg,
            borderColor: colors.sectionCardBorder,
          }]}>

            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Activity Level</Text>

            {ACTIVITY_LEVELS.map(lvl=>(
              <TouchableOpacity
                key={lvl.label}
                style={[
                  styles.activityCard,
                  { 
                    backgroundColor: colors.activityCardBg,
                    borderColor: activity === lvl.label ? colors.activityCardActiveBorder : colors.activityCardBorder,
                    borderWidth: activity === lvl.label ? 1.5 : 1,
                  }
                ]}
                onPress={()=>setActivity(lvl.label)}
              >
                <Text style={styles.activityIcon}>{lvl.icon}</Text>

                <View>
                  <Text style={[styles.activityLabel, { color: colors.activityLabel }]}>{lvl.label}</Text>
                  <Text style={[styles.activityDesc, { color: colors.activityDesc }]}>{lvl.desc}</Text>
                </View>

              </TouchableOpacity>
            ))}

          </View>

          {/* CONTINUE */}

          <TouchableOpacity 
            style={[styles.nextBtn, { backgroundColor: colors.nextBtnBg }]} 
            onPress={goNext}
          >
            <Text style={[styles.nextBtnText, { color: colors.nextBtnText }]}>Continue</Text>
          </TouchableOpacity>

        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>

  );

}

////////////////////////////////////////////////////////////

const styles = StyleSheet.create({

safeArea: {
  flex: 1,
},

scroll:{
  paddingHorizontal:20,
  paddingTop:40,
  paddingBottom:80,
  flexGrow: 1,
},

backBtn:{flexDirection:"row",alignItems:"center",marginBottom:12},
backArrow:{fontSize:26},
backText:{fontSize:16,marginLeft:4},

progressContainer:{marginBottom:20},

progressHeaderRow:{
  flexDirection:"row",
  justifyContent:"space-between",
  marginBottom:6
},

stepText:{fontSize:13,fontWeight:"600"},
stepLabel:{fontSize:13,fontWeight:"600"},

progressBar:{
  height:6,
  borderRadius:6,
  overflow:"hidden"
},

progressFill:{
  width:"75%",
  height:"100%",
},

orb:{position:"absolute",borderRadius:999},

orb1:{width:280,height:280,top:-60,right:-100},
orb2:{width:200,height:200,bottom:80,left:-80},
orb3:{width:140,height:140,top:"40%",right:-40},

header:{alignItems:"center",marginBottom:30},

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

sectionCard:{
  borderWidth:1,
  borderRadius:16,
  padding:16,
  marginBottom:16
},

sectionTitle:{fontSize:13,fontWeight:"700",marginBottom:10},

fieldWrapper:{marginBottom:10},
fieldLabel:{fontSize:11,marginBottom:6},

inputWrapper:{
  flexDirection:"row",
  alignItems:"center",
  borderWidth:1.5,
  borderRadius:12,
  paddingHorizontal:10,
  height:46
},

inputIcon:{marginRight:6},
input:{flex:1,fontSize:14},
checkIcon:{fontWeight:"700"},

chipRow:{flexDirection:"row",flexWrap:"wrap",gap:8},

chip:{
  paddingHorizontal:20,
  paddingVertical:7,
  borderWidth:1.5,
  borderRadius:13
},

chipText:{},

waterVisual:{flexDirection:"row",marginTop:10},
waterDrop:{fontSize:16,marginRight:2},

activityCard:{
  flexDirection:"row",
  alignItems:"center",
  gap:10,
  padding:12,
  borderRadius:12,
  marginBottom:8
},

activityIcon:{fontSize:22},
activityLabel:{fontWeight:"700"},
activityDesc:{fontSize:11},

nextBtn:{
  height:52,
  borderRadius:14,
  alignItems:"center",
  justifyContent:"center",
  marginTop:10
},

nextBtnText:{fontSize:16,fontWeight:"700"}

});
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../services/firebase"; // ✅ STEP 1: ADD IMPORTS

export default function Personal() {
  const router = useRouter();

  const { signupName, signupEmail } = useLocalSearchParams<{
    signupName: string;
    signupEmail: string;
  }>();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");

  const [dobFocused, setDobFocused] = useState(false);
  const [genderSelected, setGenderSelected] = useState(false);
  const [firstFocused, setFirstFocused] = useState(false);
  const [lastFocused, setLastFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (anim: Animated.Value, duration: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -20,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    makeLoop(orb1Y, 3400, 0).start();
    makeLoop(orb2Y, 4000, 700).start();
    makeLoop(orb3Y, 3000, 1400).start();
  }, []);

  // ✅ STEP 2: REPLACE handleNext WITH THIS
  const handleNext = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("User not logged in");
      return;
    }

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !phone.trim() ||
      !dateOfBirth.trim() ||
      !gender.trim()
    ) {
      alert("Please fill all fields");
      return;
    }

    const dobRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
    if (!dobRegex.test(dateOfBirth)) {
      alert("Please enter date of birth as YYYY-MM-DD");
      return;
    }

    try {
      // 🔥 SAVE TO FIREBASE
      await updateDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        gender,
        updatedAt: new Date().toISOString(),
      });

      // 👉 THEN navigate
      router.push({
        pathname: "/onboarding/medical",
        params: {
          signupName,
          signupEmail,
          firstName,
          lastName,
          phone,
          dateOfBirth,
          gender,
        },
      });

    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* ORBS */}
      <Animated.View style={[styles.orb, styles.orb1, { transform: [{ translateY: orb1Y }] }]} />
      <Animated.View style={[styles.orb, styles.orb2, { transform: [{ translateY: orb2Y }] }]} />
      <Animated.View style={[styles.orb, styles.orb3, { transform: [{ translateY: orb3Y }] }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled" // ✅ FIX
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.inner}
        >
          {/* Progress */}
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: "33%" }]} />
            </View>
            <Text style={styles.progressLabel}>Step 1 of 3</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Text style={styles.iconEmoji}>👤</Text>
            </View>
            <Text style={styles.title}>Personal Info</Text>
            <Text style={styles.subtitle}>
              Enter your personal details to get started
            </Text>
            <Text style={styles.privacyNote}>
              Including DOB for age-specific health insights
            </Text>
          </View>

          {/* First Name */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <View style={[styles.inputWrapper, firstFocused && styles.inputFocused]}>
              <Text style={styles.inputIcon}>🙍</Text>
              <TextInput
                placeholder="e.g. John"
                placeholderTextColor="#4a7fa8"
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
                onFocus={() => setFirstFocused(true)}
                onBlur={() => setFirstFocused(false)}
              />
            </View>
          </View>

          {/* Last Name */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Last Name</Text>
            <View style={[styles.inputWrapper, lastFocused && styles.inputFocused]}>
              <Text style={styles.inputIcon}>🪪</Text>
              <TextInput
                placeholder="e.g. Doe"
                placeholderTextColor="#4a7fa8"
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                onFocus={() => setLastFocused(true)}
                onBlur={() => setLastFocused(false)}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <View style={[styles.inputWrapper, phoneFocused && styles.inputFocused]}>
              <Text style={styles.inputIcon}>📱</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
                keyboardType="phone-pad"
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
              />
            </View>
          </View>

          {/* DOB */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>DOB</Text>
            <View style={[styles.inputWrapper, dobFocused && styles.inputFocused]}>
              <Text style={styles.inputIcon}>🎂</Text>
              <TextInput
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                style={styles.input}
                maxLength={10}
                onFocus={() => setDobFocused(true)}
                onBlur={() => setDobFocused(false)}
              />
            </View>
          </View>

          {/* Gender */}
          <View style={styles.genderContainer}>
            {["Male", "Female", "Other"].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderButton, gender === g && styles.genderButtonSelected]}
                onPress={() => setGender(g)}
              >
                <Text style={styles.genderButtonText}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Button */}
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

///////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },

  inner: { padding: 24, paddingBottom: 100 },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },

  inputFocused: {
    borderColor: "#3b82f6",
  },

  input: { flex: 1, color: "white" },

  fieldWrapper: { marginBottom: 16 },
  fieldLabel: { color: "white", marginBottom: 6 },

  inputIcon: { marginRight: 10 },

  genderContainer: { flexDirection: "row", gap: 10, marginTop: 10 },
  genderButton: {
    padding: 10,
    backgroundColor: "#1e293b",
    borderRadius: 10,
  },
  genderButtonSelected: {
    backgroundColor: "#3b82f6",
  },
  genderButtonText: { color: "white" },

  nextBtn: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    alignItems: "center",
  },
  nextBtnText: { color: "white" },

  progressRow: { marginBottom: 20 },
  progressTrack: { height: 4, backgroundColor: "#334155" },
  progressFill: { height: 4, backgroundColor: "#3b82f6" },

  progressLabel: {
  color: '#94a3b8',
  fontSize: 14,
  fontWeight: '500',
},

  header: { alignItems: "center", marginBottom: 20 },
  iconBadge: { marginBottom: 10 },
  iconEmoji: { fontSize: 24 },
  title: { color: "white", fontSize: 20 },
  subtitle: { color: "#cbd5e1" },
  privacyNote: { color: "#94a3b8" },

  orb: { position: "absolute", borderRadius: 100 },
  orb1: { width: 200, height: 200, backgroundColor: "#3b82f6", opacity: 0.1 },
  orb2: { width: 150, height: 150, backgroundColor: "#8b5cf6", opacity: 0.1 },
  orb3: { width: 180, height: 180, backgroundColor: "#06b6d4", opacity: 0.1 },
});
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
import { useTheme } from "../../context/ThemeContext";
import { auth, db } from "../../services/firebase";

export default function Personal() {
  const router = useRouter();
  const { theme } = useTheme();

  // ✅ Theme colors — matches your other pages exactly
  const colors =
    theme === "light"
      ? {
          bg:           "#f8fafc",
          card:         "#ffffff",
          border:       "#e2e8f0",
          text:         "#020617",
          subText:      "#64748b",
          accent:       "#2563eb",
          accentLight:  "#dbeafe",
          inputBg:      "#f1f5f9",
          inputBorder:  "#e2e8f0",
          focusBorder:  "#2563eb",
          placeholder:  "#94a3b8",
          progressBg:   "#e2e8f0",
          genderBg:     "#f1f5f9",
          genderSelected: "#2563eb",
          orb1:         "#3b82f6",
          orb2:         "#8b5cf6",
          orb3:         "#06b6d4",
        }
      : {
          bg:           "#0f172a",
          card:         "#1e293b",
          border:       "#334155",
          text:         "#f1f5f9",
          subText:      "#94a3b8",
          accent:       "#3b82f6",
          accentLight:  "#1e3a8a",
          inputBg:      "#1e293b",
          inputBorder:  "#334155",
          focusBorder:  "#3b82f6",
          placeholder:  "#4a7fa8",
          progressBg:   "#334155",
          genderBg:     "#1e293b",
          genderSelected: "#3b82f6",
          orb1:         "#3b82f6",
          orb2:         "#8b5cf6",
          orb3:         "#06b6d4",
        };

  const { signupName, signupEmail } = useLocalSearchParams<{
    signupName: string;
    signupEmail: string;
  }>();

  const [firstName,    setFirstName]    = useState("");
  const [lastName,     setLastName]     = useState("");
  const [phone,        setPhone]        = useState("");
  const [dateOfBirth,  setDateOfBirth]  = useState("");
  const [gender,       setGender]       = useState("");

  const [firstFocused, setFirstFocused] = useState(false);
  const [lastFocused,  setLastFocused]  = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [dobFocused,   setDobFocused]   = useState(false);

  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (anim: Animated.Value, duration: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -20, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0,   duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    makeLoop(orb1Y, 3400, 0).start();
    makeLoop(orb2Y, 4000, 700).start();
    makeLoop(orb3Y, 3000, 1400).start();
  }, []);

  const handleNext = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("User not logged in");
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !dateOfBirth.trim() || !gender.trim()) {
      alert("Please fill all fields");
      return;
    }

    const dobRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
    if (!dobRegex.test(dateOfBirth)) {
      alert("Please enter date of birth as YYYY-MM-DD");
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        gender,
        updatedAt: new Date().toISOString(),
      });

      router.push({
        pathname: "/onboarding/medical",
        params: { signupName, signupEmail, firstName, lastName, phone, dateOfBirth, gender },
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>

      {/* ── Orbs ─────────────────────────────────────────────── */}
      <Animated.View style={[styles.orb, styles.orb1, { backgroundColor: colors.orb1, transform: [{ translateY: orb1Y }] }]} />
      <Animated.View style={[styles.orb, styles.orb2, { backgroundColor: colors.orb2, transform: [{ translateY: orb2Y }] }]} />
      <Animated.View style={[styles.orb, styles.orb3, { backgroundColor: colors.orb3, transform: [{ translateY: orb3Y }] }]} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.inner}
        >

          {/* ── Progress ────────────────────────────────────────── */}
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: colors.progressBg }]}>
              <View style={[styles.progressFill, { width: "33%", backgroundColor: colors.accent }]} />
            </View>
            <Text style={[styles.progressLabel, { color: colors.subText }]}>Step 1 of 3</Text>
          </View>

          {/* ── Header ──────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.iconEmoji}>👤</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Personal Info</Text>
            <Text style={[styles.subtitle, { color: colors.subText }]}>
              Enter your personal details to get started
            </Text>
            <Text style={[styles.privacyNote, { color: colors.subText }]}>
              Including DOB for age-specific health insights
            </Text>
          </View>

          {/* ── First Name ───────────────────────────────────────── */}
          <View style={styles.fieldWrapper}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>First Name</Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: colors.inputBg, borderColor: firstFocused ? colors.focusBorder : colors.inputBorder },
            ]}>
              <Text style={styles.inputIcon}>🙍</Text>
              <TextInput
                placeholder="e.g. John"
                placeholderTextColor={colors.placeholder}
                value={firstName}
                onChangeText={setFirstName}
                style={[styles.input, { color: colors.text }]}
                onFocus={() => setFirstFocused(true)}
                onBlur={() => setFirstFocused(false)}
              />
            </View>
          </View>

          {/* ── Last Name ────────────────────────────────────────── */}
          <View style={styles.fieldWrapper}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Last Name</Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: colors.inputBg, borderColor: lastFocused ? colors.focusBorder : colors.inputBorder },
            ]}>
              <Text style={styles.inputIcon}>🪪</Text>
              <TextInput
                placeholder="e.g. Doe"
                placeholderTextColor={colors.placeholder}
                value={lastName}
                onChangeText={setLastName}
                style={[styles.input, { color: colors.text }]}
                onFocus={() => setLastFocused(true)}
                onBlur={() => setLastFocused(false)}
              />
            </View>
          </View>

          {/* ── Phone ────────────────────────────────────────────── */}
          <View style={styles.fieldWrapper}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Phone</Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: colors.inputBg, borderColor: phoneFocused ? colors.focusBorder : colors.inputBorder },
            ]}>
              <Text style={styles.inputIcon}>📱</Text>
              <TextInput
                placeholder="e.g. 9876543210"
                placeholderTextColor={colors.placeholder}
                value={phone}
                onChangeText={setPhone}
                style={[styles.input, { color: colors.text }]}
                keyboardType="phone-pad"
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
              />
            </View>
          </View>

          {/* ── Date of Birth ─────────────────────────────────────── */}
          <View style={styles.fieldWrapper}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Date of Birth</Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: colors.inputBg, borderColor: dobFocused ? colors.focusBorder : colors.inputBorder },
            ]}>
              <Text style={styles.inputIcon}>🎂</Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                style={[styles.input, { color: colors.text }]}
                maxLength={10}
                onFocus={() => setDobFocused(true)}
                onBlur={() => setDobFocused(false)}
              />
            </View>
            <Text style={[styles.fieldHint, { color: colors.subText }]}>
              Format: YYYY-MM-DD (e.g. 2000-01-25)
            </Text>
          </View>

          {/* ── Gender ───────────────────────────────────────────── */}
          <View style={styles.fieldWrapper}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Gender</Text>
            <View style={styles.genderContainer}>
              {["Male", "Female", "Other"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderButton,
                    {
                      backgroundColor: gender === g ? colors.genderSelected : colors.genderBg,
                      borderColor:     gender === g ? colors.accent          : colors.inputBorder,
                    },
                  ]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[
                    styles.genderButtonText,
                    { color: gender === g ? "#ffffff" : colors.subText },
                  ]}>
                    {g === "Male" ? "♂ Male" : g === "Female" ? "♀ Female" : "⚧ Other"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Continue Button ───────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.accent }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Continue →</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:          { flex: 1 },
  inner:              { padding: 24, paddingBottom: 100 },

  // Orbs
  orb:                { position: "absolute", borderRadius: 100, opacity: 0.1 },
  orb1:               { width: 200, height: 200, top: -40,   left: -60  },
  orb2:               { width: 150, height: 150, top: "30%", right: -50 },
  orb3:               { width: 180, height: 180, bottom: 80, left: -40  },

  // Progress
  progressRow:        { marginBottom: 24 },
  progressTrack:      { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  progressFill:       { height: "100%", borderRadius: 2 },
  progressLabel:      { fontSize: 13, fontWeight: "500" },

  // Header
  header:             { alignItems: "center", marginBottom: 28 },
  iconBadge:          { width: 64, height: 64, borderRadius: 20, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  iconEmoji:          { fontSize: 28 },
  title:              { fontSize: 24, fontWeight: "800", letterSpacing: -0.5, marginBottom: 6 },
  subtitle:           { fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 4 },
  privacyNote:        { fontSize: 12, textAlign: "center", opacity: 0.7 },

  // Fields
  fieldWrapper:       { marginBottom: 18 },
  fieldLabel:         { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  fieldHint:          { fontSize: 11, marginTop: 4, opacity: 0.7 },

  // Input
  inputWrapper:       { flexDirection: "row", alignItems: "center", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5 },
  inputIcon:          { fontSize: 16, marginRight: 10 },
  input:              { flex: 1, fontSize: 15 },

  // Gender
  genderContainer:    { flexDirection: "row", gap: 10 },
  genderButton:       { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1.5 },
  genderButtonText:   { fontSize: 13, fontWeight: "600" },

  // Button
  nextBtn:            { marginTop: 10, paddingVertical: 16, borderRadius: 16, alignItems: "center", shadowColor: "#3b82f6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  nextBtnText:        { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
});
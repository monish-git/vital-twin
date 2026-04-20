import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFamily } from "../../context/FamilyContext";

export default function MemberDetails() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { members, getMemberById, isLoaded } = useFamily();

  // Extract and normalize the ID from route params
  const memberId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  // Fetch member using context function
  let member = memberId
    ? getMemberById(memberId.toString())
    : undefined;

  // Fallback lookup to handle legacy or Firebase UID cases
  if (!member && memberId) {
    member = members.find(
      (m: any) =>
        m.id?.toString() === memberId.toString() ||
        m.uid?.toString() === memberId.toString()
    );
  }

  // Debug logs (remove after verification)
  console.log("📌 Route Member ID:", memberId);
  console.log("📦 Available Members:", members);
  console.log("👤 Selected Member:", member);

  // Show loading indicator while data loads
  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ marginTop: 10 }}>Loading member details...</Text>
      </View>
    );
  }

  // Member not found state
  if (!member) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={60} color="red" />
        <Text style={styles.errorText}>Member not found</Text>
        <Text style={styles.subError}>
          Please return and select a valid family member.
        </Text>
      </View>
    );
  }

  // Construct display values safely
  const fullName =
    `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() ||
    member.name ||
    "Family Member";

  const relation =
    member.relationship ||
    member.relation ||
    "Family";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Family Member Details",
          headerShown: true,
        }}
      />

      <ScrollView style={styles.container}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Ionicons name="person-circle" size={90} color="#fff" />
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.subText}>
            {relation} • {member.age ?? "--"} yrs
          </Text>
        </View>

        {/* Personal Information */}
        <Section title="Personal Information" icon="person-outline">
          <Info label="Gender" value={member.gender ?? "--"} />
          <Info label="Age" value={`${member.age ?? "--"} years`} />
          <Info label="Weight" value={`${member.weight ?? "--"} kg`} />
          <Info
            label="Height"
            value={member.height ? `${member.height} cm` : "--"}
          />
          <Info
            label="Blood Group"
            value={member.bloodGroup ?? "--"}
          />
        </Section>

        {/* Vital Signs */}
        <Section title="Vital Signs" icon="heart-outline">
          <Info
            label="Heart Rate"
            value={`${member.heartRate ?? "--"} bpm`}
          />
          <Info
            label="SpO₂"
            value={`${member.spo2 ?? "--"} %`}
          />
          <Info
            label="Blood Pressure"
            value={member.bloodPressure ?? "--"}
          />
          <Info
            label="Temperature"
            value={`${member.temperature ?? "--"} °C`}
          />
        </Section>

        {/* Medicines */}
        <Section title="Medicines" icon="medkit-outline">
          {member.medicines?.length ? (
            member.medicines.map((med: any, index: number) => (
              <Text key={index} style={styles.listItem}>
                💊 {typeof med === "string" ? med : med.name}
              </Text>
            ))
          ) : (
            <Text style={styles.emptyText}>No medicines added</Text>
          )}
        </Section>

        {/* Symptoms */}
        <Section title="Symptoms" icon="fitness-outline">
          {member.symptoms?.length ? (
            member.symptoms.map((sym: any, index: number) => (
              <Text key={index} style={styles.listItem}>
                🩺 {sym.name || sym} ({sym.severity || "N/A"})
              </Text>
            ))
          ) : (
            <Text style={styles.emptyText}>No active symptoms</Text>
          )}
        </Section>

        {/* Hydration & Activity */}
        <Section title="Hydration & Activity" icon="water-outline">
          <Info
            label="Water Intake"
            value={`${member.hydration ?? 0} ml`}
          />
          <Info
            label="Steps"
            value={`${member.steps ?? 0}`}
          />
        </Section>
      </ScrollView>
    </>
  );
}

/* ---------- Reusable Components ---------- */

const Section = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color="#0ea5e9" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const Info = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  header: {
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    paddingVertical: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 5,
  },
  subText: {
    color: "#e0f2fe",
    fontSize: 14,
  },
  section: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#0f172a",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  label: {
    color: "#64748b",
  },
  value: {
    fontWeight: "600",
    color: "#0f172a",
  },
  listItem: {
    fontSize: 14,
    marginVertical: 3,
    color: "#0f172a",
  },
  emptyText: {
    color: "#94a3b8",
    fontStyle: "italic",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "red",
    marginTop: 10,
    fontWeight: "bold",
  },
  subError: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 5,
  },
});
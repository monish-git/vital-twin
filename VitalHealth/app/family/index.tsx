import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useFamily } from "../../context/FamilyContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function FamilyHealthScreen() {
  const { members } = useFamily();

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() =>
  router.push({
    pathname: "/family/member-details",
    params: { id: item.id.toString() },
  })
}
    >
      <Ionicons name="person-circle" size={50} color="#0ea5e9" />

      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.details}>
          {item.relationship} • {item.age} yrs
        </Text>

        {/* Health Summary */}
        <View style={styles.healthRow}>
          <View style={styles.healthItem}>
            <MaterialCommunityIcons
              name="water"
              size={16}
              color="#3b82f6"
            />
            <Text style={styles.healthText}>
              {item.hydration ?? 0} ml
            </Text>
          </View>

          <View style={styles.healthItem}>
            <MaterialCommunityIcons
              name="pill"
              size={16}
              color="#f59e0b"
            />
            <Text style={styles.healthText}>
              {item.medicines?.length ?? 0}
            </Text>
          </View>

          <View style={styles.healthItem}>
            <MaterialCommunityIcons
              name="stethoscope"
              size={16}
              color="#ef4444"
            />
            <Text style={styles.healthText}>
              {item.symptoms?.length ?? 0}
            </Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={["#0ea5e9", "#0284c7"]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Family Health</Text>
        <Text style={styles.headerSubtitle}>
          Monitor your loved ones' health
        </Text>
      </LinearGradient>

      {/* Add Member Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("./family/add-member")}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add Family Member</Text>
      </TouchableOpacity>

      {/* Members List */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="people-outline"
              size={60}
              color="#cbd5f5"
            />
            <Text style={styles.emptyText}>
              No family members added
            </Text>
            <Text style={styles.emptySubText}>
              Tap the button above to add one
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  header: {
    padding: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#e0f2fe",
    marginTop: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0ea5e9",
    marginHorizontal: 16,
    marginTop: -20,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  details: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 6,
  },
  healthRow: {
    flexDirection: "row",
    gap: 12,
  },
  healthItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  healthText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },
});
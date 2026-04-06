// app/MedicationVault.tsx

import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Medicine, useMedicine } from "../context/MedicineContext";
import { useTheme } from "../context/ThemeContext";
import { colors } from "../theme/colors";
import Header from "./components/Header";

// DB + Notification
import { deleteMedicine } from "../database/medicineDB";
import { cancelMedicineNotification } from "../services/notificationService";

// History
import { addToMedicineHistory } from "../utils/medicineHistory";

///////////////////////////////////////////////////////////

export default function MedicationVault() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = colors[theme];

  const { medicines, reloadMedicines } = useMedicine();

  const [filter, setFilter] = useState<"all" | "regular" | "once">("all");

  /////////////////////////////////////////////////////////
  // REFRESH
  /////////////////////////////////////////////////////////

  useFocusEffect(
    useCallback(() => {
      reloadMedicines();
    }, [])
  );

  /////////////////////////////////////////////////////////
  // FILTER
  /////////////////////////////////////////////////////////

  const filteredMedicines = medicines.filter((med: Medicine) => {
    if (filter === "regular") return med.frequency === "daily";
    if (filter === "once") return med.frequency === "once";
    return true;
  });

  /////////////////////////////////////////////////////////
  // DELETE HANDLER (FINAL FIX 🔥)
  /////////////////////////////////////////////////////////

  const handleDelete = (medicine: Medicine) => {
    Alert.alert(
      "Delete Medicine",
      `Delete ${medicine.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              ////////////////////////////////////////////////////
              // 🔥 SAVE TO HISTORY BEFORE DELETE
              ////////////////////////////////////////////////////

              await addToMedicineHistory({
                medicineId: medicine.id,
                medicineName: medicine.name,
                dose: medicine.dose,
                time: medicine.time,
                status: "deleted", // 🔥 important
              });

              ////////////////////////////////////////////////////
              // 🔕 CANCEL NOTIFICATION
              ////////////////////////////////////////////////////

              if (medicine.notificationId) {
                await cancelMedicineNotification(
                  medicine.notificationId
                );
              }

              ////////////////////////////////////////////////////
              // 🗑 DELETE FROM DB
              ////////////////////////////////////////////////////

              deleteMedicine(medicine.id);

              ////////////////////////////////////////////////////
              // 🔄 REFRESH UI
              ////////////////////////////////////////////////////

              reloadMedicines();

              console.log("✅ Deleted + history saved");
            } catch (error) {
              console.log("❌ Delete error:", error);
            }
          },
        },
      ]
    );
  };

  /////////////////////////////////////////////////////////
  // MARK AS TAKEN
  /////////////////////////////////////////////////////////

  const handleMarkAsTaken = async (medicine: Medicine) => {
    try {
      await addToMedicineHistory({
        medicineId: medicine.id,
        medicineName: medicine.name,
        dose: medicine.dose,
        time: medicine.time,
        status: "taken",
      });

      Alert.alert("Success", `${medicine.name} marked as taken`);
    } catch (error) {
      console.error("Error marking as taken:", error);
    }
  };

  /////////////////////////////////////////////////////////
  // ITEM
  /////////////////////////////////////////////////////////

  const renderMedicine = ({ item }: { item: Medicine }) => (
    <View style={[styles.medCard, { backgroundColor: c.card }]}>
      <View style={styles.medContent}>
        <View style={styles.medInfo}>
          <View style={styles.medHeader}>
            <Text style={[styles.medName, { color: c.text }]}>
              {item.name}
            </Text>

            {item.reminder === 1 && (
              <Ionicons name="notifications" size={16} color={c.accent} />
            )}
          </View>

          <Text style={[styles.medDose, { color: c.sub }]}>
            {item.dose}
          </Text>

          <View style={styles.medFooter}>
            <View
              style={[
                styles.timeBadge,
                { backgroundColor: c.accent + "20" },
              ]}
            >
              <Ionicons name="time" size={12} color={c.accent} />
              <Text style={[styles.medTime, { color: c.accent }]}>
                {item.time}
              </Text>
            </View>

            {item.meal && (
              <View
                style={[
                  styles.mealBadge,
                  { backgroundColor: c.border },
                ]}
              >
                <Text style={[styles.mealText, { color: c.sub }]}>
                  {item.meal === "before" ? "🍽️ Before" : "🍽️ After"}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.scheduleBadge,
                {
                  backgroundColor:
                    item.frequency === "once"
                      ? "#f472b620"
                      : "#22c55e20",
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  color:
                    item.frequency === "once"
                      ? "#f472b6"
                      : "#22c55e",
                }}
              >
                {item.frequency.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          {/* TAKEN */}
          <TouchableOpacity
            style={[styles.takenButton, { backgroundColor: "#22c55e20" }]}
            onPress={() => handleMarkAsTaken(item)}
          >
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          </TouchableOpacity>

          {/* DELETE */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  /////////////////////////////////////////////////////////
  // UI
  /////////////////////////////////////////////////////////

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <Header />

      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: c.text }]}>
            Medication Vault
          </Text>

          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.historyButton, { backgroundColor: c.card }]}
              onPress={() => router.push("/MedicineHistory" as any)}
            >
              <Ionicons name="time-outline" size={24} color={c.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: c.accent }]}
              onPress={() => router.push("/AddMedicine" as any)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.filterBar, { backgroundColor: c.card }]}>
          {(["all", "regular", "once"] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterTab,
                filter === type && {
                  borderBottomColor: c.accent,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setFilter(type)}
            >
              <Text
                style={{
                  color: filter === type ? c.accent : c.sub,
                  fontWeight: "600",
                }}
              >
                {type === "all" ? "ALL" : type === "regular" ? "DAILY" : "ONCE"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filteredMedicines}
          renderItem={renderMedicine}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      </View>
    </SafeAreaView>
  );
}

////////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  safe: { flex: 1 },

  container: {
    flex: 1,
    padding: 16,
    paddingTop: 90,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
  },

  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },

  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },

  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  filterBar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },

  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },

  list: {
    paddingBottom: 20,
  },

  medCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
  },

  medContent: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },

  medInfo: { flex: 1 },

  medHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },

  medName: {
    fontSize: 16,
    fontWeight: "600",
  },

  medDose: {
    fontSize: 14,
    marginBottom: 8,
  },

  medFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },

  medTime: {
    fontSize: 12,
    fontWeight: "500",
  },

  mealBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  mealText: {
    fontSize: 12,
  },

  scheduleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 10,
  },

  takenButton: {
    padding: 8,
    borderRadius: 8,
  },

  deleteButton: {
    padding: 8,
  },

  emptyState: {
    alignItems: "center",
    padding: 32,
    borderRadius: 16,
    marginTop: 20,
  },

  emptyText: {
    marginTop: 12,
    fontSize: 16,
    marginBottom: 20,
  },

  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },

  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
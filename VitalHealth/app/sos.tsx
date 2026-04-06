// app/sos.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

type Stage = "warning" | "sent" | "cancel";

export default function SOSScreen() {
  const router = useRouter();

  const [stage, setStage] =
    useState<Stage>("warning");

  const [countdown, setCountdown] =
    useState(5);

  // ================= COUNTDOWN =================

  useEffect(() => {
    if (stage !== "warning") return;

    if (countdown <= 0) {
      setStage("sent");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(c => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, stage]);

  // Reset countdown if restarted
  useEffect(() => {
    if (stage === "warning") {
      setCountdown(5);
    }
  }, [stage]);

  // ================= SCREENS =================

  const WarningScreen = () => (
    <View style={[styles.container, styles.red]}>
      <Text style={styles.icon}>⚠️</Text>

      <Text style={styles.title}>
        EMERGENCY SOS
      </Text>

      <Text style={styles.sub}>
        Alerting responders in
      </Text>

      <Text style={styles.count}>
        {countdown}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Emergency Contact List
        </Text>

        <Text style={styles.cardText}>
          John • Mom • Ambulance
        </Text>
      </View>

      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() =>
          setStage("cancel")
        }
      >
        <Text style={styles.cancelText}>
          DISMISS
        </Text>
      </TouchableOpacity>
    </View>
  );

  const SentScreen = () => (
    <View style={[styles.container, styles.green]}>
      <Text style={styles.icon}>✅</Text>

      <Text style={styles.title}>
        SOS SENT SUCCESSFULLY
      </Text>

      <Text style={styles.sub}>
        Responders are tracking your GPS…
      </Text>

      <TouchableOpacity
        style={styles.safeBtn}
        onPress={() =>
          setStage("cancel")
        }
      >
        <Text style={styles.safeText}>
          I AM NOW SAFE
        </Text>
      </TouchableOpacity>
    </View>
  );

  const CancelScreen = () => (
    <View style={[styles.container, styles.gray]}>
      <Text style={styles.icon}>✔</Text>

      <Text style={styles.cancelTitle}>
        SOS Cancelled
      </Text>

      <Text style={styles.cancelSub}>
        No emergency services contacted.
      </Text>

      <TouchableOpacity
        style={styles.dismissBtn}
        onPress={() =>
          router.back()
        }
      >
        <Text style={styles.dismissText}>
          Dismiss
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ================= RENDER =================

  if (stage === "warning")
    return <WarningScreen />;

  if (stage === "sent")
    return <SentScreen />;

  return <CancelScreen />;
}

// ================= STYLES =================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  red: { backgroundColor: "#dc2626" },
  green: { backgroundColor: "#16a34a" },
  gray: { backgroundColor: "#e5e7eb" },

  icon: {
    fontSize: 60,
    marginBottom: 20,
  },

  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
  },

  sub: {
    marginTop: 12,
    color: "#f8fafc",
    textAlign: "center",
  },

  cancelSub: {
    marginTop: 12,
    color: "#1f2937",
    textAlign: "center",
  },

  count: {
    fontSize: 80,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 20,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 18,
    borderRadius: 20,
    marginTop: 20,
    width: "100%",
  },

  cardTitle: {
    color: "#fff",
    fontWeight: "bold",
  },

  cardText: {
    color: "#f8fafc",
    marginTop: 6,
  },

  cancelBtn: {
    marginTop: 30,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 30,
    width: "100%",
  },

  cancelText: {
    textAlign: "center",
    color: "#dc2626",
    fontWeight: "bold",
  },

  safeBtn: {
    marginTop: 30,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 30,
    width: "100%",
  },

  safeText: {
    textAlign: "center",
    color: "#16a34a",
    fontWeight: "bold",
  },

  dismissBtn: {
    marginTop: 30,
    backgroundColor: "#1f2937",
    padding: 16,
    borderRadius: 30,
    width: "100%",
  },

  dismissText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "bold",
  },

  cancelTitle: {
    color: "#1f2937",
    fontSize: 24,
    fontWeight: "bold",
  },
});

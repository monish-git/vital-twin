import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function TwinSync({ score }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Twin Brain Sync</Text>

      <Text style={styles.score}>AI Score: {score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", marginTop: 20 },
  title: { fontSize: 18, color: "#38bdf8", fontWeight: "bold" },
  score: { color: "#fff", fontSize: 16, marginTop: 6 },
});

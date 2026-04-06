import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function FocusTest({ onDone }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Focus Tracking Test</Text>

      <Text style={styles.text}>
        Follow the moving target carefully.
      </Text>

      <TouchableOpacity style={styles.btn} onPress={() => onDone(75)}>
        <Text style={styles.btnText}>Finish Test</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  text: { color: "#94a3b8", marginVertical: 10 },
  btn: { backgroundColor: "#38bdf8", padding: 14, borderRadius: 12 },
  btnText: { color: "#fff", fontWeight: "bold" },
});

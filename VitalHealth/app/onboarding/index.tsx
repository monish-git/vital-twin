import { useRouter } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";

export default function Onboarding() {
  const router = useRouter();

  const handleStart = () => {
    router.push("/onboarding/personal");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Welcome to VitalHealth
      </Text>

      <Text style={styles.subtitle}>
        Let's setup your health profile
      </Text>

      <View style={styles.buttonContainer}>
        <Button title="Start Setup" onPress={handleStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
  buttonContainer: {
    marginTop: 20,
    width: "60%",
  },
});
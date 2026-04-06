import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";

import { getUserHealthData } from "../services/firebaseHealth";

export default function MemberHealth() {
  const { userId, name } = useLocalSearchParams();

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await getUserHealthData(userId as string);
      setData(result);
    } catch (err) {
      console.log("Error loading member data:", err);
    }
  };

  if (!data) {
    return <Text>Loading...</Text>;
  }

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        {name}
      </Text>

      {/* PERSONAL INFO */}
      <Text style={{ marginTop: 20 }}>👤 Age: {data.profile?.age}</Text>
      <Text>⚖ Weight: {data.profile?.weight}</Text>

      {/* MEDICINES */}
      <Text style={{ marginTop: 20, fontWeight: "bold" }}>
        💊 Medicines
      </Text>
      {data.medicines?.map((m: any) => (
        <Text key={m.id}>
          {m.name} - {m.dose}
        </Text>
      ))}

      {/* SYMPTOMS */}
      <Text style={{ marginTop: 20, fontWeight: "bold" }}>
        🩺 Symptoms
      </Text>
      {data.symptoms?.map((s: any) => (
        <Text key={s.id}>
          {s.name} ({s.severity})
        </Text>
      ))}

      {/* HYDRATION */}
      <Text style={{ marginTop: 20 }}>
        💧 Water Intake: {data.hydration} ml
      </Text>
    </ScrollView>
  );
}
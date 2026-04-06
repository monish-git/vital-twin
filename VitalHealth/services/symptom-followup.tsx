import { View, Text, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

export default function FollowUp() {
  const { id, name } = useLocalSearchParams();

  return (
    <View style={{ flex:1, justifyContent:"center", alignItems:"center", padding:20 }}>
      <Text style={{ fontSize:22, fontWeight:"bold" }}>
        Follow-up for {name}
      </Text>

      <Text style={{ marginTop:20 }}>
        Answer a few questions so we can analyze severity.
      </Text>

      <TouchableOpacity
        style={{
          marginTop:30,
          backgroundColor:"#2563eb",
          padding:15,
          borderRadius:12
        }}
        onPress={() => router.back()}
      >
        <Text style={{ color:"#fff", fontWeight:"bold" }}>
          Start Questions
        </Text>
      </TouchableOpacity>
    </View>
  );
}

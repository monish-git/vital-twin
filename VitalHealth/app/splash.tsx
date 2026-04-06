import { View, Text, StyleSheet } from "react-native";

export default function Splash() {

  return (
    <View style={styles.container}>

      <Text style={styles.title}>VitalHealth</Text>

      <Text style={styles.subtitle}>
        AI Powered Health Intelligence
      </Text>

    </View>
  );

}

const styles = StyleSheet.create({

  container:{
    flex:1,
    justifyContent:"center",
    alignItems:"center",
    backgroundColor:"#0ea5e9"
  },

  title:{
    fontSize:42,
    fontWeight:"bold",
    color:"#fff",
    marginBottom:10
  },

  subtitle:{
    fontSize:16,
    color:"#e0f2fe"
  }

});
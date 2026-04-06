import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { isLoggedIn } from "../services/authStorage";
import { getProfile } from "../services/profileStorage";

export default function Startup() {

  const router = useRouter();

  useEffect(() => {

    const checkApp = async () => {

      const loggedIn = await isLoggedIn();

      if (!loggedIn) {
        router.replace("/welcome");
        return;
      }

      const profile = await getProfile();

      if (!profile) {
        router.replace("/onboarding/personal");
      } else {
        router.replace("/(tabs)");
      }

    };

    checkApp();

  }, []);

  return (
    <View style={{
      flex:1,
      justifyContent:"center",
      alignItems:"center"
    }}>
      <ActivityIndicator size="large"/>
    </View>
  );
}
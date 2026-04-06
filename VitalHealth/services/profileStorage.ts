import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_KEY = "userProfile";

export const saveProfile = async (profile: any) => {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const getProfile = async () => {
  const data = await AsyncStorage.getItem(PROFILE_KEY);
  return data ? JSON.parse(data) : null;
};

export const updateProfile = async (profile: any) => {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};
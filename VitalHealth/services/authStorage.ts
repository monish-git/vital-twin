import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_KEY = "USER_AUTH";

export const setLoggedIn = async () => {
  await AsyncStorage.setItem(AUTH_KEY, "true");
};

export const logoutUser = async () => {
  await AsyncStorage.removeItem(AUTH_KEY);
};

export const isLoggedIn = async () => {
  const value = await AsyncStorage.getItem(AUTH_KEY);
  return value === "true";
};
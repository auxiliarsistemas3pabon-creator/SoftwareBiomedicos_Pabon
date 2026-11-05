import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// SecureStore para datos sensibles (tokens). AsyncStorage para el resto
// (perfil cacheado, preferencia de tema). Se exponen wrappers async unificados.

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    return SecureStore.deleteItemAsync(key);
  },
};

export const asyncStorage = {
  async get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  },
};

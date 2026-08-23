import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const getWebStorage = () => (typeof localStorage === 'undefined' ? null : localStorage);

export const storage = {
  async get(key: string) {
    if (Platform.OS === 'web') return getWebStorage()?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === 'web') {
      getWebStorage()?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    if (Platform.OS === 'web') {
      getWebStorage()?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { assertValidStorageKey } from './storage-key';

const getWebStorage = () => (typeof localStorage === 'undefined' ? null : localStorage);
export { scopedStorageKey } from './storage-key';

export const storage = {
  async get(key: string) {
    assertValidStorageKey(key);
    if (Platform.OS === 'web') return getWebStorage()?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    assertValidStorageKey(key);
    if (Platform.OS === 'web') {
      getWebStorage()?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    assertValidStorageKey(key);
    if (Platform.OS === 'web') {
      getWebStorage()?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

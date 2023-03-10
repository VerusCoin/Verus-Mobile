import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATIONS_STORAGE_INTERNAL_KEY } from '../../../env/index'

export const storeNotifications = async data => {
  if (typeof data !== 'object') {
    throw new Error(
      `Notification store function expected object, received ${typeof data}`,
    );
  }

  await AsyncStorage.setItem(
    NOTIFICATIONS_STORAGE_INTERNAL_KEY,
    JSON.stringify(data),
  )

  return data
};

export const loadNotifications = async () => {
  const res = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_INTERNAL_KEY)

  if (res) return JSON.parse(res)
  else return {}
};

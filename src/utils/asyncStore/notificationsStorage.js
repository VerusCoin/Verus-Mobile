import { NOTIFICATIONS_STORAGE_INTERNAL_KEY } from '../../../env/index'
import { SecureStorage } from '../keychain/secureStore';

export const storeNotifications = async data => {
  if (typeof data !== 'object') {
    throw new Error(
      `Notification store function expected object, received ${typeof data}`,
    );
  }

  await SecureStorage.setItem(
    NOTIFICATIONS_STORAGE_INTERNAL_KEY,
    JSON.stringify(data),
  )

  return data
};

export const loadNotifications = async () => {
  const res = await SecureStorage.getItem(NOTIFICATIONS_STORAGE_INTERNAL_KEY)

  if (res) return JSON.parse(res)
  else return {}
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WIDGET_STORAGE_INTERNAL_KEY } from '../../../env/index'

export const storeWidgets = async data => {
  if (typeof data !== 'object') {
    throw new Error(
      `Widget store function expected object, received ${typeof data}`,
    );
  }

  await AsyncStorage.setItem(
    WIDGET_STORAGE_INTERNAL_KEY,
    JSON.stringify(data),
  )

  return data
};

export const loadWidgets = async () => {
  const res = await AsyncStorage.getItem(WIDGET_STORAGE_INTERNAL_KEY)

  if (res) return JSON.parse(res)
  else return {}
};

export const storeWidgetsForAccount = async (data, accountHash) => {
  if (typeof data !== 'object') {
    throw new Error(
      `Widget store function expected object, received ${typeof data}`,
    );
  }

  const allWidgets = await loadWidgets()

  allWidgets[accountHash] = data

  return storeWidgets(allWidgets)
};

export const loadWidgetsForAccount = async (accountHash) => {
  const allWidgets = await loadWidgets()

  if (allWidgets[accountHash]) return allWidgets[accountHash]
  else return {}
};

export const clearWidgetsForAccount = async (accountHash) => {
  let allWidgets = await loadWidgets()

  delete allWidgets[accountHash]

  return storeWidgets(allWidgets)
}
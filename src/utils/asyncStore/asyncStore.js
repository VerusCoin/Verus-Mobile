// Handle all calls to Async Storage (persistent) in this file

import { AsyncStorage } from "react-native"
// react-native's version of local storage

export * from './authDataStorage'
export * from './coinStorage'
export * from './cache/cache'

export const INIT = "initialized"
export const PIN = "pin"

export const initialize = () => AsyncStorage.setItem(INIT, "true")
// set storage to hold key as TRUE

export const clearStorage = () => AsyncStorage.clear()
//For testing purposes

export const isSignedIn = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem(KEY)
      .then(res => {
        if (res !== null) {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .catch(err => reject(err));
  });
};



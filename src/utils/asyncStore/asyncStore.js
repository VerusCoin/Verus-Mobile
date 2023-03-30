// Handle all calls to Async Storage (persistent) in this file

import { APP_VERSION } from '../../../env/index'

import AsyncStorage from '@react-native-async-storage/async-storage';
// react-native's version of local storage

export * from './authDataStorage'
export * from './settingsStorage'
export * from './coinStorage'
export * from './cache/cache'
export * from './notificationsStorage'

const vc = require('version_compare')
export const PIN = "pin"

/**
 * This function fetches the verus_mobile_version object from async
 * storage and returns one of three options. 1 if the stored version is 
 * greater than the current version, 0 if the stored and current version match,
 * and -1 if the stored version is behind the current version. Current version is 
 * stored in globals. If the versions are mismatched, stored version is them set
 * to the current version.
 */
export const checkAndSetVersion = () => {
  let result = 0

  return new Promise((resolve, reject) => {
    AsyncStorage.getItem('verus_mobile_version')
      .then(res => {
        if (!res) {
          result = -1
        } else {
          storedVersion = res.split('-')
          currentVersion = APP_VERSION.split('-')
  
          //Length determines if a version is a beta or not
          if (currentVersion.length < storedVersion.length) result = -1
          if (currentVersion.length > storedVersion.length) result = 1
          if (currentVersion.length === storedVersion.length) {
            result = vc.compare(storedVersion[0], currentVersion[0])
          }
        }

        if (result != 0) return AsyncStorage.setItem('verus_mobile_version', APP_VERSION)
        return
      })
      .then(() => {
        resolve(result)
      })
      .catch(err => reject(err));
  });
}
// set storage to hold key as TRUE

export const clearStorage = () => AsyncStorage.clear()
//For testing purposes
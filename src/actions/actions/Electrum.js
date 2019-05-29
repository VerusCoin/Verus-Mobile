import { 
  getServerVersion
} from '../../utils/httpCalls/callCreators';

import {
  getElectrumVersions,
  setElectrumVersion
} from '../../utils/asyncStore';

import {
  setServerVersions
} from '../actionCreators';

export const loadServerVersions = () => {
  return new Promise((resolve, reject) => {
    getElectrumVersions()
    .then(versionsObj => {
      if (!versionsObj) {
        resolve(false)
      }
      else {
        resolve(setServerVersions(versionsObj))
      }
    })
    .catch(err => reject(err));
  });
}

export const saveServerVersion = (server, version, versionList) => {
  return new Promise((resolve, reject) => {
    setElectrumVersion(server, version, versionList)
    .then(versionsObj => {
      if (!versionsObj) {
        resolve(false)
      }
      else {
        resolve(setServerVersions(versionsObj))
      }
    })
    .catch(err => reject(err));
  });
}
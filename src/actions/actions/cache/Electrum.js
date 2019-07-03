import {
  getElectrumVersions,
  setElectrumVersion
} from '../../../utils/asyncStore/asyncStore';

import {
  setServerVersions,
  addServerVersion
} from '../../actionCreators';

export const loadServerVersions = (dispatch) => {
  return new Promise((resolve) => {
    getElectrumVersions()
    .then(serverList => {
      let serverListParsed = {}

      for (let key in serverList) {
        serverListParsed[key.replace(/\|/g, ":")] = serverList[key].value;
        //Turn '|' back to colon, as it was switched to '|' in electrumVersions.js
      }

      dispatch(setServerVersions(serverListParsed))
      resolve()
    })
    .catch(e => {
      throw e
    })
  })
}

export const saveServerVersion = (server, version, dispatch) => {
  return new Promise((resolve) => {
    setElectrumVersion(server, version)
    .then(() => {
      dispatch(addServerVersion(server, version))
      resolve()
    })
    .catch(e => {
      throw e
    })
  })
}
import {
  getElectrumVersions,
  setElectrumVersion,
  clearCachedVersions,
} from '../../../utils/asyncStore/asyncStore';

import {
  setServerVersions,
  addServerVersion
} from '../../actionCreators';

export const loadServerVersions = async dispatch => {
  // Storage access failures are not disposable corruption; let startup's
  // recovery path surface them instead of leaving a pending Promise.
  const serverList = await getElectrumVersions();
  let serverListParsed = {};

  try {
    if (serverList == null || typeof serverList !== "object" || Array.isArray(serverList)) {
      throw new Error("Invalid electrum version cache");
    }

    for (const key of Object.keys(serverList)) {
      if (
        serverList[key] == null ||
        !("value" in serverList[key]) ||
        typeof serverList[key].value !== "number" ||
        !Number.isFinite(serverList[key].value)
      ) {
        throw new Error("Invalid electrum version cache entry");
      }

      serverListParsed[key.replace(/\|/g, ":")] = serverList[key].value;
      // Turn '|' back to colon, as it was switched in electrumVersions.js.
    }
  } catch (parseError) {
    await clearCachedVersions();
    serverListParsed = {};
  }

  dispatch(setServerVersions(serverListParsed));
};

export const saveServerVersion = async (server, version, dispatch) => {
  await setElectrumVersion(server, version);
  dispatch(addServerVersion(server, version));
};

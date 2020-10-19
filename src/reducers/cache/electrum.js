/* 
  The electrum reducer's purpose is to hold data about electrum
  servers that persists in Async storage, and gets loaded when the 
  app starts, so that constant calls to Async Storage are avoided
*/

import {
  ADD_GOOD_SERVER,
  ADD_BAD_SERVER,
} from "../../utils/constants/storeType";

export const electrum = (state = {
  serverVersions: {},
  goodServers: {},
  badServers: {}
}, action) => {
  switch (action.type) {
    case 'ADD_SERVER_VERSION':
      let _serverVersions = state.serverVersions
      _serverVersions[action.server] = action.version
      return {
        ...state, 
        serverVersions: _serverVersions,
      };
    case ADD_GOOD_SERVER:
      return {
        ...state,
        goodServers: {
          ...state.goodServers,
          [action.payload.server.goodServer]: action.payload.server,
        },
      };
    case ADD_BAD_SERVER:
      return {
        ...state,
        badServers: {
          ...state.badServers,
          [action.payload.server]: true,
        },
      };
    case 'SET_SERVER_VERSIONS':
      return {
        ...state, 
        serverVersions: action.serverVersions,
      };
    case 'CLEAR_CACHE':
      return {
        ...state, 
        serverVersions: {},
        goodServers: {},
        badServers: {}
      };
    default:
      return state;
  }
}
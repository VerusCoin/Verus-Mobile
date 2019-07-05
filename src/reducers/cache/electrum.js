/* 
  The electrum reducer's purpose is to hold data about electrum
  servers that persists in Async storage, and gets loaded when the 
  app starts, so that constant calls to Async Storage are avoided
*/

export const electrum = (state = {
  serverVersions: {}
}, action) => {
  switch (action.type) {
    case 'ADD_SERVER_VERSION':
      let _serverVersions = state.serverVersions
      _serverVersions[action.server] = action.version
      return {
        ...state, 
        serverVersions: _serverVersions,
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
      };
    default:
      return state;
  }
}
/*
  This reducer's purpose is to hold data retrieved from
  the blockHeader storage cache when the app loads. This
  part of the store should clear and mirror the cache if it
  reaches it's max capacity, which is always a little more
  than the cache.
*/

export const headers = (state = {
  headers: {}
}, action) => {
  switch (action.type) {
    case 'ADD_HEADER':
      let _headers = state.headers
      _headers[action.key] = JSON.stringify(action.header)
      return {
        ...state, 
        headers: _headers,
      };
    case 'SET_HEADERS':
      return {
        ...state, 
        headers: action.headers,
      };
    case 'CLEAR_CACHE':
      return {
        ...state, 
        headers: {},
      };
    default:
      return state;
  }
}
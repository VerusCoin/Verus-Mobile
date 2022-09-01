import store from '../../../../../store';

export const getWatchedIdentities = coinObj => {
  const state = store.getState();
  return state.channelStore_verusid.watchedVerusIds[coinObj.id];
};

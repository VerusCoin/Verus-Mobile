import {
  ENABLE_DLIGHT,
  ENABLE_WYRE_COIN,
  DISABLED_CHANNELS,
  ENABLE_VRPC
} from '../../env/index';
import store from '../store';
import {DLIGHT_PRIVATE} from './constants/intervalConstants';

export const dlightEnabled = () => {
  const state = store.getState();

  return (
    ENABLE_DLIGHT && state.authentication.activeAccount.seeds[DLIGHT_PRIVATE]
  );
};

export const wyreCoinChannelEnabled = () => {
  return ENABLE_WYRE_COIN;
};

export const vrpcChannelEnabled = () => {
  return ENABLE_VRPC;
};

export const getDisabledChannels = () => {
  return dlightEnabled()
    ? DISABLED_CHANNELS
    : [...DISABLED_CHANNELS, DLIGHT_PRIVATE];
};
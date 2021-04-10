import { ENABLE_DLIGHT, DISABLED_CHANNELS } from '../../env/main.json'
import store from '../store'
import { DLIGHT_PRIVATE } from './constants/intervalConstants';

export const dlightEnabled = () => {
  const state = store.getState()

  return (
    ENABLE_DLIGHT &&
    state.authentication.activeAccount.seeds[DLIGHT_PRIVATE]
  );
}

export const getDisabledChannels = () => {
  return dlightEnabled() ? DISABLED_CHANNELS : [...DISABLED_CHANNELS, DLIGHT_PRIVATE]
}


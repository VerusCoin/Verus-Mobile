import {
  AUTHENTICATE_USER,
  SET_BALANCES,
  UPDATE_ACCOUNT_TESTNET_OVERRIDES_COMPLETE,
  SIGN_OUT,
  SIGN_OUT_COMPLETE,
  UPDATE_SESSION_KEY,
} from '../utils/constants/storeType';

export const ASSETS_HYDRATED = 'ASSETS_HYDRATED';
export const ASSETS_HYDRATION_FAILED = 'ASSETS_HYDRATION_FAILED';
export const ASSET_RESOLVED = 'ASSET_RESOLVED';
export const ASSET_PREFERENCES_SAVED = 'ASSET_PREFERENCES_SAVED';
export const ASSET_DISCOVERY_SAVED = 'ASSET_DISCOVERY_SAVED';
export const ASSET_REMOVALS_SAVED = 'ASSET_REMOVALS_SAVED';
export const ASSET_REVIEWS_SAVED = 'ASSET_REVIEWS_SAVED';

const initialState = () => ({
  ready: false,
  loadError: false,
  networkKey: null,
  preferences: {},
  removed: {},
  // Found currencies the user has reviewed or dismissed on Home.
  reviewed: {},
  snapshots: {},
  resolved: {},
  revision: 0,
  persistedRevision: 0,
});

export const assetManagement = (state = initialState(), action) => {
  switch (action.type) {
    case AUTHENTICATE_USER:
    case UPDATE_SESSION_KEY:
    case SIGN_OUT:
    case SIGN_OUT_COMPLETE:
    case UPDATE_ACCOUNT_TESTNET_OVERRIDES_COMPLETE:
      return initialState();
    case SET_BALANCES: {
      const snapshot = action.payload?.assetDiscovery;
      const channel = action.payload?.channel;
      if (!snapshot || !channel) return state;
      if (JSON.stringify(state.snapshots[channel]) === JSON.stringify(snapshot)) return state;
      return {
        ...state,
        snapshots: {...state.snapshots, [channel]: snapshot},
        revision: state.revision + 1,
      };
    }
    case ASSETS_HYDRATED:
      return {
        ...state,
        ready: true,
        loadError: false,
        networkKey: action.payload.networkKey,
        preferences: action.payload.preferences || {},
        removed: action.payload.removed || {},
        reviewed: action.payload.reviewed || {},
        resolved: {...(action.payload.resolved || {}), ...state.resolved},
        snapshots: {...(action.payload.snapshots || {}), ...state.snapshots},
      };
    case ASSETS_HYDRATION_FAILED:
      return {...state, loadError: true};
    case ASSET_RESOLVED:
      return {
        ...state,
        resolved: {...state.resolved, [action.payload.key]: action.payload.result},
        revision: state.revision + 1,
      };
    case ASSET_PREFERENCES_SAVED:
      return {...state, preferences: action.payload.preferences};
    case ASSET_REMOVALS_SAVED:
      return {...state, removed: action.payload.removed};
    case ASSET_REVIEWS_SAVED:
      return {...state, reviewed: action.payload.reviewed};
    case ASSET_DISCOVERY_SAVED:
      return {...state, persistedRevision: action.payload.revision};
    default:
      return state;
  }
};

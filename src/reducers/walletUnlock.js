import {
  CANCEL_WALLET_UNLOCK,
  CLEAR_WALLET_UNLOCK,
  REQUEST_WALLET_UNLOCK,
  RESOLVE_WALLET_UNLOCK,
} from '../utils/constants/storeType';

const initialState = {
  visible: false,
  requestId: null,
  reason: null,
  title: null,
  requestLabel: null,
  accountHashes: null,
  preferredAccountHash: null,
  loadingTitle: null,
  loadingSubtitle: null,
  networkLabel: null,
};

export const walletUnlock = (state = initialState, action) => {
  switch (action.type) {
    case REQUEST_WALLET_UNLOCK:
      return {
        ...initialState,
        ...action.payload,
        visible: true,
      };
    case CANCEL_WALLET_UNLOCK:
    case RESOLVE_WALLET_UNLOCK:
    case CLEAR_WALLET_UNLOCK:
      if (
        action.payload &&
        action.payload.requestId &&
        state.requestId !== action.payload.requestId
      ) {
        return state;
      }

      return initialState;
    default:
      return state;
  }
};

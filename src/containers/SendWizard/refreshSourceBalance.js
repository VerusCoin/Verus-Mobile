import Store from '../../store';
import {expireCoinData} from '../../actions/actionCreators';
import {updateBalances} from '../../actions/actions/wallet/dispatchers/UpdateBalances';
import {
  captureSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../actions/actions/updates/sessionRequests';
import {API_GET_BALANCES, VRPC} from '../../utils/constants/intervalConstants';
import VrpcProvider from '../../utils/vrpc/vrpcInterface';

export const refreshSourceBalance = async (coin, channel, accountHash) => {
  const state = Store.getState();
  const scope = captureSessionScope(state, accountHash);
  if (!sessionScopeIsCurrent(state, scope)) return;

  try {
    if (channel.split('.')[0] === VRPC) {
      VrpcProvider.expireAddressResponses(channel.split('.')[2]);
    }
    Store.dispatch(scopeSessionAction(expireCoinData(coin.id, API_GET_BALANCES), scope));
    // Start a new channel request even if a pre-broadcast poll is still busy.
    // updateBalances supplies the existing session/request guards and actions.
    await updateBalances(state, Store.dispatch, [channel], coin.id);
  } catch (_) {
    // Broadcast already succeeded. Keep the balance expired for a later retry.
    // Refresh failure must not turn a sent transaction into a send error.
  }
};

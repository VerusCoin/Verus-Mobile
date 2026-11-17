import {call, put, select, takeEvery} from 'redux-saga/effects';
import {setCardStackPreferences} from '../actions/actionCreators';
import {shouldRejectSessionAction} from '../reducers/sessionScope';
import {
  SET_COIN_SUB_WALLET,
  TOGGLE_COIN_CARD_PIN,
} from '../utils/constants/storeType';
import {
  selectCardStackCard,
  toggleCardStackPin,
} from '../utils/subwallet/cardStackPreferences';
import {saveCardStackPreferences} from '../utils/subwallet/cardStackSettings';

function* recordCardChoice(action) {
  const state = yield select();
  if (shouldRejectSessionAction(state, action)) return;
  const accountHash = state.authentication.activeAccount?.accountHash;
  const {chainTicker, subWallet, cardId, compact} = action.payload;
  if (!accountHash || !chainTicker) return;
  const cards = state.coinMenus.allSubWallets[chainTicker] || [];
  const previous =
    state.settings.generalWalletSettings.cardStackPreferencesByAccount?.[
      accountHash
    ]?.[chainTicker] || {};
  let preferences;
  if (action.type === SET_COIN_SUB_WALLET) {
    // Null is a chooser/navigation state, not a new saved front card.
    if (!cards.some(card => card.id === subWallet?.id)) return;
    preferences = selectCardStackCard(previous, cards, subWallet.id);
  } else {
    const result = toggleCardStackPin({
      preferences: previous,
      cards,
      selectedId: state.coinMenus.activeSubWallets[chainTicker]?.id,
      cardId,
      compact,
    });
    if (result.result === 'limit' || result.result === 'unavailable') return;
    preferences = result.preferences;
  }
  const changed = JSON.stringify(previous) !== JSON.stringify(preferences);
  if (changed) {
    yield put(setCardStackPreferences(accountHash, chainTicker, preferences));
  }
  yield call(saveCardStackPreferences, changed);
}

export default function* cardStackSaga() {
  yield takeEvery([SET_COIN_SUB_WALLET, TOGGLE_COIN_CARD_PIN], recordCardChoice);
}

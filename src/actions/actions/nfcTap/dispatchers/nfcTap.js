import store from '../../../../store';
import {
  CLOSE_NFC_TAP,
  SET_NFC_TAP,
} from '../../../../utils/constants/storeType';

// Shows one step on the NFC tap screen: {phase, title, detail, actions}.
export const showNfcTap = ({phase, title, detail = null, actions = []}) => {
  store.dispatch({
    type: SET_NFC_TAP,
    payload: {phase, title, detail, actions},
  });
};

export const closeNfcTap = () => {
  store.dispatch({type: CLOSE_NFC_TAP});
};

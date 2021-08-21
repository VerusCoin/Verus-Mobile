import store from "../../../../store"
import {
  SEND_MODAL,
  SEND_MODAL_CRYPTO_AMOUNT_FIELD,
  SEND_MODAL_MEMO_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
  TRADITIONAL_CRYPTO_SEND_MODAL,
} from "../../../../utils/constants/sendModal";
import {
  CLOSE_SEND_COIN_MODAL,
  OPEN_SEND_COIN_MODAL,
  SET_SEND_COIN_MODAL_DATA_FIELD,
  SET_SEND_COIN_MODAL_VISIBLE,
} from "../../../../utils/constants/storeType";

export const openSendModal = (title, coinObj, subWallet, data, type, helpText) => {
  store.dispatch({
    type: OPEN_SEND_COIN_MODAL,
    payload: {
      title,
      coinObj,
      subWallet,
      data,
      type,
      helpText
    }
  })
}

export const openTraditionalCryptoSendModal = (coinObj, subWallet, data) => {
  openSendModal(
    `Send ${coinObj.id}`,
    coinObj,
    subWallet,
    data == null ? {
      [SEND_MODAL_TO_ADDRESS_FIELD]: "",
      [SEND_MODAL_CRYPTO_AMOUNT_FIELD]: "",
      [SEND_MODAL_MEMO_FIELD]: "",
    } : data,
    TRADITIONAL_CRYPTO_SEND_MODAL,
    'To send cryptocurrency, enter a recipients address in the address field, enter an amount to send, and press "send". You will be shown your transaction details before they are sent so you can confirm them.'
  );
};

export const getAndOpenSendModal = (coinObj, subWallet, data) => {
  switch (subWallet.modals[SEND_MODAL]) {
    case TRADITIONAL_CRYPTO_SEND_MODAL:
      return openTraditionalCryptoSendModal(coinObj, subWallet, data);
    default:
      return;
  }
}

export const closeSendModal = () => {
  store.dispatch({
    type: CLOSE_SEND_COIN_MODAL,
  })
}

export const setSendModalDataField = (key, value) => {
  store.dispatch({
    type: SET_SEND_COIN_MODAL_DATA_FIELD,
    payload: { key, value }
  })
}

export const setSendModalVisible = (visible) => {
  store.dispatch({
    type: SET_SEND_COIN_MODAL_VISIBLE,
    payload: { visible }
  })
}
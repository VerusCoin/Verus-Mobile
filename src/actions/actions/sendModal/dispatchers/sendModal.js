import store from '../../../../store';
import { coinsList } from '../../../../utils/CoinData/CoinsList';
import {
  CONVERSION_SEND_MODAL,
  WITHDRAW_SEND_MODAL,
  SEND_MODAL,
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_FROM_CURRENCY_FIELD,
  SEND_MODAL_MEMO_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
  SEND_MODAL_TO_CURRENCY_FIELD,
  TRADITIONAL_CRYPTO_SEND_MODAL,
  SEND_MODAL_DESTINATION_FIELD,
  DEPOSIT_SEND_MODAL,
  SEND_MODAL_SOURCE_FIELD,
  SEND_MODAL_IDENTITY_TO_LINK_FIELD,
  LINK_IDENTITY_SEND_MODAL,
  SEND_MODAL_USER_TO_AUTHENTICATE,
  AUTHENTICATE_USER_SEND_MODAL,
  PROVISION_IDENTITY_SEND_MODAL,
  SEND_MODAL_IDENTITY_TO_PROVISION_FIELD,
  SEND_MODAL_USER_ALLOWLIST,
  SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD,
  ADD_PBAAS_CURRENCY_MODAL,
  CONVERT_OR_CROSS_CHAIN_SEND_MODAL,
  SEND_MODAL_CONVERTTO_FIELD,
  SEND_MODAL_EXPORTTO_FIELD,
  SEND_MODAL_VIA_FIELD,
  SEND_MODAL_IS_PRECONVERT,
  SEND_MODAL_SHOW_CONVERTTO_FIELD,
  SEND_MODAL_SHOW_EXPORTTO_FIELD,
  SEND_MODAL_SHOW_VIA_FIELD,
  SEND_MODAL_PRICE_ESTIMATE,
  SEND_MODAL_ADVANCED_FORM,
  SEND_MODAL_CONTRACT_ADDRESS_FIELD,
  ADD_ERC20_TOKEN_MODAL,
  SEND_MODAL_SHOW_MAPPING_FIELD,
  SEND_MODAL_PBAAS_CURRENCY_PASSTHROUGH,
  SEND_MODAL_SHOW_IS_PRECONVERT,
  SEND_MODAL_DISABLED_INPUTS,
  SEND_MODAL_IDENTITY_TO_REVOKE_FIELD,
  REVOKE_IDENTITY_SEND_MODAL,
  SEND_MODAL_SYSTEM_ID,
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  RECOVER_IDENTITY_SEND_MODAL
} from '../../../../utils/constants/sendModal';
import {
  CLOSE_SEND_COIN_MODAL,
  OPEN_SEND_COIN_MODAL,
  SET_SEND_COIN_MODAL_DATA_FIELD,
  SET_SEND_COIN_MODAL_VISIBLE,
} from '../../../../utils/constants/storeType';

export const openSendModal = (
  title,
  coinObj,
  subWallet,
  data,
  type,
  helpText,
  initialRouteName
) => {
  store.dispatch({
    type: OPEN_SEND_COIN_MODAL,
    payload: {
      title,
      coinObj,
      subWallet: subWallet,
      data,
      type,
      helpText,
      initialRouteName
    },
  });
};

export const openTraditionalCryptoSendModal = (coinObj, subWallet, data) => {
  openSendModal(
    `Send ${coinObj.display_ticker}`,
    coinObj,
    subWallet,
    data == null
      ? {
          [SEND_MODAL_TO_ADDRESS_FIELD]: '',
          [SEND_MODAL_AMOUNT_FIELD]: '',
          [SEND_MODAL_MEMO_FIELD]: '',
        }
      : data,
    TRADITIONAL_CRYPTO_SEND_MODAL,
    'To send cryptocurrency, enter a recipients address in the address field, enter an amount to send, and press "send". You will be shown your transaction details before they are sent so you can confirm them.',
  );
};

export const openConvertOrCrossChainSendModal = (coinObj, subWallet, data) => {
  openSendModal(
    `Send ${coinObj.display_ticker}`,
    coinObj,
    subWallet,
    data == null
      ? {
          [SEND_MODAL_TO_ADDRESS_FIELD]: '',
          [SEND_MODAL_AMOUNT_FIELD]: '',
          [SEND_MODAL_MEMO_FIELD]: '',
          [SEND_MODAL_CONVERTTO_FIELD]: '',
          [SEND_MODAL_EXPORTTO_FIELD]: '',
          [SEND_MODAL_VIA_FIELD]: '',
          [SEND_MODAL_PRICE_ESTIMATE]: null,
          [SEND_MODAL_IS_PRECONVERT]: false,
          [SEND_MODAL_SHOW_CONVERTTO_FIELD]: true,
          [SEND_MODAL_SHOW_EXPORTTO_FIELD]: true,
          [SEND_MODAL_SHOW_VIA_FIELD]: true,
          [SEND_MODAL_SHOW_MAPPING_FIELD]: coinObj.proto === 'eth' || coinObj.proto === 'erc20',
          [SEND_MODAL_ADVANCED_FORM]: false,
          [SEND_MODAL_SHOW_IS_PRECONVERT]: false,
          [SEND_MODAL_DISABLED_INPUTS]: {}
        }
      : data,
    CONVERT_OR_CROSS_CHAIN_SEND_MODAL,
    'To convert your funds to a different currency, or send them to a different network, fill in the corresponding fields. Conversions and cross-chain transactions may take a few minutes to complete, even once your funds are confirmed as sent.',
  );
};

export const openLinkIdentityModal = (coinObj, data) => {
  openSendModal(
    `Link VerusID`,
    coinObj,
    null,
    data == null
      ? {
          [SEND_MODAL_IDENTITY_TO_LINK_FIELD]: '',
        }
      : data,
    LINK_IDENTITY_SEND_MODAL,
    'To link a VerusID with your wallet, enter the handle or i-Address of a VerusID with a primary address that you have in your wallet.',
  );
};

export const openRevokeIdentitySendModal = (data) => {
  openSendModal(
    `Revoke VerusID`,
    null,
    null,
    data == null
      ? {
          [SEND_MODAL_IDENTITY_TO_REVOKE_FIELD]: '',
          [SEND_MODAL_SYSTEM_ID]: coinsList.VRSC.system_id,
          [SEND_MODAL_ENCRYPTED_IDENTITY_SEED]: ''
        }
      : data,
    REVOKE_IDENTITY_SEND_MODAL,
    'To revoke a VerusID, enter the handle or i-Address of a VerusID with a revocation VerusID that you control.',
  );
};

export const openRecoverIdentitySendModal = (data) => {
  openSendModal(
    `Recover VerusID`,
    null,
    null,
    data == null
      ? {
          [SEND_MODAL_IDENTITY_TO_REVOKE_FIELD]: '',
          [SEND_MODAL_SYSTEM_ID]: coinsList.VRSC.system_id,
          [SEND_MODAL_ENCRYPTED_IDENTITY_SEED]: ''
        }
      : data,
    RECOVER_IDENTITY_SEND_MODAL,
    'To recover a VerusID, enter the new primary address you would like your VerusID to use.',
  );
};

export const openAddPbaasCurrencyModal = (coinObj, data) => {
  openSendModal(
    `Add Currency`,
    coinObj,
    null,
    data == null
      ? {
          [SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD]: '',
          [SEND_MODAL_PBAAS_CURRENCY_PASSTHROUGH]: false
        }
      : data,
    ADD_PBAAS_CURRENCY_MODAL,
    'To add a Public Blockchains as a Service (PBaaS) currency to your wallet, enter its name or i-Address here and press continue.',
  );
};

export const openAddErc20TokenModal = (coinObj, data) => {
  openSendModal(
    `Add ERC20 Token`,
    coinObj,
    null,
    data == null
      ? {
          [SEND_MODAL_CONTRACT_ADDRESS_FIELD]: '',
        }
      : data,
    ADD_ERC20_TOKEN_MODAL,
    'To add an ERC20 token to your wallet, enter its contract address here and press continue.',
  );
};

export const openProvisionIdentityModal = (coinObj, req, fromService = null) => {
  openSendModal(
    `Request VerusID`,
    coinObj,
    null,
    {
      request: req,
      fromService,
      [SEND_MODAL_IDENTITY_TO_PROVISION_FIELD]: ''
    },
    PROVISION_IDENTITY_SEND_MODAL,
    'This login request allows you to request a new identity to login with, enter a name and press continue to begin.',
  );
};

export const openAuthenticateUserModal = (data, initialRouteName) => {
  openSendModal(
    `Login`,
    null,
    null,
    data == null
      ? {
          [SEND_MODAL_USER_TO_AUTHENTICATE]: null,
          [SEND_MODAL_USER_ALLOWLIST]: null
        }
      : data,
    AUTHENTICATE_USER_SEND_MODAL,
    'To login, select a user profile, then enter your password.',
    initialRouteName
  );
};

export const openConversionSendModal = (coinObj, subWallet, data) => {
  openSendModal(
    `Convert Currency`,
    coinObj,
    subWallet,
    data == null
      ? {
          //[SEND_MODAL_TO_ADDRESS_FIELD]: "",
          [SEND_MODAL_AMOUNT_FIELD]: '',
          [SEND_MODAL_FROM_CURRENCY_FIELD]: null,
          [SEND_MODAL_TO_CURRENCY_FIELD]: null,
        }
      : data,
    CONVERSION_SEND_MODAL,
    'To convert cryptocurrency, select a source and destination currency, enter an amount to convert, and press "convert". All rates shown on the form page are estimations.',
  );
};

export const openWithdrawSendModal = (coinObj, subWallet, data) => {
  openSendModal(
    `Withdraw ${coinObj.display_ticker}`,
    coinObj,
    subWallet,
    data == null
      ? {
          [SEND_MODAL_AMOUNT_FIELD]: '',
          [SEND_MODAL_DESTINATION_FIELD]: {},
          [SEND_MODAL_TO_CURRENCY_FIELD]: {},
        }
      : data,
    WITHDRAW_SEND_MODAL,
    'Select a bank account and enter an amount to withdraw from your wallet.',
  );
};

export const openDepositSendModal = (coinObj, subWallet, data) => {
  openSendModal(
    `Deposit ${coinObj.display_ticker}`,
    coinObj,
    subWallet,
    data == null
      ? {
          [SEND_MODAL_AMOUNT_FIELD]: '',
          [SEND_MODAL_SOURCE_FIELD]: {},
          [SEND_MODAL_TO_CURRENCY_FIELD]: {},
        }
      : data,
    DEPOSIT_SEND_MODAL,
    'Select a bank account and enter an amount to deposit into your wallet.',
  );
};

export const openSubwalletSendModal = (coinObj, subWallet, data) => {
  switch (subWallet.modals[SEND_MODAL]) {
    case TRADITIONAL_CRYPTO_SEND_MODAL:
      return openTraditionalCryptoSendModal(coinObj, subWallet, data);
    default:
      return;
  }
};

export const closeSendModal = () => {
  store.dispatch({
    type: CLOSE_SEND_COIN_MODAL,
  });
};

export const setSendModalDataField = (key, value) => {
  store.dispatch({
    type: SET_SEND_COIN_MODAL_DATA_FIELD,
    payload: {key, value},
  });
};

export const setSendModalVisible = visible => {
  store.dispatch({
    type: SET_SEND_COIN_MODAL_VISIBLE,
    payload: {visible},
  });
};

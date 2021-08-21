import Colors from "../globals/colors";
import {
  API_GET_ADDRESSES,
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_INFO,
  API_GET_KEYS,
  API_GET_TRANSACTIONS,
  API_SEND,
  DLIGHT_PRIVATE,
  ELECTRUM,
  GENERAL,
  WYRE_SERVICE,
} from "./constants/intervalConstants";
import { SEND_MODAL, TRADITIONAL_CRYPTO_SEND_MODAL } from "./constants/sendModal";
import { dlightEnabled, wyreCoinChannelEnabled } from "./enabledChannels";

// export const API_GET_ADDRESSES = "get_addresses"
// export const API_GET_BALANCES = "get_balances"
// export const API_GET_INFO = "get_info"
// export const API_GET_TRANSACTIONS = "get_transactions"
// export const API_GET_FIATPRICE = "get_fiatprice"

const getMainSubwallet = (dominantChannel = ELECTRUM) => {
  return {
    channel: dominantChannel,
    api_channels: {
      [API_GET_BALANCES]: dominantChannel,
      [API_GET_INFO]: dominantChannel,
      [API_GET_ADDRESSES]: dominantChannel,
      [API_GET_TRANSACTIONS]: dominantChannel,
      [API_GET_FIATPRICE]: GENERAL,
      [API_SEND]: dominantChannel,
      [API_GET_KEYS]: dominantChannel
    },
    modals: {
      [SEND_MODAL]: TRADITIONAL_CRYPTO_SEND_MODAL
    },
    id: "MAIN_WALLET",
    params: {},
    color: Colors.primaryColor
  }
}

const PRIVATE_SUBWALLET = {
  channel: DLIGHT_PRIVATE,
  api_channels: {
    [API_GET_BALANCES]: DLIGHT_PRIVATE,
    [API_GET_INFO]: DLIGHT_PRIVATE,
    [API_GET_ADDRESSES]: DLIGHT_PRIVATE,
    [API_GET_TRANSACTIONS]: DLIGHT_PRIVATE,
    [API_GET_FIATPRICE]: GENERAL,
    [API_SEND]: DLIGHT_PRIVATE,
    [API_GET_KEYS]: DLIGHT_PRIVATE
  },
  modals: {
    [SEND_MODAL]: TRADITIONAL_CRYPTO_SEND_MODAL
  },
  id: "PRIVATE_WALLET",
  params: {},
  color: Colors.quinaryColor
}

const WYRE_ACCOUNT_SUBWALLET = {
  channel: WYRE_SERVICE,
  api_channels: {
    [API_GET_TRANSACTIONS]: WYRE_SERVICE,
    [API_GET_BALANCES]: WYRE_SERVICE,
    // [API_GET_INFO]: WYRE_SERVICE,
    // [API_GET_ADDRESSES]: WYRE_SERVICE,
    // [API_GET_FIATPRICE]: GENERAL,
    // [API_SEND]: WYRE_SERVICE,
    // [API_GET_KEYS]: WYRE_SERVICE
  },
  modals: {
    [SEND_MODAL]: TRADITIONAL_CRYPTO_SEND_MODAL
  },
  id: "WYRE_ACCOUNT_WALLET",
  params: {},
  color: Colors.verusGreenColor
}

export const getDefaultSubWallets = (coinObj) => {
  const MAIN_WALLET = getMainSubwallet(coinObj.dominant_channel)

  const SUBWALLET_CONDITIONS = [
    {
      met: () => true,
      subwallet: MAIN_WALLET,
    },
    {
      met: () => coinObj.compatible_channels.includes(DLIGHT_PRIVATE) && dlightEnabled(),
      subwallet: PRIVATE_SUBWALLET,
    },
    {
      met: () =>
        coinObj.compatible_channels.includes(WYRE_SERVICE) && wyreCoinChannelEnabled(),
      subwallet: WYRE_ACCOUNT_SUBWALLET,
    },
  ];

  let subwallets = []

  for (const condition of SUBWALLET_CONDITIONS) {
    if (condition.met()) subwallets.push(condition.subwallet)
  }

  return subwallets
}
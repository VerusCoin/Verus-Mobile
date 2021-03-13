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
} from "./constants/intervalConstants";
import { dlightEnabled } from "./enabledChannels";

// export const API_GET_ADDRESSES = "get_addresses"
// export const API_GET_BALANCES = "get_balances"
// export const API_GET_INFO = "get_info"
// export const API_GET_TRANSACTIONS = "get_transactions"
// export const API_GET_FIATPRICE = "get_fiatprice"

export const ADDRESS_FORMATS = {
  ["MAIN_WALLET"]: '^[a-zA-Z0-9]{20,50}$',
  ["PRIVATE_WALLET"]: '^zs[a-zA-Z0-9]{65,85}$'
}

export const getDefaultSubWallets = (coinObj) => {
  const dominantChannel = coinObj.dominant_channel ? coinObj.dominant_channel : ELECTRUM

  return coinObj.compatible_channels.includes(DLIGHT_PRIVATE) && dlightEnabled() ? [{
    channel: coinObj.dominant_channel ? coinObj.dominant_channel : ELECTRUM,
    api_channels: {
      [API_GET_BALANCES]: dominantChannel,
      [API_GET_INFO]: dominantChannel,
      [API_GET_ADDRESSES]: dominantChannel,
      [API_GET_TRANSACTIONS]: dominantChannel,
      [API_GET_FIATPRICE]: GENERAL,
      [API_SEND]: dominantChannel,
      [API_GET_KEYS]: dominantChannel
    },
    id: "MAIN_WALLET",
    address_format: ADDRESS_FORMATS["MAIN_WALLET"],
    params: {},
    color: '#3165D4'
  },
  {
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
    address_format: ADDRESS_FORMATS["PRIVATE_WALLET"],
    id: "PRIVATE_WALLET",
    params: {},
    color: '#000000'
  }] : [{
    channel: coinObj.dominant_channel ? coinObj.dominant_channel : ELECTRUM,
    api_channels: {
      [API_GET_BALANCES]: dominantChannel,
      [API_GET_INFO]: dominantChannel,
      [API_GET_ADDRESSES]: dominantChannel,
      [API_GET_TRANSACTIONS]: dominantChannel,
      [API_GET_FIATPRICE]: GENERAL,
      [API_SEND]: dominantChannel,
      [API_GET_KEYS]: dominantChannel
    },
    address_format: ADDRESS_FORMATS["MAIN_WALLET"],
    id: "MAIN_WALLET",
    params: {},
    color: '#3165D4'
  }]
}
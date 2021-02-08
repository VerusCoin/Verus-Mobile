import {
  API_GET_ADDRESSES,
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_INFO,
  API_GET_TRANSACTIONS,
  DLIGHT_PRIVATE,
  ELECTRUM,
  GENERAL,
} from "./constants/intervalConstants";
import { ENABLE_DLIGHT } from '../../env/main.json'

// export const API_GET_ADDRESSES = "get_addresses"
// export const API_GET_BALANCES = "get_balances"
// export const API_GET_INFO = "get_info"
// export const API_GET_TRANSACTIONS = "get_transactions"
// export const API_GET_FIATPRICE = "get_fiatprice"

export const getDefaultSubWallets = (coinObj) => {
  const dominantChannel = coinObj.dominant_channel ? coinObj.dominant_channel : ELECTRUM

  return coinObj.compatible_channels.includes(DLIGHT_PRIVATE) && ENABLE_DLIGHT ? [{
    channel: coinObj.dominant_channel ? coinObj.dominant_channel : ELECTRUM,
    api_channels: {
      [API_GET_BALANCES]: dominantChannel,
      [API_GET_INFO]: dominantChannel,
      [API_GET_ADDRESSES]: dominantChannel,
      [API_GET_TRANSACTIONS]: dominantChannel,
      [API_GET_FIATPRICE]: GENERAL
    },
    id: "MAIN_WALLET",
    params: {},
    color: '#2E86AB'
  },
  {
    channel: DLIGHT_PRIVATE,
    api_channels: {
      [API_GET_BALANCES]: DLIGHT_PRIVATE,
      [API_GET_INFO]: DLIGHT_PRIVATE,
      [API_GET_ADDRESSES]: DLIGHT_PRIVATE,
      [API_GET_TRANSACTIONS]: DLIGHT_PRIVATE,
      [API_GET_FIATPRICE]: GENERAL
    },
    id: "PRIVATE_WALLET",
    params: {},
    color: '#EDAE49'
  }] : [{
    channel: coinObj.dominant_channel ? coinObj.dominant_channel : ELECTRUM,
    api_channels: {
      [API_GET_BALANCES]: dominantChannel,
      [API_GET_INFO]: dominantChannel,
      [API_GET_ADDRESSES]: dominantChannel,
      [API_GET_TRANSACTIONS]: dominantChannel,
      [API_GET_FIATPRICE]: GENERAL
    },
    id: "MAIN_WALLET",
    params: {},
    color: '#2E86AB'
  }]
}
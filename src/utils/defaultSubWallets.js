import Colors from "../globals/colors";
import {
  WALLET_APP_CONVERT,
  WALLET_APP_MANAGE,
  WALLET_APP_OVERVIEW,
  WALLET_APP_RECEIVE,
  WALLET_APP_SEND,
} from "./constants/apps";
import {
  API_CONVERT,
  API_GET_ADDRESSES,
  API_GET_BALANCES,
  API_GET_CONVERSION_PATHS,
  API_GET_DEPOSIT_SOURCES,
  API_GET_FIATPRICE,
  API_GET_INFO,
  API_GET_KEYS,
  API_GET_PENDING_DEPOSITS,
  API_GET_TRANSACTIONS,
  API_GET_WITHDRAW_DESTINATIONS,
  API_SEND,
  DLIGHT_PRIVATE,
  ELECTRUM,
  ERC20,
  ETH,
  GENERAL,
  WYRE_SERVICE,
} from "./constants/intervalConstants";
import { SEND_MODAL, TRADITIONAL_CRYPTO_SEND_MODAL } from "./constants/sendModal";
import { dlightEnabled, wyreCoinChannelEnabled } from "./enabledChannels";

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
      [API_GET_KEYS]: dominantChannel,
    },
    compatible_apps: [WALLET_APP_OVERVIEW, WALLET_APP_SEND, WALLET_APP_RECEIVE],
    modals: {
      [SEND_MODAL]: TRADITIONAL_CRYPTO_SEND_MODAL,
    },
    id: "MAIN_WALLET",
    params: {},
    color: Colors.primaryColor,
    address_info: [{ label: "Address" }]
  };
}

const getWyreSubwallet = (protocol) => {
  let compatible_apps = [
    WALLET_APP_OVERVIEW,
    WALLET_APP_SEND,
    WALLET_APP_RECEIVE,
    WALLET_APP_CONVERT,
  ];

  if (protocol == "fiat") compatible_apps.push(WALLET_APP_MANAGE);

  return {
    channel: WYRE_SERVICE,
    api_channels: {
      [API_GET_TRANSACTIONS]: WYRE_SERVICE,
      [API_GET_BALANCES]: WYRE_SERVICE,
      [API_CONVERT]: WYRE_SERVICE,
      [API_GET_CONVERSION_PATHS]: WYRE_SERVICE,
      [API_GET_WITHDRAW_DESTINATIONS]: WYRE_SERVICE,
      [API_GET_DEPOSIT_SOURCES]: WYRE_SERVICE,
      [API_GET_PENDING_DEPOSITS]: WYRE_SERVICE,
      // [API_GET_INFO]: WYRE_SERVICE,
      [API_GET_FIATPRICE]: WYRE_SERVICE,
      [API_SEND]: WYRE_SERVICE,
      [API_GET_ADDRESSES]: WYRE_SERVICE,
      // [API_GET_KEYS]: WYRE_SERVICE
    },
    compatible_apps,
    modals: {
      [SEND_MODAL]: TRADITIONAL_CRYPTO_SEND_MODAL,
    },
    id: 'WYRE_ACCOUNT_WALLET',
    params: {},
    color: Colors.verusGreenColor,
    address_info: [
      {label: 'Wyre Address'},
      {label: 'Blockchain Address'},
    ],
  };
};

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
  compatible_apps: [WALLET_APP_OVERVIEW, WALLET_APP_SEND, WALLET_APP_RECEIVE],
  modals: {
    [SEND_MODAL]: TRADITIONAL_CRYPTO_SEND_MODAL
  },
  id: "PRIVATE_WALLET",
  params: {},
  color: Colors.quinaryColor,
  address_info: [{ label: "Address" }]
}

export const getDefaultSubWallets = (coinObj) => {
  const MAIN_WALLET = getMainSubwallet(coinObj.dominant_channel)
  const WYRE_ACCOUNT_SUBWALLET = getWyreSubwallet(coinObj.proto)

  const SUBWALLET_CONDITIONS = [
    {
      met: () =>
        coinObj.compatible_channels.includes(ELECTRUM) ||
        coinObj.compatible_channels.includes(ETH) ||
        coinObj.compatible_channels.includes(ERC20),
      subwallet: MAIN_WALLET,
    },
    {
      met: () => coinObj.compatible_channels.includes(DLIGHT_PRIVATE) && dlightEnabled(),
      subwallet: PRIVATE_SUBWALLET,
    },
    {
      met: () => coinObj.compatible_channels.includes(WYRE_SERVICE) && wyreCoinChannelEnabled(),
      subwallet: WYRE_ACCOUNT_SUBWALLET,
    },
  ];

  let subwallets = []

  for (const condition of SUBWALLET_CONDITIONS) {
    if (condition.met()) subwallets.push(condition.subwallet)
  }

  return subwallets
}
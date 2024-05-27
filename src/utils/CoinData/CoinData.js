import { electrumServers } from './electrum/servers';
import Colors from '../../globals/colors'
import { coinsList } from './CoinsList'
import { DLIGHT_PRIVATE, ELECTRUM } from '../constants/intervalConstants';

import { ENABLE_VERUS_IDENTITIES } from '../../../env/index'

import CoinLogoIcons from '../../images/cryptologo/index'
import { getDefaultSubWallets } from '../defaultSubWallets';
import {
  WALLET_APP_CONVERT,
  WALLET_APP_OVERVIEW,
  WALLET_APP_RECEIVE,
  WALLET_APP_SEND,
  WALLET_APP_MANAGE
} from "../constants/apps";
import { CoinDirectory } from './CoinDirectory';

export const getDefaultApps = (coinObj) => {
  const coinName = coinObj.display_name
  let subwallets = getDefaultSubWallets(coinObj)

  let data = [
    {
      screen: "Overview",
      icon: "format-list-bulleted",
      name: "Overview",
      key: WALLET_APP_OVERVIEW,
      color: Colors.primaryColor,
      //Verus Blue
    },
    {
      screen: "SendCoin",
      icon: "arrow-up",
      name: "Send",
      key: WALLET_APP_SEND,
      color: Colors.infoButtonColor,
      //Orange
    },
    {
      screen: "ReceiveCoin",
      icon: "arrow-down",
      name: "Receive",
      key: WALLET_APP_RECEIVE,
      color: Colors.verusGreenColor,
      //Green
    },
    {
      screen: "ConvertCoin",
      icon: "swap-horizontal-circle",
      name: "Convert",
      key: WALLET_APP_CONVERT,
      color: Colors.primaryColor,
    },
    {
      screen: "ManageCoin",
      icon: "bank-transfer",
      name: "Manage",
      key: WALLET_APP_MANAGE,
      color: Colors.primaryColor
    }
  ];

  return {
    default_app: "wallet",
    apps: {
      wallet: {
        title: coinName + " Wallet",
        data: data.filter((app) => {
          for (const subwallet of subwallets) {
            if (subwallet.compatible_apps.includes(app.key)) return true;
          }

          return false;
        }),
      },
    },
  };
}

const identityApp = {
  identity: {
    title: 'Identity App',
    data: [
      {
        screen: 'Home',
        icon: 'account-balance-wallet',
        name: 'Identity',
        key: 'Home',
        color: Colors.primaryColor
        //Verus Blue
      },
      {
        screen: 'Home',
        icon: 'account-balance-wallet',
        name: 'Personal Information',
        key: 'Personal information',
        color: Colors.primaryColor
      },
    ]
  }
}

export const explorers = {
  KMD: 'https://kmdexplorer.io',
  OOT: 'https://explorer.utrum.io',
  VRSC: 'https://insight.verus.io/',
  VRSCTEST: 'https://testex.verus.io',
  ETH: 'https://etherscan.io',
  GETH: 'https://goerli.etherscan.io/',
  RFOX: 'https://etherscan.io',
  BAT: 'https://etherscan.io',
  DAI: 'https://etherscan.io',
  DAIW: 'https://etherscan.io',
  BAL: 'https://etherscan.io',
  BNT: 'https://etherscan.io',
  HOT: 'https://etherscan.io',
  LINK: 'https://etherscan.io',
  NEXO: 'https://etherscan.io',
  UNI: 'https://etherscan.io',
  VEN: 'https://etherscan.io',
  YFI: 'https://etherscan.io',
  ZRX: 'https://etherscan.io',
  TST: 'https://ropsten.etherscan.io',
  BTC: 'https://www.blockchain.com/btc',
  DOGE: 'https://dogeblocks.com/'
}

export const CoinLogos = {
  // btc protocol
  BCH: CoinLogoIcons.btc.BCH,
  VRSC: CoinLogoIcons.btc.VRSC,
  VRSCTEST: CoinLogoIcons.btc.VRSCTEST,
  DASH: CoinLogoIcons.btc.DASH,
  OOT: CoinLogoIcons.btc.OOT,
  BTC: CoinLogoIcons.btc.BTC,
  TESTNET: CoinLogoIcons.btc.BTC,
  DGB: CoinLogoIcons.btc.DGB,
  DOGE: CoinLogoIcons.btc.DOGE,
  KMD: CoinLogoIcons.btc.KMD,
  ZEC: CoinLogoIcons.btc.ZEC,
  ZECTEST: CoinLogoIcons.btc.ZECTEST,
  ZILLA: CoinLogoIcons.btc.ZILLA,
  LTC: CoinLogoIcons.btc.LTC,
  CCL: CoinLogoIcons.btc.CCL,

  // pbaas protocol
  ["iHax5qYQGbcMGqJKKrPorpzUBX2oFFXGnY"]: CoinLogoIcons.pbaas.PURE,
  ["i9kVWKU2VwARALpbXn4RS9zvrhvNRaUibb"]: CoinLogoIcons.pbaas.KAIJU,
  ["i3f7tSctFkiPpiedY8QR5Tep9p4qDVebDx"]: CoinLogoIcons.pbaas.BRIDGE_VETH,
  ["i4Xr5TAMrDTD99H69EemhjDxJ4ktNskUtc"]: CoinLogoIcons.pbaas.SWITCH,
  ["iGBs4DWztRNvNEJBt4mqHszLxfKTNHTkhM"]: CoinLogoIcons.web3.DAI, // DAI on Verus
  ["iCkKJuJScy4Z6NSDK7Mt42ZAB2NEnAE1o4"]: CoinLogoIcons.web3.MKR, // MKR on Verus
  ["i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X"]: CoinLogoIcons.web3.ETH, // ETH on Verus
  ["iS8TfRPfVpKo5FVfSUzfHBQxo9KuzpnqLU"]: CoinLogoIcons.web3.TBTC, // TBTC on Verus
  ["i61cV2uicKSi1rSMQCBNQeSYC3UAi9GVzd"]: CoinLogoIcons.web3.USDC, // USDC on Verus
  ["iC5TQFrFXSYLQGkiZ8FYmZHFJzaRF5CYgE"]: CoinLogoIcons.web3.EURC, // EURC on Verus
  ["iExBJfZYK7KREDpuhj6PzZBzqMAKaFg7d2"]: CoinLogoIcons.pbaas.VARRR,

  // web3 protocol
  BAT: CoinLogoIcons.web3.BAT,
  TST: CoinLogoIcons.web3.ETH,
  DAI: CoinLogoIcons.web3.DAI,
  DAIWYRE: CoinLogoIcons.web3.DAI,
  ETH: CoinLogoIcons.web3.ETH,
  GETH: CoinLogoIcons.web3.ETH,
  BAL: CoinLogoIcons.web3.BAL,
  BNT: CoinLogoIcons.web3.BNT,
  HOT: CoinLogoIcons.web3.HOT,
  LINK: CoinLogoIcons.web3.LINK,
  NEXO: CoinLogoIcons.web3.NEXO,
  UNI: CoinLogoIcons.web3.UNI,
  VEN: CoinLogoIcons.web3.VEN,
  YFI: CoinLogoIcons.web3.YFI,
  ZRX: CoinLogoIcons.web3.ZRX,
  RFOX: CoinLogoIcons.web3.RFOX,
  USDT: CoinLogoIcons.web3.USDT,
  USDC: CoinLogoIcons.web3.USDC,
  USDTWYRE: CoinLogoIcons.web3.USDT,
  USDCWYRE: CoinLogoIcons.web3.USDC,
  AAVE: CoinLogoIcons.web3.AAVE,
  CRV: CoinLogoIcons.web3.CRV,
  SUSHI: CoinLogoIcons.web3.SUSHI,
  MKR: CoinLogoIcons.web3.MKR,
  WBTC: CoinLogoIcons.web3.WBTC,
  ["0xBc2738BA63882891094C99E59a02141Ca1A1C36a"]: CoinLogoIcons.btc.VRSC, // VRSC on Ethereum
  ["0x18084fbA666a33d37592fA2633fD49a74DD93a88"]: CoinLogoIcons.web3.TBTC, // TBTC
  ["0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c"]: CoinLogoIcons.web3.EURC, // EURC
  ["0xE6052Dcc60573561ECef2D9A4C0FEA6d3aC5B9A2"]: CoinLogoIcons.pbaas.BRIDGE_VETH, // BRIDGE.VETH on Ethereum

  // fiat "protocol"
  USD: CoinLogoIcons.fiat.USD,
  AUD: CoinLogoIcons.fiat.AUD,
  EUR: CoinLogoIcons.fiat.EUR,
  CHF: CoinLogoIcons.fiat.CHF,
  MXN: CoinLogoIcons.fiat.MXN,
  CLP: CoinLogoIcons.fiat.CLP,
  ZAR: CoinLogoIcons.fiat.ZAR,
  VND: CoinLogoIcons.fiat.VND,
  ILS: CoinLogoIcons.fiat.ILS,
  HKD: CoinLogoIcons.fiat.HKD,
  DKK: CoinLogoIcons.fiat.DKK,
  CAD: CoinLogoIcons.fiat.CAD,
  MYR: CoinLogoIcons.fiat.MYR,
  NOK: CoinLogoIcons.fiat.NOK,
  CZK: CoinLogoIcons.fiat.CZK,
  SEK: CoinLogoIcons.fiat.SEK,
  ARS: CoinLogoIcons.fiat.ARS,
  INR: CoinLogoIcons.fiat.INR,
  THB: CoinLogoIcons.fiat.THB,
  KRW: CoinLogoIcons.fiat.KRW,
  JPY: CoinLogoIcons.fiat.JPY,
  PLN: CoinLogoIcons.fiat.PLN,
  GBP: CoinLogoIcons.fiat.GBP,
  PHP: CoinLogoIcons.fiat.PHP,
  ISK: CoinLogoIcons.fiat.ISK,
  COP: CoinLogoIcons.fiat.COP,
  SGD: CoinLogoIcons.fiat.SGD,
  NZD: CoinLogoIcons.fiat.NZD,
  BRL: CoinLogoIcons.fiat.BRL,
};

export const getCoinFromActiveCoins = (coinTicker, activeCoinsForUser) => {
  let index = 0;

  while (
    index < activeCoinsForUser.length &&
    activeCoinsForUser[index].id !== coinTicker
  ) {
    index++;
  }

  if (index < activeCoinsForUser.length) {
    return activeCoinsForUser[index];
  } else {
    return false;
  }
};

export const findCurrencyByImportId = (importObj) => {
  return CoinDirectory.findCoinObj(importObj.currency_id);
}

export const getSystemNameFromSystemId = (systemId) => {
  switch (systemId) {
    case "i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV":
      return "VRSC"
    case "iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq":
      return "VRSCTEST"
    default:
      throw new Error("Could not find coin for system id " + systemId)
  }
}

export const getVerusIdCurrency = (coinObj) => {
  return coinObj.testnet ? "VRSCTEST" : "VRSC";
}

export const findCoinObj = (key, userName, useSystemId = false) => {
  const id = useSystemId ? getSystemNameFromSystemId(key) : key;
  let coinObj = coinsList[id]

  if (coinObj) {
    coinObj.electrum_endpoints = coinObj.compatible_channels.includes(ELECTRUM) ? electrumServers[id.toLowerCase()].serverList : []
    coinObj.users = userName != null ? [userName] : [];
    
    if (!coinObj.compatible_channels.includes(DLIGHT_PRIVATE)) {
      coinObj.overrideCoinSettings = {
        privateAddrs: 0
      }
    }
    
    if (!coinObj.apps || Object.keys(coinObj.apps).length === 0) {
      const DEFAULT_APPS = getDefaultApps(coinObj)
      
      if (
        ENABLE_VERUS_IDENTITIES &&
        (coinObj.id === 'VRSC' ||
          coinObj.id === 'VRSCTEST' ||
          coinObj.id === 'ZECTEST')
      ) {
        coinObj.apps = {...identityApp, ...DEFAULT_APPS.apps};
      } else {
        coinObj.apps = DEFAULT_APPS.apps;
      }

      if (!coinObj.default_app) coinObj.default_app = DEFAULT_APPS.default_app
    } else if (!coinObj.default_app) {
      coinObj.default_app = Object.keys(coinObj.apps)[0]
    }
  }
  else {
    throw new Error(id + " not found in coin list!")
  }

  return coinObj;
}

export const getCoinObj = (coinList, coinId) => {
  return coinList.find(coinObj => {
    return coinObj.id === coinId
  })
}

export const getCoinLogo = (id, proto, theme = 'light') => {
  const _id = id === coinsList.VRSC.currency_id ? "VRSC" : id === coinsList.VRSCTEST.currency_id ? "VRSCTEST" : id;

  if (CoinLogos[_id]) return CoinLogos[_id][theme]
  else if (proto === 'erc20') return CoinLogos.ETH[theme]
  else return CoinLogoIcons.pbaas.RenderPbaasCurrencyLogo(_id)[theme]
}

export const getNetworkTxVersion = (networkId) => {
  const versions = {
    "DEFAULT": 4,
    "DASH": 1,
    "DASHTEST": 1,
    "BCH": 1,
    "BITCOINCASHTESTNET": 1,
    "ZEC": 4,
    "ZCASHTEST": 4,
    "VRSC": 4,
    "BTG": 1,
    "BTC": 1,
    "TESTNET": 1,
    "LTC": 1,
    "KMD": 4,
    "OOT": 2,
    "ZILLA": 2
  }

  if (versions.hasOwnProperty(networkId)) {
    return versions[networkId]
  } else return 1;
}
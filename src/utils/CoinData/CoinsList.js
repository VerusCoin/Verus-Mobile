import { DLIGHT, ELECTRUM, GENERAL, IS_VERUS, IS_ZCASH, IS_PBAAS, IS_PBAAS_ROOT } from "../constants/intervalConstants";
import { dlightServers } from 'agama-wallet-lib/src/dlight-servers';

export const coinsList = {
  vrsc: {
    id: "VRSC",
    name: "Verus Coin",
    description:
      "Verus Coin includes the first proven 51% hash attack resistant proof of power algorithm. The Verus vision is PBaaS, public blockchains as a service, provisioned for conditional rewards by Verus miners and stakers.",
    fee: 10000,
    compatible_channels: [DLIGHT, ELECTRUM, GENERAL],
    tags: [IS_VERUS, IS_ZCASH, IS_PBAAS, IS_PBAAS_ROOT],
    proto: 'vrsc',
    dlightEndpoints: dlightServers.vrsc
  },
  kmd: {
    id: "KMD",
    name: "Komodo",
    description:
      "Komodo is an open, modular, multi-chain platform that provides an autonomous, customizable blockchain to every project that builds within the ecosystem.",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc'
  },
  btc: {
    id: "BTC",
    name: "Bitcoin",
    description:
      "The coin that started it all. Bitcoin (BTC) is a peer to peer digital currency created in 2009 by Satoshi Nakamoto.",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc'
  },
  oot: {
    id: "OOT",
    name: "Utrum",
    description:
      "A reward platform for crypto analysis, reviews and predictions",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc'
  },
  ccl: {
    id: "CCL",
    name: "CoinCollect",
    description: "",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc'
  },
  doge: {
    id: "DOGE",
    name: "Dogecoin",
    description: "",
    fee: 100000000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc'
  },
  dgb: {
    id: "DGB",
    name: "Digibyte",
    description: "",
    fee: 100000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc'
  },
  bch: {
    id: "BCH",
    name: "Bitcoin Cash",
    description: "",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc'
  },
  zec: {
    id: "ZEC",
    name: "ZCash",
    description: "",
    fee: 10000,
    compatible_channels: [DLIGHT, ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc',
    dlightEndpoints: dlightServers.zec
  },
  zectest: {
    id: "ZECTEST",
    name: "ZCash Testnet",
    description: "",
    fee: 10000,
    compatible_channels: [DLIGHT, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc',
    dlightEndpoints: dlightServers.zectest
  },
  dash: {
    id: "DASH",
    name: "Dash",
    description: "",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc'
  },
  ltc: {
    id: "LTC",
    name: "Litecoin",
    description: "",
    fee: 30000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc'
  },
  zilla: {
    id: "ZILLA",
    name: "ChainZilla",
    description:
      "The native token of Chainzilla Blockchain Solutions. They are a blockchain consulting company that develops easy to use whitelabel blockchain wallets and applications.",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc'
  }
};
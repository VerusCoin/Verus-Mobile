import {
  DLIGHT,
  ELECTRUM,
  GENERAL,
  IS_VERUS,
  IS_ZCASH,
  IS_PBAAS,
  IS_PBAAS_ROOT,
  ETH,
  ERC20,
} from "../constants/intervalConstants";
import { dlightServers } from 'agama-wallet-lib/src/dlight-servers';
import { ETHERS } from "../constants/web3Constants";

export const coinsList = {
  vrsc: {
    id: "VRSC",
    currency_id: '',
    system_id: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
    display_ticker: 'VRSC',
    display_name: "Verus Coin",
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
    display_name: "Komodo",
    currency_id: '.kmd',
    system_id: '',
    display_ticker: 'KMD',
    description:
      "Komodo is an open, modular, multi-chain platform that provides an autonomous, customizable blockchain to every project that builds within the ecosystem.",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc'
  },
  btc: {
    id: "BTC",
    currency_id: '.btc',
    system_id: '',
    display_ticker: 'BTC',
    display_name: "Bitcoin",
    description:
      "The coin that started it all. Bitcoin (BTC) is a peer to peer digital currency created in 2009 by Satoshi Nakamoto.",
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc'
  },
  eth: {
    id: "ETH",
    currency_id: '',
    system_id: '.eth',
    display_ticker: 'ETH',
    display_name: "Ethereum",
    description: "Ethereum is a global, open-source platform for decentralized applications.",
    compatible_channels: [ETH, GENERAL],
    dominant_channel: ETH,
    tags: [],
    proto: 'eth',
    decimals: ETHERS
  },
  bat: {
    id: "BAT",
    currency_id: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
    system_id: '.eth',
    display_ticker: 'BAT',
    display_name: "Basic Attention Token",
    description: "A decentralized, transparent digital ad exchange based on Ethereum Blockchain.",
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20'
  },
  tst: {
    id: "TST",
    currency_id: '0x722dd3F80BAC40c951b51BdD28Dd19d435762180',
    system_id: '.eth',
    display_ticker: 'TST',
    display_name: "ERC20 Test Token",
    description: "A test token for testing the ERC20 protocol.",
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20'
  },
  dai: {
    id: "DAI",
    currency_id: '0x6b175474e89094c44da98b954eedeac495271d0f',
    system_id: '.eth',
    display_ticker: 'TST',
    display_name: "Dai",
    description: "Dai is a stable, decentralized currency that does not discriminate. Any individual or business can realize the advantages of digital money.",
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20'
  },
  oot: {
    id: "OOT",
    currency_id: '.oot',
    system_id: '.kmd',
    display_ticker: 'OOT',
    display_name: "Utrum",
    description:
      "A reward platform for crypto analysis, reviews and predictions",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc'
  },
  ccl: {
    id: "CCL",
    currency_id: '.ccl',
    system_id: '',
    display_ticker: 'CCL',
    display_name: "CoinCollect",
    description: "",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc'
  },
  doge: {
    id: "DOGE",
    currency_id: '.doge',
    system_id: '',
    display_ticker: 'CCL',
    display_name: "Dogecoin",
    description: "",
    fee: 100000000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc'
  },
  dgb: {
    id: "DGB",
    currency_id: '.dgb',
    system_id: '',
    display_ticker: 'DGB',
    display_name: "Digibyte",
    description: "",
    fee: 100000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc'
  },
  bch: {
    id: "BCH",
    currency_id: '.bch',
    system_id: '',
    display_ticker: 'BCH',
    display_name: "Bitcoin Cash",
    description: "",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc'
  },
  zec: {
    id: "ZEC",
    currency_id: '',
    system_id: '.zec',
    display_ticker: 'ZEC',
    display_name: "ZCash",
    description: "",
    fee: 10000,
    compatible_channels: [DLIGHT, ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc',
    dlightEndpoints: dlightServers.zec
  },
  // zectest: {
  //   id: "ZECTEST",
  //   currency_id: '.zectest',
  //   system_id: null,
  //   display_ticker: 'ZECTEST',
  //   display_name: "ZCash Testnet",
  //   description: "",
  //   fee: 10000,
  //   compatible_channels: [DLIGHT, GENERAL],
  //   tags: [IS_ZCASH],
  //   proto: 'btc',
  //   dlightEndpoints: dlightServers.zectest
  // },
  dash: {
    id: "DASH",
    currency_id: '.dash',
    system_id: '',
    display_ticker: 'DASH',
    display_name: "Dash",
    description: "",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc'
  },
  ltc: {
    id: "LTC",
    currency_id: '.ltc',
    system_id: '',
    display_ticker: 'LTC',
    display_name: "Litecoin",
    description: "",
    fee: 30000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc'
  },
  zilla: {
    id: "ZILLA",
    currency_id: '.zilla',
    system_id: '',
    display_ticker: 'ZILLA',
    display_name: "ChainZilla",
    description:
      "The native token of Chainzilla Blockchain Solutions. They are a blockchain consulting company that develops easy to use whitelabel blockchain wallets and applications.",
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc'
  }
};
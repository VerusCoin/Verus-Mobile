import {
  DLIGHT_PRIVATE,
  ELECTRUM,
  GENERAL,
  IS_VERUS,
  IS_ZCASH,
  IS_PBAAS,
  IS_PBAAS_ROOT,
  ETH,
  ERC20,
  WYRE_SERVICE,
  IS_FIAT,
  VRPC,
  VERUSID
} from "../constants/intervalConstants";
import { dlightServers } from '../agama-wallet-lib/dlight-servers';
import {
  DEFAULT_DECIMALS,
  ETHERS,
  FIAT_DECIMALS,
  STABLECOIN_DECIMALS,
} from "../constants/web3Constants";
import {
  WALLET_APP_OVERVIEW,
  WALLET_APP_RECEIVE,
  WALLET_APP_SEND,
} from '../constants/apps';
import Colors from "../../globals/colors";

export const VERUS_APPS = {
  wallet: {
    title: 'Verus Coin Wallet',
    data: [
      {
        screen: 'Overview',
        icon: 'format-list-bulleted',
        name: 'Overview',
        key: WALLET_APP_OVERVIEW,
        color: Colors.primaryColor,
      },
      {
        screen: 'SendCoin',
        icon: 'arrow-up',
        name: 'Send',
        key: WALLET_APP_SEND,
        color: Colors.infoButtonColor,
      },
      {
        screen: 'ReceiveCoin',
        icon: 'arrow-down',
        name: 'Receive',
        key: WALLET_APP_RECEIVE,
        color: Colors.verusGreenColor,
      },
    ],
  },
}

export const coinsList = {
  VRSC: {
    id: 'VRSC',
    currency_id: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
    system_id: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
    bitgojs_network_key: 'verus',
    display_ticker: 'VRSC',
    display_name: 'Verus',
    rate_url_params: {coin_paprika: 'vrsc-verus-coin'},
    alt_names: ['verus'],
    theme_color: '#3165D4',
    website: 'https://verus.io',
    fee: 10000,
    compatible_channels: [DLIGHT_PRIVATE, GENERAL, VERUSID, VRPC],
    tags: [IS_VERUS, IS_ZCASH, IS_PBAAS, IS_PBAAS_ROOT],
    proto: 'vrsc',
    dlight_endpoints: dlightServers.vrsc,
    vrpc_endpoints: ['https://api.verus.services'],
    decimals: DEFAULT_DECIMALS,
    seconds_per_block: 60,
    default_app: 'wallet',
    apps: VERUS_APPS
  },
  VRSCTEST: {
    testnet: true,
    mainnet_id: 'VRSC',
    id: 'VRSCTEST',
    currency_id: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
    system_id: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
    bitgojs_network_key: 'verustest',
    display_ticker: 'VRSCTEST',
    display_name: 'Verus Testnet',
    alt_names: ['verustest'],
    theme_color: '#232323',
    website: 'https://verus.io',
    fee: 10000,
    compatible_channels: [VERUSID, VRPC],
    tags: [IS_VERUS, IS_ZCASH, IS_PBAAS, IS_PBAAS_ROOT],
    proto: 'vrsc',
    vrpc_endpoints: ['https://api.verustest.net'],
    decimals: DEFAULT_DECIMALS,
    seconds_per_block: 60,
    default_app: 'wallet',
    apps: VERUS_APPS
  },
  KMD: {
    id: 'KMD',
    display_name: 'Komodo',
    alt_names: [],
    currency_id: '',
    system_id: '.kmd',
    bitgojs_network_key: 'kmd',
    display_ticker: 'KMD',
    theme_color: '#2B6680',
    website: 'https://komodoplatform.com/en/',
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc',
    decimals: DEFAULT_DECIMALS,
  },
  BTC: {
    id: 'BTC',
    currency_id: '',
    system_id: '.btc',
    bitgojs_network_key: 'bitcoin',
    display_ticker: 'BTC',
    display_name: 'Bitcoin',
    alt_names: [],
    theme_color: '#F7931B',
    website: 'https://bitcoin.org/en/',
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc',
    decimals: DEFAULT_DECIMALS,
  },
  ETH: {
    id: 'ETH',
    currency_id: '',
    system_id: '.eth',
    display_ticker: 'ETH',
    display_name: 'Ethereum',
    alt_names: [],
    theme_color: '#141C30',
    website: 'https://ethereum.org/en/',
    compatible_channels: [ETH, GENERAL],
    dominant_channel: ETH,
    tags: [],
    proto: 'eth',
    decimals: ETHERS,
    network: "homestead"
  },
  GETH: {
    id: 'GETH',
    currency_id: '',
    system_id: '.eth',
    display_ticker: 'gETH',
    display_name: 'Goerli Ethereum',
    alt_names: [],
    theme_color: '#141C30',
    website: 'https://ethereum.org/en/',
    compatible_channels: [ETH],
    dominant_channel: ETH,
    tags: [],
    proto: 'eth',
    decimals: ETHERS,
    network: "goerli",
    testnet: true
  },
  BAT: {
    id: 'BAT',
    currency_id: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
    system_id: '.eth',
    display_ticker: 'BAT',
    display_name: 'Basic Attention Token',
    alt_names: [],
    theme_color: '#FB542B',
    website: 'https://basicattentiontoken.org/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
  },
  YFI: {
    id: 'YFI',
    currency_id: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
    system_id: '.eth',
    display_ticker: 'YFI',
    display_name: 'yearn.finance',
    alt_names: [],
    theme_color: '#0A6AE3',
    website: 'https://yearn.finance/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
  },
  LINK: {
    id: 'LINK',
    currency_id: '0x514910771af9ca656af840dff83e8264ecf986ca',
    system_id: '.eth',
    display_ticker: 'LINK',
    display_name: 'ChainLink',
    alt_names: [],
    theme_color: '#375BD2',
    website: 'https://chain.link/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
  },
  UNI: {
    id: 'UNI',
    currency_id: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    system_id: '.eth',
    display_ticker: 'UNI',
    display_name: 'Uniswap',
    alt_names: [],
    theme_color: '#FF007A',
    website: 'https://uniswap.org/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
  },
  VEN: {
    id: 'VEN',
    currency_id: '0xd850942ef8811f2a866692a623011bde52a462c1',
    system_id: '.eth',
    display_ticker: 'VEN',
    display_name: 'VeChain',
    alt_names: [],
    theme_color: '#33A4F1',
    website: 'https://www.vechain.org/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
  },
  BNT: {
    id: 'BNT',
    currency_id: '0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c',
    system_id: '.eth',
    display_ticker: 'BNT',
    display_name: 'Bancor',
    alt_names: [],
    theme_color: '#000D2B',
    website: 'https://app.bancor.network/eth/data',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
  },
  RFOX: {
    id: 'RFOX',
    currency_id: '0xa1d6Df714F91DeBF4e0802A542E13067f31b8262',
    system_id: '.eth',
    display_ticker: 'RFOX',
    display_name: 'RedFOX Labs',
    alt_names: [],
    theme_color: '#D73937',
    website: 'https://www.redfoxlabs.io/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
  },
  BAL: {
    id: 'BAL',
    currency_id: '0xba100000625a3754423978a60c9317c58a424e3d',
    system_id: '.eth',
    display_ticker: 'BAL',
    display_name: 'Balancer',
    alt_names: [],
    theme_color: '#1E1E1E',
    website: 'https://balancer.finance/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
  },
  ZRX: {
    id: 'ZRX',
    currency_id: '0xe41d2489571d322189246dafa5ebde1f4699f498',
    system_id: '.eth',
    display_ticker: 'ZRX',
    display_name: '0x',
    alt_names: [],
    theme_color: '#000000',
    website: 'https://0x.org/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
  },
  HOT: {
    id: 'HOT',
    currency_id: '0x6c6ee5e31d828de241282b9606c8e98ea48526e2',
    system_id: '.eth',
    display_ticker: 'HOT',
    display_name: 'HoloToken',
    alt_names: [],
    theme_color: '#08838D',
    website: 'https://holochain.org/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
  },
  NEXO: {
    id: 'NEXO',
    currency_id: '0xb62132e35a6c13ee1ee0f84dc5d40bad8d815206',
    system_id: '.eth',
    display_ticker: 'NEXO',
    display_name: 'Nexo',
    alt_names: [],
    theme_color: '#1E4DD8',
    website: 'https://nexo.io/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
  },
  DAI: {
    id: 'DAI',
    currency_id: '0x6b175474e89094c44da98b954eedeac495271d0f',
    system_id: '.eth',
    display_ticker: 'DAI',
    display_name: 'Dai',
    alt_names: [],
    theme_color: '#F5AC37',
    website: 'https://makerdao.com/en/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
    rate_url_params: {coin_paprika: 'dai-dai-coin'},
  },
  DAIWYRE: {
    id: 'DAIWYRE',
    currency_id: 'DAI',
    system_id: '.wyre',
    display_ticker: 'Wyre DAI',
    display_name: 'Dai on Wyre',
    alt_names: [],
    theme_color: '#F5AC37',
    website: 'https://makerdao.com/en/',
    compatible_channels: [GENERAL, WYRE_SERVICE],
    dominant_channel: WYRE_SERVICE,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
    rate_url_params: {coin_paprika: 'dai-dai-coin'},
  },
  OOT: {
    id: 'OOT',
    currency_id: 'oot',
    system_id: '.kmd',
    bitgojs_network_key: 'kmd',
    display_ticker: 'OOT',
    display_name: 'Utrum',
    alt_names: [],
    theme_color: '#24AAE1',
    website: 'https://utrum.io/',
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc',
    decimals: DEFAULT_DECIMALS,
  },
  CCL: {
    id: 'CCL',
    currency_id: 'ccl',
    system_id: '.kmd',
    bitgojs_network_key: 'kmd',
    display_ticker: 'CCL',
    display_name: 'CoinCollect',
    alt_names: [],
    website: 'https://coincollect.cc/',
    fee: 10000,
    theme_color: '#36AFF3',
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc',
    decimals: DEFAULT_DECIMALS,
  },
  DOGE: {
    id: 'DOGE',
    currency_id: '',
    system_id: '.doge',
    bitgojs_network_key: 'doge',
    display_ticker: 'DOGE',
    display_name: 'Dogecoin',
    alt_names: [],
    theme_color: '#BB9F32',
    website: 'https://dogecoin.com/',
    fee: 100000000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc',
    decimals: DEFAULT_DECIMALS,
    max_fee_rate_per_byte: 1000000,
  },
  DGB: {
    id: 'DGB',
    currency_id: '',
    system_id: '.dgb',
    bitgojs_network_key: 'digibyte',
    display_ticker: 'DGB',
    display_name: 'Digibyte',
    alt_names: [],
    theme_color: '#0866CC',
    website: 'https://digibyte.io/en-gb/',
    fee: 100000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc',
    decimals: DEFAULT_DECIMALS,
  },
  BCH: {
    id: 'BCH',
    currency_id: '',
    system_id: '.bch',
    bitgojs_network_key: 'bitcoincash',
    display_ticker: 'BCH',
    display_name: 'Bitcoin Cash',
    alt_names: [],
    website: 'https://bch.info/en/',
    fee: 10000,
    theme_color: '#8CC351',
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc',
    decimals: DEFAULT_DECIMALS,
  },
  ZEC: {
    id: 'ZEC',
    currency_id: '',
    system_id: '.zec',
    bitgojs_network_key: 'zcash',
    display_ticker: 'ZEC',
    display_name: 'Zcash',
    alt_names: [],
    theme_color: '#000000',
    website: 'https://z.cash/',
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc',
    dlight_endpoints: dlightServers.zec,
    decimals: DEFAULT_DECIMALS,
  },
  DASH: {
    id: 'DASH',
    currency_id: '',
    system_id: '.dash',
    bitgojs_network_key: 'dash',
    display_ticker: 'DASH',
    theme_color: '#0D8DE4',
    display_name: 'Dash',
    alt_names: [],
    website: 'https://www.dash.org/',
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc',
    decimals: DEFAULT_DECIMALS,
  },
  LTC: {
    id: 'LTC',
    currency_id: '',
    system_id: '.ltc',
    bitgojs_network_key: 'litecoin',
    display_ticker: 'LTC',
    display_name: 'Litecoin',
    alt_names: [],
    theme_color: '#345D9D',
    website: 'https://litecoin.org/',
    fee: 30000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [],
    proto: 'btc',
    decimals: DEFAULT_DECIMALS,
  },
  ZILLA: {
    id: 'ZILLA',
    currency_id: 'zilla',
    system_id: '.kmd',
    bitgojs_network_key: 'kmd',
    display_ticker: 'ZILLA',
    display_name: 'ChainZilla',
    alt_names: [],
    theme_color: '#111126',
    website: 'https://chainzilla.io/',
    fee: 10000,
    compatible_channels: [ELECTRUM, GENERAL],
    tags: [IS_ZCASH],
    proto: 'btc',
    decimals: DEFAULT_DECIMALS,
  },
  USDT: {
    id: 'USDT',
    currency_id: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    system_id: '.eth',
    display_ticker: 'USDT',
    display_name: 'Tether',
    alt_names: [],
    theme_color: '#50AF95',
    website: 'https://tether.to',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: STABLECOIN_DECIMALS,
    tags: [],
    proto: 'erc20',
    rate_url_params: {coin_paprika: 'usdt-tether-coin'},
  },
  USDTWYRE: {
    id: 'USDTWYRE',
    currency_id: 'USDT',
    system_id: '.wyre',
    display_ticker: 'Wyre USDT',
    display_name: 'Tether on Wyre',
    alt_names: [],
    theme_color: '#50AF95',
    website: 'https://tether.to',
    compatible_channels: [GENERAL, WYRE_SERVICE],
    dominant_channel: WYRE_SERVICE,
    decimals: STABLECOIN_DECIMALS,
    tags: [],
    proto: 'erc20',
    rate_url_params: {coin_paprika: 'usdt-tether-coin'},
  },
  USDC: {
    id: 'USDC',
    currency_id: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    system_id: '.eth',
    display_ticker: 'USDC',
    display_name: 'USDC',
    alt_names: [],
    theme_color: '#4E4E50',
    website: 'https://www.centre.io/usdc',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: STABLECOIN_DECIMALS,
    tags: [],
    proto: 'erc20',
    rate_url_params: {coin_paprika: 'usdc-usd-coin'},
  },
  USDCWYRE: {
    id: 'USDCWYRE',
    currency_id: 'USDC',
    system_id: '.wyre',
    display_ticker: 'Wyre USDC',
    display_name: 'USDC on Wyre',
    alt_names: [],
    theme_color: '#4E4E50',
    website: 'https://www.centre.io/usdc',
    compatible_channels: [GENERAL, WYRE_SERVICE],
    dominant_channel: WYRE_SERVICE,
    decimals: STABLECOIN_DECIMALS,
    tags: [],
    proto: 'erc20',
    rate_url_params: {coin_paprika: 'usdc-usd-coin'},
  },
  AAVE: {
    id: 'AAVE',
    currency_id: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    system_id: '.eth',
    display_ticker: 'AAVE',
    display_name: 'AAVE',
    alt_names: [],
    theme_color: '#B6509E',
    website: 'https://aave.com/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
    rate_url_params: {coin_paprika: 'aave-new'},
  },
  CRV: {
    id: 'CRV',
    currency_id: '0xD533a949740bb3306d119CC777fa900bA034cd52',
    system_id: '.eth',
    display_ticker: 'CRV',
    display_name: 'Curve DAO Token',
    alt_names: [],
    theme_color: '#000000',
    website: 'https://www.curve.fi/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
    rate_url_params: {coin_paprika: 'crv-curve-dao-token'},
  },
  SUSHI: {
    id: 'SUSHI',
    currency_id: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
    system_id: '.eth',
    display_ticker: 'SUSHI',
    display_name: 'SushiToken',
    alt_names: [],
    theme_color: '#0e0f23',
    website: 'https://sushi.com/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
    rate_url_params: {coin_paprika: 'sushi-sushi'},
  },
  MKR: {
    id: 'MKR',
    currency_id: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
    system_id: '.eth',
    display_ticker: 'MKR',
    display_name: 'Maker',
    alt_names: [],
    theme_color: '#1AAB9B',
    website: 'https://makerdao.com/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: ETHERS,
    tags: [],
    proto: 'erc20',
  },
  WBTC: {
    id: 'WBTC',
    currency_id: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    system_id: '.eth',
    display_ticker: 'wBTC',
    display_name: 'Wrapped BTC',
    alt_names: [],
    theme_color: '#282137',
    website: 'https://wbtc.network/',
    compatible_channels: [ERC20, GENERAL],
    dominant_channel: ERC20,
    decimals: DEFAULT_DECIMALS,
    tags: [],
    proto: 'erc20',
    rate_url_params: {coin_paprika: 'wbtc-wrapped-bitcoin'},
  },
  USD: {
    id: 'USD',
    currency_id: 'USD',
    system_id: '.fiat',
    display_ticker: 'USD',
    display_name: 'US Dollar',
    alt_names: [],
    theme_color: '#85bb65',
    website: 'https://home.treasury.gov',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  AUD: {
    id: 'AUD',
    currency_id: 'AUD',
    system_id: '.fiat',
    display_ticker: 'AUD',
    display_name: 'Australian Dollar',
    alt_names: [],
    theme_color: '#002167',
    website: 'https://treasury.gov.au',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  EUR: {
    id: 'EUR',
    currency_id: 'EUR',
    system_id: '.fiat',
    display_ticker: 'EUR',
    display_name: 'Euro',
    alt_names: [],
    theme_color: '#003399',
    website: 'https://www.ecb.europa.eu/home/html/index.en.html',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  CHF: {
    id: 'CHF',
    currency_id: 'CHF',
    system_id: '.fiat',
    display_ticker: 'CHF',
    display_name: 'Swiss Franc',
    alt_names: [],
    theme_color: '#6c99bc',
    website: 'https://www.snb.ch/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  MXN: {
    id: 'MXN',
    currency_id: 'MXN',
    system_id: '.fiat',
    display_ticker: 'MXN',
    display_name: 'Mexican Peso',
    alt_names: [],
    theme_color: '#00676d',
    website: 'https://www.banxico.org.mx/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  CLP: {
    id: 'CLP',
    currency_id: 'CLP',
    system_id: '.fiat',
    display_ticker: 'CLP',
    display_name: 'Chilean Peso',
    alt_names: [],
    theme_color: '#0b1a2b',
    website: 'https://www.bcentral.cl/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  ZAR: {
    id: 'ZAR',
    currency_id: 'ZAR',
    system_id: '.fiat',
    display_ticker: 'ZAR',
    display_name: 'South African Rand',
    alt_names: [],
    theme_color: '#007a74',
    website: 'https://www.resbank.co.za/en/home',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  VND: {
    id: 'VND',
    currency_id: 'VND',
    system_id: '.fiat',
    display_ticker: 'VND',
    display_name: 'Vietnamese Dong',
    alt_names: [],
    theme_color: '#f21628',
    website: 'https://www.sbv.gov.vn',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  ILS: {
    id: 'ILS',
    currency_id: 'ILS',
    system_id: '.fiat',
    display_ticker: 'ILS',
    display_name: 'Israeli Shekel',
    alt_names: [],
    theme_color: '#00569a',
    website: 'https://www.boi.org.il/heb/Pages/HomePage.aspx',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  HKD: {
    id: 'HKD',
    currency_id: 'HKD',
    system_id: '.fiat',
    display_ticker: 'HKD',
    display_name: 'Hong Kong Dollar',
    alt_names: [],
    theme_color: '#451647',
    website: 'https://www.hkma.gov.hk/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  DKK: {
    id: 'DKK',
    currency_id: 'DKK',
    system_id: '.fiat',
    display_ticker: 'DKK',
    display_name: 'Danish Krone',
    alt_names: [],
    theme_color: '#1c1c1c',
    website: 'https://www.nationalbanken.dk/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  CAD: {
    id: 'CAD',
    currency_id: 'CAD',
    system_id: '.fiat',
    display_ticker: 'CAD',
    display_name: 'Canadian Dollar',
    alt_names: [],
    theme_color: '#2c2d36',
    website: 'https://www.bank-banque-canada.ca/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  MYR: {
    id: 'MYR',
    currency_id: 'MYR',
    system_id: '.fiat',
    display_ticker: 'MYR',
    display_name: 'Malaysian Ringgit',
    alt_names: [],
    theme_color: '#00487a',
    website: 'https://www.bnm.gov.my/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  NOK: {
    id: 'NOK',
    currency_id: 'NOK',
    system_id: '.fiat',
    display_ticker: 'NOK',
    display_name: 'Norwegian Krone',
    alt_names: [],
    theme_color: '#6aadc6',
    website: 'https://www.norges-bank.no/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  CZK: {
    id: 'CZK',
    currency_id: 'CZK',
    system_id: '.fiat',
    display_ticker: 'CZK',
    display_name: 'Czech Koruna',
    alt_names: [],
    theme_color: '#314993',
    website: 'https://www.cnb.cz/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  SEK: {
    id: 'SEK',
    currency_id: 'SEK',
    system_id: '.fiat',
    display_ticker: 'SEK',
    display_name: 'Swedish Krona',
    alt_names: [],
    theme_color: '#00539e',
    website: 'https://www.riksbank.se/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  ARS: {
    id: 'ARS',
    currency_id: 'ARS',
    system_id: '.fiat',
    display_ticker: 'ARS',
    display_name: 'Argentine Peso',
    alt_names: [],
    theme_color: '#000000',
    website: 'http://www.bcra.gob.ar/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  INR: {
    id: 'INR',
    currency_id: 'INR',
    system_id: '.fiat',
    display_ticker: 'INR',
    display_name: 'Indian Rupee',
    alt_names: [],
    theme_color: '#d88236',
    website: 'https://rbi.org.in/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  THB: {
    id: 'THB',
    currency_id: 'THB',
    system_id: '.fiat',
    display_ticker: 'THB',
    display_name: 'Thai Baht',
    alt_names: [],
    theme_color: '#003559',
    website: 'https://www.bot.or.th/Thai/Pages/default.aspx',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  KRW: {
    id: 'KRW',
    currency_id: 'KRW',
    system_id: '.fiat',
    display_ticker: 'KRW',
    display_name: 'South Korean Won',
    alt_names: [],
    theme_color: '#0078b8',
    website: 'http://www.bok.or.kr/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  JPY: {
    id: 'JPY',
    currency_id: 'JPY',
    system_id: '.fiat',
    display_ticker: 'JPY',
    display_name: 'Japanese Yen',
    alt_names: [],
    theme_color: '#342360',
    website: 'https://www.boj.or.jp/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  PLN: {
    id: 'PLN',
    currency_id: 'PLN',
    system_id: '.fiat',
    display_ticker: 'PLN',
    display_name: 'Polish Zloty',
    alt_names: [],
    theme_color: '#192844',
    website: 'https://www.nbp.pl/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  GBP: {
    id: 'GBP',
    currency_id: 'GBP',
    system_id: '.fiat',
    display_ticker: 'GBP',
    display_name: 'British Pound Sterling',
    alt_names: [],
    theme_color: '#1c1819',
    website: 'https://www.bankofengland.co.uk/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  PHP: {
    id: 'PHP',
    currency_id: 'PHP',
    system_id: '.fiat',
    display_ticker: 'PHP',
    display_name: 'Philippine Peso',
    alt_names: [],
    theme_color: '#334a6d',
    website: 'https://www.bsp.gov.ph/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  ISK: {
    id: 'ISK',
    currency_id: 'ISK',
    system_id: '.fiat',
    display_ticker: 'ISK',
    display_name: 'Icelandic Krona',
    alt_names: [],
    theme_color: '#004a78',
    website: 'https://www.cb.is/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  COP: {
    id: 'COP',
    currency_id: 'COP',
    system_id: '.fiat',
    display_ticker: 'COP',
    display_name: 'Colombian Peso',
    alt_names: [],
    theme_color: '#00375e',
    website: 'https://www.banrep.gov.co/en/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  SGD: {
    id: 'SGD',
    currency_id: 'SGD',
    system_id: '.fiat',
    display_ticker: 'SGD',
    display_name: 'Singapore Dollar',
    alt_names: [],
    theme_color: '#97722a',
    website: 'https://www.mas.gov.sg/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  NZD: {
    id: 'NZD',
    currency_id: 'NZD',
    system_id: '.fiat',
    display_ticker: 'NZD',
    display_name: 'New Zealand Dollar',
    alt_names: [],
    theme_color: '#201d1d',
    website: 'https://www.rbnz.govt.nz/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
  BRL: {
    id: 'BRL',
    currency_id: 'BRL',
    system_id: '.fiat',
    display_ticker: 'BRL',
    display_name: 'Brazilian Real',
    alt_names: [],
    theme_color: '#005268',
    website: 'https://www.bcb.gov.br/',
    compatible_channels: [WYRE_SERVICE],
    tags: [IS_FIAT],
    proto: 'fiat',
    decimals: FIAT_DECIMALS,
  },
};
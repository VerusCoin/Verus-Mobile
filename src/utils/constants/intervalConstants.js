import { arrayToObject } from "../objectManip"

// Interval expiry special states
export const ALWAYS_ACTIVATED = "ALWAYS_ACTIVATED" 
export const NEVER_ACTIVATED = "NEVER_ACTIVATED" 

// API Update results
export const API_ERROR = "error"
export const API_ABORTED = "aborted"
export const API_SUCCESS = "success"

// Intitalization errors
export const INIT_DLIGHT_PRIVATE_ERRORS = 'init_dlight_private_errors'
export const INIT_ELECTRUM_ERRORS = 'init_electrum_errors'
export const INIT_ERC20_ERRORS = 'init_erc20_errors'
export const INIT_ETH_ERRORS = 'init_eth_errors'

// API call names
export const API_GET_ADDRESSES = "get_addresses"
export const API_GET_BALANCES = "get_balances"
export const API_GET_INFO = "get_info"
export const API_GET_CONVERSION_PATHS = 'get_conversion_paths'
export const API_GET_WITHDRAW_DESTINATIONS = 'get_withdraw_destinations'
export const API_GET_DEPOSIT_SOURCES = 'get_deposit_sources'
export const API_GET_PENDING_DEPOSITS = 'get_pending_deposits'
export const API_GET_TRANSACTIONS = "get_transactions"
export const API_GET_FIATPRICE = "get_fiatprice"
export const API_GET_LINKED_IDENTITIES = "get_linked_identities"

export const API_SEND = 'send'
export const API_GET_KEYS = 'get_keys'
export const API_CONVERT = 'convert'

// Service API call names
export const API_GET_SERVICE_ACCOUNT = "get_account"
export const API_GET_SERVICE_PAYMENT_METHODS = 'get_paymentmethods'
export const API_GET_SERVICE_TRANSFERS = 'get_transfers'
export const API_GET_SERVICE_RATES = 'get_rates'

// Interval restriction labels
export const IS_VERUS = "is_verus"
export const IS_PBAAS = "is_pbaas"
export const IS_ZCASH = "is_zcash"
export const IS_PBAAS_ROOT = "is_pbaas_root"
export const IS_FIAT = 'is_fiat'

// API channel types
export const DLIGHT_PRIVATE = 'dlight_private'
export const WYRE_SERVICE = 'wyre_service'
export const ELECTRUM = 'electrum'
export const GENERAL = 'general'
export const ETH = 'eth'
export const ERC20 = 'erc20'
export const VRPC = 'vrpc'
export const VERUSID = 'verusid'
export const CHANNELS = [DLIGHT_PRIVATE, ELECTRUM, GENERAL, ETH, ERC20, WYRE_SERVICE, VERUSID, VRPC]
export const CHANNELS_OBJECT_TEMPLATE = Object.freeze(arrayToObject(CHANNELS, {}))
export const CHANNELS_NULL_TEMPLATE = Object.freeze(arrayToObject(CHANNELS, null))

// API coin lifecycle types
export const PRE_DATA = "pre_data"
export const SYNCING = "syncing"
export const POST_SYNC = "post_sync"

  
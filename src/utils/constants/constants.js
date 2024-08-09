import { Dimensions } from "react-native";
import { primitives } from "verusid-ts-client"

export const SMALL_DEVICE_HEGHT = 600;

// Electrum
export const ELECTRUM_PROTOCOL_CHANGE = 1.4;

// Seed init params
export const DEFAULT_SEED_PHRASE_LENGTH = 24

// Wyre integration testing
export const SUPPORTED_FIAT_CURRENCIES = [{ value: 'USD' }]; // Before API is connected, use only USD as so far we only have USD rate data
export const SUPPORTED_CRYPTOCURRENCIES = [{ value: 'BTC' }]; // No support for ETH and ERC20 (DAI) yet
export const SUPPORTED_PAYMENT_METHODS = [{ id: 'US_BANK_ACCT', name: 'US Bank Account', est_time: '5 business days' }];

// VerusPay
export const FORMAT_UNKNOWN = 'QR Data format unrecognized.';
export const ADDRESS_ONLY = 'Only address detected, please fill out amount field.';
export const INCOMPLETE_VERUS_QR = 'VerusQR code impartial or incomplete, cannot parse QR data.';
export const INSUFFICIENT_FUNDS = 'Insufficient funds.';
export const INCOMPATIBLE_COIN = 'The coin this invoice is requesting is currently incompatible with Verus Mobile.';
export const INCOMPATIBLE_APP = 'The coin this invoice is requesting does not have send functionality.';
export const ONLY_ADDRESS = 'This QR Code only contains only an address. Please select a coin and then scan.';
export const BALANCE_NULL = "Couldn't fetch balance for coin.";
export const PARSE_ERROR = 'Error parsing QR code data.'

// Custom chain form
export const DEFAULT_FEE_DESC = ("A chain's default fee is the fee paid by default to miners every time you send a transaction." +
    '\n\n' + 'If this number is too low, your transactions will take very long to complete, and may fail. ' +
    "If it is too high, your transactions could be quicker, but you'll spend a lot in fees." + '\n\n' + 'It is recommended that you research the average network ' +
    'fee for the chain you are trying to add. This number will be used by Verus Mobile if online fee data is unavailable.');
export const ELECTRUM_SERVERS_DESC = ("A chain's electrum servers are full nodes you can connect to securely interact with it's blockchain network." + '\n\n' + 'Although you will never share your private key ' +
    'with the servers entered here, it is important that you either trust them, or use your own if you want a pleasant wallet user experience.' + '\n\n' + "If you're using third party servers, " +
    "ensure you've done your research. Enter a minimum of two servers in the format:" + '\n\n' + "<ip>:<port>:<protocol (e.g. 'tcp' or 'ssl')>.");
export const ADD_COIN_CHECK = ('Please take the time to double check the following things regarding your custom coin ' +
    'information. If you are sure everything is correct, press continue.' +
    '\n');
export const REQUIRED_FIELD = 'Required field';
export const COIN_ALREADY_ACTIVE = 'A coin with this ticker is currently active';
export const TICKER_RESERVED = 'This ticker is reserved, try adding this coin through the coin list';
export const NO_SPECIAL_CHARACTERS_NAME = 'Name cannot include any special characters';
export const INVALID_AMOUNT = 'Invalid amount';
export const DEFAULT_FEE_HIGH_WARNING = '• Your default fee is unusually high. By default, you will pay this fee' +
    ' every time you send a transaction with this coin. Ensure it is correct.';
export const ENTER_AMOUNT_GREATER_THAN_0 = 'Enter an amount greater than 0';
export const BAD_SERVER_INPUT_FORMAT = 'Not in ip:port:protocol format';
export const BAD_SERVER_PROTOCOL = 'Please choose either ssl or tcp as protocol';
export const ELECTRUM_DISCLAIMER_UNREALIZED = 'Please confirm';
export const ELECTRUM_DISCLAIMER = 'I understand that no developer of this mobile application is responsible for these electrum servers, and I proceed at my own risk.';
export const POSSIBLY_UNSUPPORTED_CHAIN = "• This chain\'s key structure may not be recognized by Verus Mobile, and you could run into sending or receiving issues with it if you continue. Make sure you know what you are doing, and proceed at your own risk.";

// Coin settings
export const NO_VERIFICATION = 0;
export const MID_VERIFICATION = 1;
export const MAX_VERIFICATION = 2;
export const NO_VERIFICATION_DESC = 'No Verification (Not recommended):\n\nOn this setting, before sending a transaction, none of your funds will be ' +
    'cross-verified across different electrum servers, and your existing transactions will not be ' +
    'hashed to check against their transaction ID. This is only suggested for huge wallets that ' +
    'otherwise would not be able to send.';
export const MID_VERIFICATION_DESC = 'Incomplete Verification (Not recommended):\n\nOn this setting, your funds will not be cross verified across multiple ' +
    'servers, but you may experience quicker transaction send times. This is not recommended unless ' +
    'necessary for usability.';
export const MAX_VERIFICATION_DESC = 'Complete Verification (Highly recommended):\n\nOn this setting, before sending a transaction, your funds will be ' +
    'cross verified across at least two different electrum servers, and the transaction IDs of your existing ' +
    'transactions will be double-checked through local transaction hashing.';
export const VERIFICATION_LOCKED = 'The verification level settings for this coin have been locked and cannot be changed.';
export const DEFAULT_PRIVATE_ADDRS = 1

// Chain QR
export const INCOMPLETE_CHAIN_QR = 'VerusQR code impartial or incomplete, cannot parse QR data.';
export const COIN_TICKER_ALREADY_EXISTS = 'already exists in Verus Mobile, and therefore cannot be added as a custom coin.';

// Transaction Type Constants
export const PRIVATE = 'private'
export const PUBLIC = 'public'
export const TOTAL = 'total'

// Payment Methods
export const WYRE_URL = 'https://api.sendwyre.com';
export const WYRE_REFERRER_ACCOUNT_ID = 'verus-valu';

// Biometry
export const BIOMETRY_WARNING = "Enabling biometric authentication relies on the security of your operating system keychain, and device's biometric hardware to keep your password safe.\n\nBy continuing, you acknowledge the risks associated with doing so."

// ETH Network IDs
export const ETH_NETWORK_IDS = {
    ['homestead']: 1,
    ['ropsten']: 3,
    ['rinkeby']: 4,
    ['goerli']: 5,
    ['kovan']: 42
}

export const SUPPORTED_COUNTRIES = ['US'];
export const WYRE_COUNTRIES = [{ value: 'US' }, ];
export const STATES = [
    { value: 'AL' },
    { value: 'AK' },
    { value: 'AS' },
    { value: 'AZ' },
    { value: 'AR' },
    { value: 'CA' },
    { value: 'CO' },
    { value: 'CT' },
    { value: 'DE' },
    { value: 'DC' },
    { value: 'FM' },
    { value: 'FL' },
    { value: 'GA' },
    { value: 'HI' },
    { value: 'ID' },
    { value: 'IL' },
    { value: 'IN' },
    { value: 'IA' },
    { value: 'KS' },
    { value: 'KY' },
    { value: 'LA' },
    { value: 'ME' },
    { value: 'MD' },
    { value: 'MA' },
    { value: 'MI' },
    { value: 'MN' },
    { value: 'MS' },
    { value: 'MO' },
    { value: 'MT' },
    { value: 'NE' },
    { value: 'NV' },
    { value: 'NH' },
    { value: 'NJ' },
    { value: 'NM' },
    { value: 'NY' },
    { value: 'NC' },
    { value: 'ND' },
    { value: 'OH' },
    { value: 'OK' },
    { value: 'OR' },
    { value: 'PW' },
    { value: 'PA' },
    { value: 'PR' },
    { value: 'RI' },
    { value: 'SC' },
    { value: 'SD' },
    { value: 'TN' },
    { value: 'TX' },
    { value: 'UT' },
    { value: 'VT' },
    { value: 'VA' },
    { value: 'WA' },
    { value: 'WV' },
    { value: 'WI' },
    { value: 'WY' }
];

export const SUBWALLET_NAMES = {
    MAIN_WALLET: "Main",
    PRIVATE_WALLET: "Private",
    WYRE_ACCOUNT_WALLET: "Wyre"
}

//Display
export const DEVICE_WINDOW_WIDTH = Dimensions.get('window').width;
export const DEVICE_WINDOW_HEIGHT = Dimensions.get('window').height;

// Init
export const START_COINS = ["VRSC", "BTC", "ETH"]
export const TEST_PROFILE_OVERRIDES = {
  ['VRSC']: 'VRSCTEST',
  ['ETH']: 'GETH'
};

// Account data initialization steps
export const VALIDATING_ACCOUNT = 'validating'
export const LOADING_ACCOUNT = 'loading'
export const ACCOUNT_DATA_INIT_ORDER = [VALIDATING_ACCOUNT, LOADING_ACCOUNT]

export const IADDRESS_VERSION = 102

// Deep links
export const CALLBACK_HOST = 'x-callback-url'
export const SUPPORTED_DLS = [primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid, primitives.VERUSPAY_INVOICE_VDXF_KEY.vdxfid]

// Komodo
export const KOMODO_ENDOFERA = 7777777;
export const KOMODO_LOCKTIME_THRESHOLD = 500000000;
export const KOMODO_MIN_SATOSHIS = 1000000000;
export const KOMODO_ONE_MONTH_CAP_HARDFORK = 1000000;
export const ONE_HOUR = 60;
export const ONE_MONTH = 31 * 24 * 60;
export const ONE_YEAR = 365 * 24 * 60;
export const KOMODO_DIVISOR = 10512000;
export const KOMODO_N_S7_HARDFORK_HEIGHT = 3484958;

// Address block list
export const ADDRESS_BLOCKLIST_FROM_WEBSERVER = 'ADDRESS_BLOCKLIST_FROM_WEBSERVER';
export const ADDRESS_BLOCKLIST_FROM_VERUSID = 'ADDRESS_BLOCKLIST_FROM_VERUSID';
export const ADDRESS_BLOCKLIST_MANUAL = 'ADDRESS_BLOCKLIST_MANUAL';

// Address byte versions
export const R_ADDRESS_VERSION = 60;
export const I_ADDRESS_VERSION = 102;

// Address blocklist
export const DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER = 'https://eth.verusbridge.io/exclude.json'

// Password Strength
export const MIN_PASS_LENGTH = 7
export const MIN_PASS_SCORE = 65
export const PASS_SCORE_LIMIT = 100
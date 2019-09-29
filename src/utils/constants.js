//Electrum
export const ELECTRUM_PROTOCOL_CHANGE = 1.4

//VerusPay
export const FORMAT_UNKNOWN = "QR Data format unrecognized."
export const ADDRESS_ONLY = "Only address detected, please fill out amount field."
export const INCOMPLETE_VERUS_QR = "VerusQR code impartial or incomplete, cannot parse QR data."
export const INSUFFICIENT_FUNDS = "Insufficient funds."
export const INCOMPATIBLE_COIN = "The coin this invoice is requesting is currently incompatible with Verus Mobile."
export const INCOMPATIBLE_APP = "The coin this invoice is requesting does not have send functionality."
export const ONLY_ADDRESS = "This QR Code only contains only an address. Please select a coin and then scan."
export const BALANCE_NULL = "Couldn't fetch balance for coin."

//Custom chain form
export const DEFAULT_FEE_DESC = ("A chain's default fee is the fee paid by default to miners every time you send a transaction." +
                                 '\n\n' + "If this number is too low, your transactions will take very long to complete, and may fail. " +
                                 "If it is too high, your transactions could be quicker, but you'll spend a lot in fees." + '\n\n' + "It is recommended that you research the average network " +
                                 "fee for the chain you are trying to add. This number will be used by Verus Mobile if online fee data is unavailable.")
export const ELECTRUM_SERVERS_DESC = ("A chain's electrum servers are full nodes you can connect to securely interact with it's blockchain network." + '\n\n' +"Although you will never share your private key " + 
                                      "with the servers entered here, it is important that you either trust them, or use your own if you want a pleasant wallet user experience." + '\n\n' +"If you're using third party servers, " +
                                      "ensure you've done your research. Enter a minimum of two servers in the format:" + '\n\n' + "<ip>:<port>:<protocol (e.g. 'tcp' or 'ssl')>.")
export const ADD_COIN_CHECK = ('Please take the time to double check the following things regarding your custom coin ' + 
                              'information. If you are sure everything is correct, press continue.' + 
                              '\n')
export const REQUIRED_FIELD = "Required field"
export const COIN_ALREADY_ACTIVE = "A coin with this ticker is currently active"
export const TICKER_RESERVED = "This ticker is reserved, try adding this coin through the coin list"
export const NO_SPECIAL_CHARACTERS_NAME = "Name cannot include any special characters"
export const INVALID_AMOUNT = "Invalid amount"
export const DEFAULT_FEE_HIGH_WARNING = "• Your default fee is unusually high. By default, you will pay this fee" +
" every time you send a transaction with this coin. Ensure it is correct."
export const ENTER_AMOUNT_GREATER_THAN_0 = "Enter an amount greater than 0"
export const BAD_SERVER_INPUT_FORMAT = "Not in ip:port:protocol format"
export const BAD_SERVER_PROTOCOL = "Please choose either ssl or tcp as protocol"
export const ELECTRUM_DISCLAIMER_UNREALIZED = "Please confirm"
export const ELECTRUM_DISCLAIMER = "I understand that no developer of this mobile application is responsible for these electrum servers."
export const POSSIBLY_UNSUPPORTED_CHAIN = "• This chain\'s key structure may not be recognized by Verus Mobile, and you could run into sending or receiving issues with it if you continue. Make sure you know what you are doing."

//Coin settings
export const NO_VERIFICATION = 0
export const MID_VERIFICATION = 1
export const MAX_VERIFICATION = 2
export const NO_VERIFICATION_DESC = 'No Verification (Not recommended):\n\nOn this setting, before sending a transaction, none of your funds will be ' +
'cross-verified across different electrum servers, and your existing transactions will not be ' +
'hashed to check against their transaction ID. This is only suggested for huge wallets that ' +
'otherwise wouldn\'t be able to send.'
export const MID_VERIFICATION_DESC = 'Incomplete Verification (Not recommended):\n\nOn this setting, your funds will not be cross verified across multiple ' + 
'servers, but you may experience a little quicker transaction sending times. This is not recommended unless ' +
'necessary for usability.'
export const MAX_VERIFICATION_DESC = 'Complete Verification (Highly recommended):\n\nOn this setting, before sending a transaction, your funds will be ' +
'cross verified across at least two different electrum servers, and the transaction IDs of your existing ' +
'transactions will be double-checked through local transaction hashing.'
export const VERIFICATION_LOCKED = 'The verification level settings for this coin have been locked and cannot be changed.'

//Chain QR
export const INCOMPLETE_CHAIN_QR = 'VerusQR code impartial or incomplete, cannot parse QR data.'
export const COIN_TICKER_ALREADY_EXISTS = 'already exists in Verus Mobile, and therefore cannot be added as a custom coin.'
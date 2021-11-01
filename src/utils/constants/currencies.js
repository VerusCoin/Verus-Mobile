export const ARS = "ARS"
export const CAD = "CAD"
export const CLP = "CLP"
export const COP = "COP"
export const VND = "VND"
export const HKD = "HKD"
export const ISK = "ISK"
export const PHP = "PHP"
export const DKK = "DKK"
export const HUF = "HUF"
export const CZK = "CZK"
export const GBP = "GBP"
export const RON = "RON"
export const SEK = "SEK"
export const IDR = "IDR"
export const INR = "INR"
export const BRL = "BRL"
export const RUB = "RUB"
export const HRK = "HRK"
export const JPY = "JPY"
export const THB = "THB"
export const CHF = "CHF"
export const EUR = "EUR"
export const MYR = "MYR"
export const BGN = "BGN"
export const TRY = "TRY"
export const CNY = "CNY"
export const NOK = "NOK"
export const NZD = "NZD"
export const ZAR = "ZAR"
export const USD = "USD"
export const MXN = "MXN"
export const SGD = "SGD"
export const AUD = "AUD"
export const ILS = "ILS"
export const KRW = "KRW"
export const PLN = "PLN"

export const CURRENCY_NAMES = {
  ARS: "Argentine Peso",
  AUD: "Australian Dollar",
  BGN: "Bulgarian Lev",
  BRL: "Brazilian Real",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  CLP: "Chilean Peso",
  COP: "Colombian Peso",
  CNY: "Chinese Yuan",
  CZK: "Czech Koruna",
  DKK: "Danish Krone",
  EUR: "Euro",
  GBP: "British Pound",
  HKD: "Hong Kong Dollar",
  HRK: "Croatian Kuna",
  HUF: "Hungarian Forint",
  IDR: "Indonesian Rupiah",
  ILS: "Israeli Shekel",
  INR: "Indian Rupee",
  ISK: "Icelandic Króna",
  JPY: "Japanese Yen",
  KRW: "South Korean Won",
  MXN: "Mexican Peso",
  MYR: "Malaysian Ringgit",
  NOK: "Norwegian Krone",
  NZD: "New Zealand Dollar",
  PHP: "Philippine Peso",
  PLN: "Polish Zloty",
  RON: "Romanian Leu",
  RUB: "Russian Ruble",
  SEK: "Swedish Krona",
  SGD: "Singapore Dollar",
  THB: "Thai Baht",
  TRY: "Turkish Lira",
  USD: "US Dollar",
  VND: "Vietnamese Dong",
  ZAR: "South African Rand",
}

export const SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES = [
  AUD, BGN, BRL, CAD, CHF,
  CNY, CZK, DKK, EUR, GBP,
  HKD, HRK, HUF, IDR, ILS,
  INR, ISK, JPY, KRW, MXN,
  MYR, NOK, NZD, PHP, PLN,
  RON, RUB, SEK, SGD, THB,
  TRY, USD, ZAR
]

export const SUPPORTED_BANK_CURRENCIES = Object.keys(CURRENCY_NAMES)
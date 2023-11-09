import { WYRE_SERVICE, VALU_SERVICE } from "./intervalConstants"

export const WYRE_SERVICE_ID = 'wyre_service'
export const VERUSID_SERVICE_ID = 'verusid_service'
export const PBAAS_PRECONVERT_SERVICE_ID = 'pbaas_preconvert'
export const VALU_SERVICE_ID = 'valu_service'

export const CONNECTED_SERVICE_DISPLAY_INFO = {
  [WYRE_SERVICE_ID]: {
    title: "Wyre",
    description: "Connecting your wallet with Wyre allows you to convert between cryptocurrency and fiat"
  },
  [VERUSID_SERVICE_ID]: {
    title: "VerusID",
    description: "By connecting your VerusIDs to your wallet, you can use them to hold funds and/or sign into services",
    decentralized: true
  },
  [PBAAS_PRECONVERT_SERVICE_ID]: {
    title: "Preconvert Currency",
    description: "Participate in a PBaaS currency launch by sending your funds to the currency before it starts",
    decentralized: true
  },
  [VALU_SERVICE_ID]: {
    title: "Valu",
    description: "Connect to Valu's Fiat On-ramps, ValuVerse and KYC Attesation Services."
  }
}

export const CONNECTED_SERVICE_CHANNELS = {
  [WYRE_SERVICE_ID]: WYRE_SERVICE,
  [VALU_SERVICE_ID]: VALU_SERVICE
}

export const CONNECTED_SERVICES = [VERUSID_SERVICE_ID, /*PBAAS_PRECONVERT_SERVICE_ID ,*/ WYRE_SERVICE_ID, VALU_SERVICE_ID]

// Wyre specific constants
export const WYRE_INDIVIDUAL_NAME = 'individualLegalName'
export const WYRE_INDIVIDUAL_CELL = 'individualCellphoneNumber'
export const WYRE_INDIVIDUAL_EMAIL = 'individualEmail'
export const WYRE_INDIVIDUAL_RESIDENCE_ADDRESS = 'individualResidenceAddress'
export const WYRE_INDIVIDUAL_GOVERNMENT_ID = 'individualGovernmentId'
export const WYRE_INDIVIDUAL_DOB = 'individualDateOfBirth'
export const WYRE_INDIVIDUAL_SSN = 'individualSsn'
export const WYRE_INDIVIDUAL_SOURCE_OF_FUNDS = 'individualSourceOfFunds'
export const WYRE_INDIVIDUAL_PROOF_OF_ADDRESS = 'individualProofOfAddress'
export const WYRE_DATA_SUBMISSION_OPEN = "OPEN"
export const WYRE_DATA_SUBMISSION_PENDING = "PENDING"
export const WYRE_DATA_SUBMISSION_APPROVED = "APPROVED"
export const WYRE_DATA_SUBMISSION_ACTIVE = "ACTIVE"
export const WYRE_DATA_SUBMISSION_REJECTED = "REJECTED"
export const WYRE_DATA_SUBMISSION_AWAITING_FOLLOWUP = "AWAITING_FOLLOWUP"
export const WYRE_INDIVIDUAL_GOVERNMENT_ID_BACK = "BACK"
export const WYRE_INDIVIDUAL_GOVERNMENT_ID_FRONT = "FRONT"
export const WYRE_INDIVIDUAL_GOVERNMENT_ID_GOVT_ID = "GOVT_ID"
export const WYRE_INDIVIDUAL_GOVERNMENT_ID_DRIVING_LICENSE = "DRIVING_LICENSE"
export const WYRE_INDIVIDUAL_GOVERNMENT_ID_PASSPORT_CARD = "PASSPORT_CARD"
export const WYRE_INDIVIDUAL_GOVERNMENT_ID_PASSPORT = "PASSPORT"
export const WYRE_PAYMENT_METHOD_TYPE = "paymentMethodType"
export const WYRE_PAYMENT_TYPE = "paymentType"
export const WYRE_PAYMENT_METHOD_TYPE_INTERNATIONAL_TRANSFER = "INTERNATIONAL_TRANSFER"
export const WYRE_PAYMENT_TYPE_LOCAL_BANK_WIRE = "LOCAL_BANK_WIRE"
export const WYRE_PAYMENT_TYPE_LOCAL_BANK_TRANSFER = 'LOCAL_BANK_TRANSFER'

// Wyre specific bank info
export const WYRE_PERSONAL_BANK_COUNTRY = 'country'
export const WYRE_PERSONAL_BANK_PRIMARY_CURRENCY = 'currency'
export const WYRE_PERSONAL_BANK_BENEFICIARY_TYPE = 'beneficiaryType'
export const WYRE_PERSONAL_BANK_BENEFICIARY_ADDRESS_1 = 'beneficiaryAddress'
export const WYRE_PERSONAL_BANK_BENEFICIARY_ADDRESS_2 = 'beneficiaryAddress2'
export const WYRE_PERSONAL_BANK_BENEFICIARY_CITY = 'beneficiaryCity'
export const WYRE_PERSONAL_BANK_BENEFICIARY_NAME = 'beneficiaryName'
export const WYRE_PERSONAL_BANK_BENEFICIARY_POSTAL = 'beneficiaryPostal'
export const WYRE_PERSONAL_BANK_FIRST_NAME = 'firstNameOnAccount'
export const WYRE_PERSONAL_BANK_LAST_NAME = 'lastNameOnAccount'
export const WYRE_PERSONAL_BANK_FULL_NAME = 'nameOnAccount'
export const WYRE_PERSONAL_BANK_ACCOUNT_HOLDER_PHONE = 'accountHolderPhoneNumber'
export const WYRE_PERSONAL_BANK_BENEFICIARY_PHONE = 'beneficiaryPhoneNumber'
export const WYRE_PERSONAL_BANK_BENEFICIARY_STATE = 'beneficaryState'
export const WYRE_PERSONAL_BANK_SWIFT_BIC = 'swiftBic'
export const WYRE_PERSONAL_BANK_BENEFICIARY_DOB_DAY = 'beneficiaryDobDay'
export const WYRE_PERSONAL_BANK_BENEFICIARY_DOB_MONTH = 'beneficiaryDobMonth'
export const WYRE_PERSONAL_BANK_BENEFICIARY_DOB_YEAR = 'beneficiaryDobYear'
export const WYRE_PERSONAL_BANK_ACCOUNT_NUMBER = 'accountNumber'
export const WYRE_PERSONAL_BANK_ACCOUNT_TYPE = 'accountType'
export const WYRE_PERSONAL_BANK_ACCEPTS_PAYMENTS = 'chargeablePM'
export const WYRE_PERSONAL_BANK_BSB_NUMBER = 'bsbNumber'
export const WYRE_PERSONAL_BANK_CODE = 'bankCode'
export const WYRE_PERSONAL_BANK_NAME = 'bankName'
export const WYRE_PERSONAL_BANK_BRANCH_CODE = 'branchCode'
export const WYRE_PERSONAL_BANK_BRANCH_NAME = 'branchName'
export const WYRE_PERSONAL_BANK_CPF_CNPJ = 'cpfCnpj'
export const WYRE_PERSONAL_BANK_CHINESE_NATIONAL_ID = 'chineseNationalIdNumber'
export const WYRE_PERSONAL_BANK_CLABE = 'clabe'
export const WYRE_PERSONAL_BANK_CITY = 'bankCity'
export const WYRE_PERSONAL_BANK_PROVINCE = 'bankProvince'
export const WYRE_PERSONAL_BANK_ROUTING_NUMBER = 'routingNumber'
export const WYRE_PERSONAL_BANK_BENEFICIARY_TYPE_INDIVIDUAL = 'INDIVIDUAL'
export const WYRE_PERSONAL_BANK_ACCOUNT_TYPE_CHECKING_BR = 'corrente'
export const WYRE_PERSONAL_BANK_ACCOUNT_TYPE_SAVINGS_BR = 'poupança'

// Valu specific constants
export const VALU_INDIVIDUAL_NAME = 'individualLegalName'
export const VALU_INDIVIDUAL_CELL = 'individualCellphoneNumber'
export const VALU_INDIVIDUAL_EMAIL = 'individualEmail'
export const VALU_INDIVIDUAL_RESIDENCE_ADDRESS = 'individualResidenceAddress'
export const VALU_INDIVIDUAL_GOVERNMENT_ID = 'individualGovernmentId'
export const VALU_INDIVIDUAL_DOB = 'individualDateOfBirth'
export const VALU_INDIVIDUAL_SSN = 'individualSsn'
export const VALU_INDIVIDUAL_SOURCE_OF_FUNDS = 'individualSourceOfFunds'
export const VALU_INDIVIDUAL_PROOF_OF_ADDRESS = 'individualProofOfAddress'
export const VALU_DATA_SUBMISSION_OPEN = "OPEN"
export const VALU_DATA_SUBMISSION_PENDING = "PENDING"
export const VALU_DATA_SUBMISSION_APPROVED = "APPROVED"
export const VALU_DATA_SUBMISSION_ACTIVE = "ACTIVE"
export const VALU_DATA_SUBMISSION_REJECTED = "REJECTED"
export const VALU_DATA_SUBMISSION_AWAITING_FOLLOWUP = "AWAITING_FOLLOWUP"
export const VALU_INDIVIDUAL_GOVERNMENT_ID_BACK = "BACK"
export const VALU_INDIVIDUAL_GOVERNMENT_ID_FRONT = "FRONT"
export const VALU_INDIVIDUAL_GOVERNMENT_ID_GOVT_ID = "GOVT_ID"
export const VALU_INDIVIDUAL_GOVERNMENT_ID_DRIVING_LICENSE = "DRIVING_LICENSE"
export const VALU_INDIVIDUAL_GOVERNMENT_ID_PASSPORT_CARD = "PASSPORT_CARD"
export const VALU_INDIVIDUAL_GOVERNMENT_ID_PASSPORT = "PASSPORT"
export const VALU_PAYMENT_METHOD_TYPE = "paymentMethodType"
export const VALU_PAYMENT_TYPE = "paymentType"
export const VALU_PAYMENT_METHOD_TYPE_INTERNATIONAL_TRANSFER = "INTERNATIONAL_TRANSFER"
export const VALU_PAYMENT_TYPE_LOCAL_BANK_WIRE = "LOCAL_BANK_WIRE"
export const VALU_PAYMENT_TYPE_LOCAL_BANK_TRANSFER = 'LOCAL_BANK_TRANSFER'

// Valu specific bank info
export const VALU_PERSONAL_BANK_COUNTRY = 'country'
export const VALU_PERSONAL_BANK_PRIMARY_CURRENCY = 'currency'
export const VALU_PERSONAL_BANK_BENEFICIARY_TYPE = 'beneficiaryType'
export const VALU_PERSONAL_BANK_BENEFICIARY_ADDRESS_1 = 'beneficiaryAddress'
export const VALU_PERSONAL_BANK_BENEFICIARY_ADDRESS_2 = 'beneficiaryAddress2'
export const VALU_PERSONAL_BANK_BENEFICIARY_CITY = 'beneficiaryCity'
export const VALU_PERSONAL_BANK_BENEFICIARY_NAME = 'beneficiaryName'
export const VALU_PERSONAL_BANK_BENEFICIARY_POSTAL = 'beneficiaryPostal'
export const VALU_PERSONAL_BANK_FIRST_NAME = 'firstNameOnAccount'
export const VALU_PERSONAL_BANK_LAST_NAME = 'lastNameOnAccount'
export const VALU_PERSONAL_BANK_FULL_NAME = 'nameOnAccount'
export const VALU_PERSONAL_BANK_ACCOUNT_HOLDER_PHONE = 'accountHolderPhoneNumber'
export const VALU_PERSONAL_BANK_BENEFICIARY_PHONE = 'beneficiaryPhoneNumber'
export const VALU_PERSONAL_BANK_BENEFICIARY_STATE = 'beneficaryState'
export const VALU_PERSONAL_BANK_SWIFT_BIC = 'swiftBic'
export const VALU_PERSONAL_BANK_BENEFICIARY_DOB_DAY = 'beneficiaryDobDay'
export const VALU_PERSONAL_BANK_BENEFICIARY_DOB_MONTH = 'beneficiaryDobMonth'
export const VALU_PERSONAL_BANK_BENEFICIARY_DOB_YEAR = 'beneficiaryDobYear'
export const VALU_PERSONAL_BANK_ACCOUNT_NUMBER = 'accountNumber'
export const VALU_PERSONAL_BANK_ACCOUNT_TYPE = 'accountType'
export const VALU_PERSONAL_BANK_ACCEPTS_PAYMENTS = 'chargeablePM'
export const VALU_PERSONAL_BANK_BSB_NUMBER = 'bsbNumber'
export const VALU_PERSONAL_BANK_CODE = 'bankCode'
export const VALU_PERSONAL_BANK_NAME = 'bankName'
export const VALU_PERSONAL_BANK_BRANCH_CODE = 'branchCode'
export const VALU_PERSONAL_BANK_BRANCH_NAME = 'branchName'
export const VALU_PERSONAL_BANK_CPF_CNPJ = 'cpfCnpj'
export const VALU_PERSONAL_BANK_CHINESE_NATIONAL_ID = 'chineseNationalIdNumber'
export const VALU_PERSONAL_BANK_CLABE = 'clabe'
export const VALU_PERSONAL_BANK_CITY = 'bankCity'
export const VALU_PERSONAL_BANK_PROVINCE = 'bankProvince'
export const VALU_PERSONAL_BANK_ROUTING_NUMBER = 'routingNumber'
export const VALU_PERSONAL_BANK_BENEFICIARY_TYPE_INDIVIDUAL = 'INDIVIDUAL'
export const VALU_PERSONAL_BANK_ACCOUNT_TYPE_CHECKING_BR = 'corrente'
export const VALU_PERSONAL_BANK_ACCOUNT_TYPE_SAVINGS_BR = 'poupança'
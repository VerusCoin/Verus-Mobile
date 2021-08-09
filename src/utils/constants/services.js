import WyreProvider from "../services/WyreProvider"
import { WYRE_SERVICE } from "./intervalConstants"

export const WYRE_SERVICE_ID = 'wyre_service'

export const CONNECTED_SERVICE_DISPLAY_INFO = {
  [WYRE_SERVICE_ID]: {
    title: "Wyre",
    description: "Connecting your wallet with Wyre allows you to seamlessly convert between cryptocurrency and fiat"
  }
}

export const CONNECTED_SERVICE_CHANNELS = {
  [WYRE_SERVICE_ID]: WYRE_SERVICE
}

export const CONNECTED_SERVICE_PROVIDERS = {
  [WYRE_SERVICE_ID]: WyreProvider
}

export const CONNECTED_SERVICES = [WYRE_SERVICE_ID]

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
export const WYRE_INDIVIDUAL_GOVERNMENT_ID_BACK = "BACK"
export const WYRE_INDIVIDUAL_GOVERNMENT_ID_FRONT = "FRONT"
export const WYRE_INDIVIDUAL_GOVERNMENT_ID_GOVT_ID = "GOVT_ID"
export const WYRE_INDIVIDUAL_GOVERNMENT_ID_DRIVING_LICENSE = "DRIVING_LICENSE"
export const WYRE_INDIVIDUAL_GOVERNMENT_ID_PASSPORT_CARD = "PASSPORT_CARD"
export const WYRE_INDIVIDUAL_GOVERNMENT_ID_PASSPORT = "PASSPORT"
import {
  PERSONAL_BANK_ACCOUNT_NUMBER,
  PERSONAL_BANK_BENEFICIARY_NAME_FIRST,
  PERSONAL_BANK_BENEFICIARY_NAME_FULL,
  PERSONAL_BANK_BENEFICIARY_NAME_LAST,
  PERSONAL_BANK_BRANCH_CODE,
  PERSONAL_BANK_BRANCH_NAME,
  PERSONAL_BANK_BSB_NUMBER,
  PERSONAL_BANK_CHINESE_NATIONAL_ID,
  PERSONAL_BANK_CITY,
  PERSONAL_BANK_CODE,
  PERSONAL_BANK_CPF_CNPJ,
  PERSONAL_BANK_NAME,
  PERSONAL_BANK_PROVINCE,
  PERSONAL_BANK_ROUTING_NUMBER,
  PERSONAL_BANK_SWIFT_BIC,
  PERSONAL_BANK_COUNTRY,
  PERSONAL_BANK_PRIMARY_CURRENCY,
  PERSONAL_BANK_BENEFICIARY_TYPE,
  PERSONAL_BANK_BENEFICIARY_PHYSICAL_ADDRESS,
  PERSONAL_BANK_BENEFICIARY_PHONE,
  PERSONAL_PHONE_TYPE_MOBILE,
  PERSONAL_BANK_BENEFICIARY_DOB,
  PERSONAL_BANK_ACCOUNT_TYPE,
  PERSONAL_BANK_ACCOUNT_TYPE_CHECKING,
  PERSONAL_BANK_ACCOUNT_TYPE_SAVINGS,
  PERSONAL_PAYMENT_METHODS,
  PERSONAL_BENEFICIARY_TYPE_INDIVIDUAL,
  PERSONAL_BANK_CLABE
} from "../constants/personal";

export const isValidPersonalDataObject = (data, requiredKeys) => {
  if (data == null) return false;
  else {
    for (const requiredKey of requiredKeys) {
      if (
        data[requiredKey] == null ||
        (typeof data[requiredKey] === "string" && !isValidStringField(data[requiredKey])) ||
        (typeof data[requiredKey] === "number" && !isValidNumberField(data[requiredKey]))
      )
        return false;
    }

    return true;
  }
};

export const isValidPersonalAddress = (address) => {
  return isValidPersonalDataObject(address, [
    "street1",
    "city",
    "country",
  ]);
}

export const isValidPersonalPhone = (phone) => {
  return isValidPersonalDataObject(phone, [
    "calling_code",
    "number",
  ]);
}

export const isValidPersonalDob = (dob) => {
  return isValidPersonalDataObject(dob, [
    "day",
    "month",
    "year"
  ]);
}

export const isValidStringField = (data) => {
  return data != null && data.length > 0
}

export const isValidNumberField = (data) => {
  return data != null
}

export const PERSONAL_BANK_VALIDATION_MAP = {
  [PERSONAL_BANK_ACCOUNT_NUMBER]: isValidStringField,
  [PERSONAL_BANK_BENEFICIARY_NAME_FIRST]: isValidStringField,
  [PERSONAL_BANK_BENEFICIARY_NAME_FULL]: isValidStringField,
  [PERSONAL_BANK_BENEFICIARY_NAME_LAST]: isValidStringField,
  [PERSONAL_BANK_BRANCH_CODE]: isValidStringField,
  [PERSONAL_BANK_BRANCH_NAME]: isValidStringField,
  [PERSONAL_BANK_BSB_NUMBER]: isValidStringField,
  [PERSONAL_BANK_CHINESE_NATIONAL_ID]: isValidStringField,
  [PERSONAL_BANK_CITY]: isValidStringField,
  [PERSONAL_BANK_CODE]: isValidStringField,
  [PERSONAL_BANK_CPF_CNPJ]: isValidStringField,
  [PERSONAL_BANK_NAME]: isValidStringField,
  [PERSONAL_BANK_PROVINCE]: isValidStringField,
  [PERSONAL_BANK_ROUTING_NUMBER]: isValidStringField,
  [PERSONAL_BANK_SWIFT_BIC]: isValidStringField,
  [PERSONAL_BANK_COUNTRY]: isValidStringField,
  [PERSONAL_BANK_PRIMARY_CURRENCY]: isValidStringField,
  [PERSONAL_BANK_BENEFICIARY_TYPE]: isValidStringField,
  [PERSONAL_BANK_BENEFICIARY_PHYSICAL_ADDRESS]: isValidPersonalAddress,
  [PERSONAL_BANK_BENEFICIARY_PHONE]: isValidPersonalPhone,
  [PERSONAL_BANK_BENEFICIARY_DOB]: isValidPersonalDob,
  [PERSONAL_BANK_ACCOUNT_TYPE]: isValidStringField,
  [PERSONAL_BANK_CLABE]: isValidStringField
}
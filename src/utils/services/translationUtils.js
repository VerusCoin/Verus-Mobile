import { WYRE_INDIVIDUAL_RESIDENCE_ADDRESS } from "../constants/services";
import { renderPersonalAddress } from "../personal/displayUtils";

export const translatePersonalBirthdayToWyre = (birthday) => {
  const { day, month, year } = birthday;
  const date = new Date(Date.UTC(year, month, day, 3, 0, 0));

  return date.toISOString().split('T')[0]
};

export const translatePersonalAddressToWyre = (address) => {
  return {
    street1: address.street1,
    street2: address.street2,
    city: address.city,
    state: address.state_province_region,
    postalCode: address.postal_code,
    country: address.country,
  };
}

export const translateWyreAddressToPersonal = (address) => {
  return {
    street1: address.street1,
    street2: address.street2,
    city: address.city,
    state_province_region: address.state,
    postal_code: address.postalCode,
    country: address.country,
  };
}

export const renderWyreDataField = (fieldId, value) => {
  if (value == null) return { title: null }
  
  switch (fieldId) {
    case WYRE_INDIVIDUAL_RESIDENCE_ADDRESS:
      return renderPersonalAddress(
        translateWyreAddressToPersonal(value)
      );
    default:
      return {
        title: value
      }
  }
}
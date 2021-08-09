import {
  PERSONAL_DOCUMENT_BANK_STATEMENT,
  PERSONAL_DOCUMENT_DRIVING_LICENSE,
  PERSONAL_DOCUMENT_GOVT_ID,
  PERSONAL_DOCUMENT_OTHER,
  PERSONAL_DOCUMENT_PASSPORT,
  PERSONAL_DOCUMENT_PASSPORT_CARD,
  PERSONAL_DOCUMENT_SUBTYPE_BACK,
  PERSONAL_DOCUMENT_SUBTYPE_FRONT,
  PERSONAL_DOCUMENT_UTILITY_BILL,
  PERSONAL_IMAGE_TYPE_SCHEMA,
} from "../constants/personal";
import {
  WYRE_INDIVIDUAL_GOVERNMENT_ID,
  WYRE_INDIVIDUAL_GOVERNMENT_ID_BACK,
  WYRE_INDIVIDUAL_GOVERNMENT_ID_DRIVING_LICENSE,
  WYRE_INDIVIDUAL_GOVERNMENT_ID_FRONT,
  WYRE_INDIVIDUAL_GOVERNMENT_ID_GOVT_ID,
  WYRE_INDIVIDUAL_GOVERNMENT_ID_PASSPORT,
  WYRE_INDIVIDUAL_GOVERNMENT_ID_PASSPORT_CARD,
  WYRE_INDIVIDUAL_PROOF_OF_ADDRESS,
  WYRE_INDIVIDUAL_RESIDENCE_ADDRESS,
} from "../constants/services";
import { renderPersonalAddress } from "../personal/displayUtils";

export const translatePersonalBirthdayToWyre = (birthday) => {
  const { day, month, year } = birthday;
  const date = new Date(Date.UTC(year, month, day, 3, 0, 0));

  return date.toISOString().split("T")[0];
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
};

export const translatePersonalDocumentToWyreUpload = (document, fieldId) => {
  const typeMap = {
    [WYRE_INDIVIDUAL_GOVERNMENT_ID]: {
      [PERSONAL_DOCUMENT_GOVT_ID]: WYRE_INDIVIDUAL_GOVERNMENT_ID_GOVT_ID,
      [PERSONAL_DOCUMENT_PASSPORT]: WYRE_INDIVIDUAL_GOVERNMENT_ID_PASSPORT,
      [PERSONAL_DOCUMENT_PASSPORT_CARD]:
        WYRE_INDIVIDUAL_GOVERNMENT_ID_PASSPORT_CARD,
      [PERSONAL_DOCUMENT_DRIVING_LICENSE]:
        WYRE_INDIVIDUAL_GOVERNMENT_ID_DRIVING_LICENSE,
    },
    [WYRE_INDIVIDUAL_PROOF_OF_ADDRESS]: {},
  };

  const subtypeMap = {
    [PERSONAL_DOCUMENT_SUBTYPE_FRONT]: WYRE_INDIVIDUAL_GOVERNMENT_ID_FRONT,
    [PERSONAL_DOCUMENT_SUBTYPE_BACK]: WYRE_INDIVIDUAL_GOVERNMENT_ID_BACK,
  };

  return {
    field: fieldId,
    uris: document.uris,
    format: "image/jpeg",
    documentType:
      document.image_type == null ||
      typeMap[fieldId] == null ||
      typeMap[fieldId][document.image_type] == null
        ? null
        : typeMap[fieldId][document.image_type],
    documentSubTypes:
      document.image_type == null ||
      PERSONAL_IMAGE_TYPE_SCHEMA[document.image_type] == null ||
      PERSONAL_IMAGE_TYPE_SCHEMA[document.image_type].images == null
        ? []
        : PERSONAL_IMAGE_TYPE_SCHEMA[document.image_type].images.map(
            (imageSchema) => subtypeMap[imageSchema.key]
          ),
  };
};

export const translateWyreAddressToPersonal = (address) => {
  return {
    street1: address.street1,
    street2: address.street2,
    city: address.city,
    state_province_region: address.state,
    postal_code: address.postalCode,
    country: address.country,
  };
};

export const renderWyreDataField = (fieldId, value) => {
  if (value == null) return { title: null };

  switch (fieldId) {
    case WYRE_INDIVIDUAL_RESIDENCE_ADDRESS:
      return renderPersonalAddress(translateWyreAddressToPersonal(value));
    default:
      return {
        title: value,
      };
  }
};

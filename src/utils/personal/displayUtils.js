import { CALLING_CODES_TO_ISO_3166 } from '../constants/callingCodes'
import { ISO_3166_COUNTRIES } from '../constants/iso3166'
import {
  PERSONAL_IMAGE_TYPE_SCHEMA,
  PERSONAL_IMAGE_SUBTYPE_SCHEMA,
} from "../constants/personal";

export const renderPersonalFullName = (name) => {
  return {
    title: `${name.first} ${
      name.middle != null && name.middle.length > 0 ? name.middle + " " : ""
    }${name.last}`
  };
};

export const renderPersonalPhoneNumber = (phone, includeEmoji = true) => {
  return {
    title: `${
      includeEmoji &&
      CALLING_CODES_TO_ISO_3166[phone.calling_code] != null &&
      ISO_3166_COUNTRIES[CALLING_CODES_TO_ISO_3166[phone.calling_code]] != null
        ? ISO_3166_COUNTRIES[CALLING_CODES_TO_ISO_3166[phone.calling_code]]
            .emoji + " "
        : ""
    }${phone.calling_code.length > 0 ? phone.calling_code : "+0"} ${
      phone.number.length > 0 ? phone.number : "000000000"
    }`,
  };
};

export const renderPersonalBirthday = (birthday) => {
  const { day, month, year } = birthday;
  const date = new Date(Date.UTC(year, month, day, 3, 0, 0));

  return {
    title: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
};

export const renderPersonalDocument = (document) => {
  return {
    description: document.description,
    title:
      document.image_type == null
        ? 'Document'
        : PERSONAL_IMAGE_TYPE_SCHEMA[document.image_type] == null
        ? "??"
        : `${PERSONAL_IMAGE_TYPE_SCHEMA[document.image_type].title}${
            document.image_subtype == null ||
            PERSONAL_IMAGE_SUBTYPE_SCHEMA[document.image_subtype] == null
              ? ""
              : ` (${PERSONAL_IMAGE_SUBTYPE_SCHEMA[
                  document.image_subtype
                ].title.toLowerCase()})`
          }`,
  };
};

export const renderPersonalEmail = (email) => {
  return {
    title: email.address
  }
}

export const renderPersonalTaxId = (taxCountry) => {
  return {
    title:
      taxCountry.tin.length > 2 ? `****${taxCountry.tin.slice(-2)}` : "****",
  };
};

export const renderPersonalAddress = (address) => {
  return {
    title: address.street1.length > 0
    ? `${address.street1}${
        address.street2.length > 0
          ? `, ${address.street2}`
          : ""
      }`
    : "Empty address",
    description: `${
      address.postal_code.length > 0
        ? `${address.postal_code} `
        : ""
    }${
      address.state_province_region.length > 0
        ? `${address.state_province_region}, `
        : ""
    }${address.city.length > 0 ? `${address.city}, ` : "Unknown City, "}${
      ISO_3166_COUNTRIES[address.country] != null
        ? `${ISO_3166_COUNTRIES[address.country].emoji} ${
            ISO_3166_COUNTRIES[address.country].name
          }`
        : "Unknown Country"
    }`
  }
}
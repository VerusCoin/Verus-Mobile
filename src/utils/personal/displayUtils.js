import React from 'react'
import { Avatar } from 'react-native-paper';
import { CALLING_CODES_TO_ISO_3166 } from '../constants/callingCodes'
import { ISO_3166_COUNTRIES } from '../constants/iso3166'
import {
  PERSONAL_IMAGE_TYPE_SCHEMA,
  PERSONAL_IMAGE_SUBTYPE_SCHEMA,
} from "../constants/personal";
var RNFS = require('react-native-fs');

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
    title: date.toUTCString().split(' ').slice(0, 4).join(' '),
  };
};

export const getPersonalImageDisplayUri = uri => {
  return uri && uri.includes('file://')
    ? uri
    : uri != null
    ? RNFS.DocumentDirectoryPath + `/${uri}`
    : '';
};

export const renderPersonalDocument = (document) => {
  const path = getPersonalImageDisplayUri(document.uris[0]);
  return {
    description: document.description,
    left: (props) => {
      return document.uris.length == 0 ? null : (
        <Avatar.Image
          {...props}
          size={96}
          source={{
            uri: path.includes("file://"),
          }}
        />
      );
    },
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
    title:
      address.street1.length > 0
        ? `${address.street1}${
            address.street2 != null && address.street2.length > 0 ? `, ${address.street2}` : ""
          }`
        : "Empty address",
    description: `${address.postal_code.length > 0 ? `${address.postal_code} ` : ""}${
      address.state_province_region.length > 0 ? `${address.state_province_region}, ` : ""
    }${address.city.length > 0 ? `${address.city}, ` : "Unknown City, "}${
      ISO_3166_COUNTRIES[address.country] != null
        ? `${ISO_3166_COUNTRIES[address.country].emoji} ${ISO_3166_COUNTRIES[address.country].name}`
        : "Unknown Country"
    }`,
  };
}

export const renderPersonalBankAccount = (account) => {
  const accountLocaleString = ISO_3166_COUNTRIES[account.country]
    ? `${ISO_3166_COUNTRIES[account.country].emoji} Account`
    : "Bank Account";
  const accountNumberString =
    account.account_number != null && account.account_number.length > 4
      ? ` ending in ${account.account_number.slice(-4)}`
      : "";
  const accountDescription = `${
    account.primary_currency != null && account.primary_currency.length > 0
      ? account.primary_currency + " "
      : ""
  }${account.account_type}`;

  return {
    title: `${accountLocaleString}${accountNumberString}`,
    description: accountDescription,
  };
};
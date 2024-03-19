import React from 'react'
import { Avatar } from 'react-native-paper';
import { CALLING_CODES_TO_ISO_3166 } from '../constants/callingCodes'
import { ISO_3166_COUNTRIES } from '../constants/iso3166'
import {
  PERSONAL_IMAGE_TYPE_SCHEMA,
  PERSONAL_IMAGE_SUBTYPE_SCHEMA,
} from "../constants/personal";
import { Platform } from 'react-native';
var RNFS = require('react-native-fs');
import { primitives } from "verusid-ts-client"
const { IDENTITYDATA_FIRSTNAME, IDENTITYDATA_LASTNAME, IDENTITYDATA_MIDDLENAME,
  BANK_ACCOUNT_COUNTRY, BANK_ACCOUNT_CURRENCY, BANK_ACCOUNT_NUMBER, BANK_ACCOUNT_TYPE} = primitives;
  const { IDENTITYDATA_HOMEADDRESS_STREET1, IDENTITYDATA_HOMEADDRESS_STREET2, IDENTITYDATA_HOMEADDRESS_CITY, IDENTITYDATA_HOMEADDRESS_REGION, IDENTITYDATA_HOMEADDRESS_POSTCODE, IDENTITYDATA_HOMEADDRESS_COUNTRY } = primitives;

export const renderPersonalFullName = (state) => {
  return {
    title: `${state[IDENTITYDATA_FIRSTNAME.vdxfid]} ${
      state[IDENTITYDATA_MIDDLENAME.vdxfid] != null && state[IDENTITYDATA_MIDDLENAME.vdxfid] > 0 ? state[IDENTITYDATA_MIDDLENAME.vdxfid] + " " : ""
    }${state[IDENTITYDATA_LASTNAME.vdxfid]}`
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
  if (uri && uri.startsWith('file://')) {
    return uri;
  } else if (uri != null) {
    const reconstructedUri = RNFS.DocumentDirectoryPath + `/${uri}`;

    if (reconstructedUri.startsWith('file://')) return reconstructedUri;
    else if (Platform.OS === 'android') return `file://${reconstructedUri}`;
    else return reconstructedUri;
  } else {
    return '';
  }
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
            uri: path,
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
      address[IDENTITYDATA_HOMEADDRESS_COUNTRY.vdxfid].length > 0
        ? `${address[IDENTITYDATA_HOMEADDRESS_STREET1.vdxfid]}${
            address[IDENTITYDATA_HOMEADDRESS_STREET2.vdxfid] != null && address[IDENTITYDATA_HOMEADDRESS_STREET2.vdxfid].length > 0 ? `, ${address[IDENTITYDATA_HOMEADDRESS_STREET2.vdxfid]}` : ""
          }`
        : "Empty address",
    description: `${address[IDENTITYDATA_HOMEADDRESS_POSTCODE.vdxfid].length > 0 ? `${address[IDENTITYDATA_HOMEADDRESS_POSTCODE.vdxfid]} ` : ""}${
      address[IDENTITYDATA_HOMEADDRESS_REGION.vdxfid]?.length > 0 ? `${address[IDENTITYDATA_HOMEADDRESS_REGION.vdxfid]}, ` : ""
    }${address[IDENTITYDATA_HOMEADDRESS_CITY.vdxfid]?.length > 0 ? `${address[IDENTITYDATA_HOMEADDRESS_CITY.vdxfid]}, ` : "Unknown City, "}${
      ISO_3166_COUNTRIES[address[IDENTITYDATA_HOMEADDRESS_COUNTRY.vdxfid]] != null
        ? `${ISO_3166_COUNTRIES[address[IDENTITYDATA_HOMEADDRESS_COUNTRY.vdxfid]].emoji} ${ISO_3166_COUNTRIES[address[IDENTITYDATA_HOMEADDRESS_COUNTRY.vdxfid]].name}`
        : "Unknown Country"
    }`,
  };
}

export const renderPersonalBankAccount = (account) => {
  const accountLocaleString = ISO_3166_COUNTRIES[account[BANK_ACCOUNT_COUNTRY.vdxfid]]
    ? `${ISO_3166_COUNTRIES[account[BANK_ACCOUNT_COUNTRY.vdxfid]].emoji} Account`
    : "Bank Account";
  const accountNumberString =
    account[BANK_ACCOUNT_NUMBER.vdxfid] != null && account[BANK_ACCOUNT_NUMBER.vdxfid].length > 4
      ? ` ending in ${account[BANK_ACCOUNT_NUMBER.vdxfid].slice(-4)}`
      : "";
  const accountDescription = `${
    account[BANK_ACCOUNT_CURRENCY.vdxfid] != null && account[BANK_ACCOUNT_CURRENCY.vdxfid].length > 0
      ? account[BANK_ACCOUNT_CURRENCY.vdxfid] + " "
      : ""
  }${account[BANK_ACCOUNT_TYPE.vdxfid]}`;

  return {
    title: `${accountLocaleString}${accountNumberString}`,
    description: accountDescription,
  };
};
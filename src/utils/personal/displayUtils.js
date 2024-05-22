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
import { requestPersonalData } from "../auth/authBox";
import {
  PERSONAL_ATTRIBUTES,
  PERSONAL_CONTACT,
  PERSONAL_LOCATIONS,
  PERSONAL_PAYMENT_METHODS,
  PERSONAL_IMAGES,
} from "../constants/personal";

import  { IdentityVdxfidMap }  from 'verus-typescript-primitives/dist/vdxf/classes/IdentityData';
import Colors from '../../globals/colors';

const { IDENTITYDATA_FIRSTNAME, IDENTITYDATA_LASTNAME, IDENTITYDATA_MIDDLENAME,
  BANK_ACCOUNT_COUNTRY, BANK_ACCOUNT_CURRENCY, BANK_ACCOUNT_NUMBER, BANK_ACCOUNT_TYPE } = primitives;
const { IDENTITYDATA_HOMEADDRESS_STREET1, IDENTITYDATA_HOMEADDRESS_STREET2, IDENTITYDATA_HOMEADDRESS_CITY, IDENTITYDATA_HOMEADDRESS_REGION, IDENTITYDATA_HOMEADDRESS_POSTCODE, IDENTITYDATA_HOMEADDRESS_COUNTRY } = primitives;
const { IDENTITYDATA_CONTACT, IDENTITYDATA_PERSONAL_DETAILS, IDENTITYDATA_LOCATIONS, IDENTITYDATA_DOCUMENTS_AND_IMAGES, IDENTITYDATA_BANKING_INFORMATION } = primitives;


export const renderPersonalFullName = (state) => {

  if (!state[IDENTITYDATA_FIRSTNAME.vdxfid] && !state[IDENTITYDATA_LASTNAME.vdxfid]) {
    return {title: "John Doe"}
  }

  return {
    title: `${state[IDENTITYDATA_FIRSTNAME.vdxfid] || ""} ${state[IDENTITYDATA_MIDDLENAME.vdxfid] != null && state[IDENTITYDATA_MIDDLENAME.vdxfid] > 0 ? state[IDENTITYDATA_MIDDLENAME.vdxfid] + " " : ""
      }${state[IDENTITYDATA_LASTNAME.vdxfid] || ""}`
  };
};

export const renderPersonalPhoneNumber = (phone, includeEmoji = true) => {
  return {
    title: `${includeEmoji &&
      CALLING_CODES_TO_ISO_3166[phone.calling_code] != null &&
      ISO_3166_COUNTRIES[CALLING_CODES_TO_ISO_3166[phone.calling_code]] != null
      ? ISO_3166_COUNTRIES[CALLING_CODES_TO_ISO_3166[phone.calling_code]]
        .emoji + " "
      : ""
      }${phone.calling_code.length > 0 ? phone.calling_code : "+0"} ${phone.number.length > 0 ? phone.number : "000000000"
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
          : `${PERSONAL_IMAGE_TYPE_SCHEMA[document.image_type].title}${document.image_subtype == null ||
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
        ? `${address[IDENTITYDATA_HOMEADDRESS_STREET1.vdxfid]}${address[IDENTITYDATA_HOMEADDRESS_STREET2.vdxfid] != null && address[IDENTITYDATA_HOMEADDRESS_STREET2.vdxfid].length > 0 ? `, ${address[IDENTITYDATA_HOMEADDRESS_STREET2.vdxfid]}` : ""
        }`
        : "Empty address",
    description: `${address[IDENTITYDATA_HOMEADDRESS_POSTCODE.vdxfid].length > 0 ? `${address[IDENTITYDATA_HOMEADDRESS_POSTCODE.vdxfid]} ` : ""}${address[IDENTITYDATA_HOMEADDRESS_REGION.vdxfid]?.length > 0 ? `${address[IDENTITYDATA_HOMEADDRESS_REGION.vdxfid]}, ` : ""
      }${address[IDENTITYDATA_HOMEADDRESS_CITY.vdxfid]?.length > 0 ? `${address[IDENTITYDATA_HOMEADDRESS_CITY.vdxfid]}, ` : "Unknown City, "}${ISO_3166_COUNTRIES[address[IDENTITYDATA_HOMEADDRESS_COUNTRY.vdxfid]] != null
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
  const accountDescription = `${account[BANK_ACCOUNT_CURRENCY.vdxfid] != null && account[BANK_ACCOUNT_CURRENCY.vdxfid].length > 0
    ? account[BANK_ACCOUNT_CURRENCY.vdxfid] + " "
    : ""
    }${account[BANK_ACCOUNT_TYPE.vdxfid]}`;

  return {
    title: `${accountLocaleString}${accountNumberString}`,
    description: accountDescription,
  };
};

/********************************/
// template defaultPersonalProfileDataTemplate in the order:
// new PersonalDataCategory(),
// new ContactDataCategory(),
// new LocationDataCategory(),
// new BankingDataCategory(),
// new DocumentsCategory()
/********************************/

export const checkPersonalDataCatagories = async (profileDataRequested = []) => {
  let success = true;
  await Promise.all(Object.keys(profileDataRequested).map(async (permission) => {
    let errorDetails = "";
    let profiletype;
    let optionalKeys = {}
    let attributes = {};
    switch (permission) {

      case IDENTITYDATA_PERSONAL_DETAILS.vdxfid:
        attributes = await requestPersonalData(PERSONAL_ATTRIBUTES);
        optionalKeys = { [primitives.IDENTITYDATA_MIDDLENAME.vdxfid]: true };
        profiletype = primitives.defaultPersonalProfileDataTemplate[0].data;
        break;
      case IDENTITYDATA_CONTACT.vdxfid:
        attributes = await requestPersonalData(PERSONAL_CONTACT);
        profiletype = primitives.defaultPersonalProfileDataTemplate[1].data;
        break;
      case IDENTITYDATA_LOCATIONS.vdxfid:
        const locationReply = await requestPersonalData(PERSONAL_LOCATIONS);
        attributes = locationReply.physical_addresses && locationReply.physical_addresses.length > 0 ? locationReply.physical_addresses[0] : {};
        optionalKeys = { [primitives.IDENTITYDATA_HOMEADDRESS_STREET2.vdxfid]: true };
        profiletype = primitives.defaultPersonalProfileDataTemplate[2].data;
        break;
      case IDENTITYDATA_BANKING_INFORMATION.vdxfid:
        const bankRetval = await checkBankAccountPresent();
        attributes = bankRetval.attributes;
        profiletype = bankRetval.profiletype;
        break;
      case IDENTITYDATA_DOCUMENTS_AND_IMAGES.vdxfid:
        const retval = await checkDocumentsPresent();
        attributes = retval.attributes;
        profiletype = retval.profiletype;
        break;
    }

    profiletype.forEach((templateCategory) => {
      const one = attributes[templateCategory.vdxfkey];
      if (!optionalKeys[templateCategory.vdxfkey] && ((typeof one === 'object' && Array.isArray(one) && one.length === 0) ||
        (typeof one === 'object' && Object.keys(one).length === 0) ||
        (typeof one === 'string' && one.length === 0)
        || one == undefined)) {
        errorDetails += (errorDetails ? ", " : "") +`${IdentityVdxfidMap[templateCategory.vdxfkey]?.name || templateCategory.vdxfkey}`;
      }
    })

    if (errorDetails.length > 0) {
      profileDataRequested[permission].details = "Missing Information: " + errorDetails;
      profileDataRequested[permission].color = Colors.warningButtonColor;
      success = false;
    } 

  }));
  return success;
}

export const checkBankAccountPresent = async () => {

  const paymentMethods = await requestPersonalData(PERSONAL_PAYMENT_METHODS);

  if (!paymentMethods.bank_accounts || paymentMethods.bank_accounts.length === 0) {
    return { profiletype: [{ vdxfkey: primitives.BANK_ACCOUNT.vdxfid }], attributes: { [primitives.BANK_ACCOUNT.vdxfid]: "" } };
  }
  return { profiletype: [{ vdxfkey: primitives.BANK_ACCOUNT.vdxfid }], attributes: { [primitives.BANK_ACCOUNT.vdxfid]: "OK" } };
}

export const checkDocumentsPresent = async () => {

  const images = await requestPersonalData(PERSONAL_IMAGES);

  if (!images.documents || images.documents.length === 0) {
    return { profiletype: [{ vdxfkey: primitives.IDENTITYDATA_DOCUMENTS_AND_IMAGES.vdxfid }], attributes: { [primitives.IDENTITYDATA_DOCUMENTS_AND_IMAGES.vdxfid]: "" }};
  }
  return { profiletype: [{ vdxfkey: primitives.IDENTITYDATA_DOCUMENTS_AND_IMAGES.vdxfid }], attributes: { [primitives.IDENTITYDATA_DOCUMENTS_AND_IMAGES.vdxfid]: "OK" }};

}

export const checkPersonalDataKeys = () => { }
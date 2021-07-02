/*
  The personal reducer stores the user's personal profile
*/

import {
  SIGN_OUT, 
  SET_PERSONAL_DATA
} from "../utils/constants/storeType";

// Personal Contact:
// {
//   emails: [],
//   phone_numbers: [],
// }

// Personal Attributes:
// {
//   name: {
//     first: null,
//     middle: null,
//     last: null
//   },
//   birthday: {
//     day: null,
//     month: null,
//     year: null
//   },
//   nationalities: []
// }

export const personal = (
  state = {
    // Encrypted string containing stringified JSON of personal attributes
    attributes: null,
    contact: null
  },
  action
) => {
  switch (action.type) {
    case SET_PERSONAL_DATA:
      return action.data
    case SIGN_OUT:
      return {
        attributes: null
      }
    default:
      return state;
  }
};

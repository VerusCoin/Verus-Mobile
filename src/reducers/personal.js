/*
  The personal reducer stores the user's personal profile
*/

import {
  SIGN_OUT, 
  SET_PERSONAL_DATA
} from "../utils/constants/storeType";

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
//   email: null,
//   sex: null,
//   tax_country: null,
//   tax_state: null,
//   tax_id_number: null
// }

export const personal = (
  state = {
    // Encrypted string containing stringified JSON of personal attributes
    attributes: null
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

import {SIGN_OUT, SET_ATTESTATION_DATA} from '../utils/constants/storeType';

export const attestation = (
  state = {
    attestations: null
  },
  action,
) => {
  switch (action.type) {
    case SET_ATTESTATION_DATA:
      return action.data;
    case SIGN_OUT:
      return {
        attestations: null
      };
    default:
      return state;
  }
};

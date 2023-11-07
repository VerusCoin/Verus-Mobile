import {
  SET_CURRENT_WYRE_ACCOUNT_DATA,
  SET_SERVICE_STORED_DATA,
  SET_SERVICE_LOADING,
  SET_WYRE_ACCOUNT_ID,
  SET_VALU_ACCOUNT_ID,
  SET_CURRENT_VALU_ACCOUNT_DATA,
  SET_VALU_ACCOUNT_STAGE,
  SET_VALU_AMOUNT_FUNDED
} from "../../../../utils/constants/storeType";

export const setServiceStored = (data) => {
  return {
    type: SET_SERVICE_STORED_DATA,
    payload: {
      data,
    },
  };
};

export const setWyreAccountId = (accountId) => {
  return {
    type: SET_WYRE_ACCOUNT_ID,
    payload: {
      accountId,
    },
  };
};

export const setServiceLoading = (loading, service) => {
  return {
    type: SET_SERVICE_LOADING,
    payload: {
      loading,
      service
    },
  };
}

export const setCurrentWyreAccountDataScreenParams = (accountData) => {
  return {
    type: SET_CURRENT_WYRE_ACCOUNT_DATA,
    payload: {
      accountData,
    },
  };
}

export const setCurrentValuAccountDataScreenParams = (accountData) => {
  return {
    type: SET_CURRENT_VALU_ACCOUNT_DATA,
    payload: {
      accountData,
    },
  };
}

export const setValuAccount = (account) => {
  return {
    type: SET_VALU_ACCOUNT_ID,
    payload: {
      ...account,
    },
  };
};

export const setValuAccountStage = (KYCState) => {
  return {
    type: SET_VALU_ACCOUNT_STAGE,
    payload: {
      KYCState,
    },
  };
};

export const setValuAmountFunded = (amountFunded) => {
  return {
    type: SET_VALU_AMOUNT_FUNDED,
    payload: {
      amountFunded: amountFunded,
    },
  };
};
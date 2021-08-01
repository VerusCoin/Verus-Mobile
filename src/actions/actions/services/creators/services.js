import {
  SET_CURRENT_WYRE_ACCOUNT_DATA,
  SET_SERVICE_AUTH,
  SET_SERVICE_DATA,
  SET_SERVICE_LOADING,
  SET_WYRE_ACCOUNT_ID,
} from "../../../../utils/constants/storeType";

export const setServiceAuth = (service, data) => {
  return {
    type: SET_SERVICE_AUTH,
    payload: {
      service,
      data,
    },
  };
};

export const setServiceData = (service, data) => {
  return {
    type: SET_SERVICE_DATA,
    payload: {
      service,
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

export const setServiceLoading = (loading) => {
  return {
    type: SET_SERVICE_LOADING,
    payload: {
      loading,
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
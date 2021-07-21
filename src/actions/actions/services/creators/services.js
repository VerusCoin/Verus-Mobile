import { SET_SERVICE_AUTH, SET_SERVICE_DATA } from "../../../../utils/constants/storeType"

export const setServiceAuth = (service, data) => {
  return {
    type: SET_SERVICE_AUTH,
    payload: {
      service,
      data
    }
  }
}

export const setServiceData = (service, data) => {
  return {
    type: SET_SERVICE_DATA,
    payload: {
      service,
      data
    }
  }
}
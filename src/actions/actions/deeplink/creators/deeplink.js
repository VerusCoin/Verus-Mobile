import { SET_DEEPLINK_DATA, SET_DEEPLINK_URL } from "../../../../utils/constants/storeType"

export const setDeeplinkUrl = (url) => {
  return {
    type: SET_DEEPLINK_URL,
    payload: { url }
  }
}

export const setDeeplinkData = (id, data) => {
  return {
    type: SET_DEEPLINK_DATA,
    payload: { id, data }
  }
}
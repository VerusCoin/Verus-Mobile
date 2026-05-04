import { SET_DEEPLINK_DATA, SET_DEEPLINK_URL } from "../../../../utils/constants/storeType"

export const setDeeplinkUrl = (url) => {
  return {
    type: SET_DEEPLINK_URL,
    payload: { url }
  }
}

export const setDeeplinkData = (
  id,
  data,
  fromService = null,
  passthrough = null,
) => {
  return {
    type: SET_DEEPLINK_DATA,
    payload: { id, data, fromService, passthrough }
  }
}

export const resetDeeplinkData = () => {
  return {
    type: SET_DEEPLINK_DATA,
    payload: { id: null, data: {}, fromService: null, passthrough: null}
  }
}

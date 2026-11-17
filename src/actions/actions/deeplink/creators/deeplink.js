import {
  SET_DEEPLINK_DATA,
  SET_DEEPLINK_PASSTHROUGH_DATA,
  SET_DEEPLINK_URL,
} from "../../../../utils/constants/storeType"

export const setDeeplinkUrl = (url, passthrough = null) => {
  return {
    type: SET_DEEPLINK_URL,
    payload: { url, passthrough }
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

export const resetDeeplinkData = expectedRequestId => {
  return {
    type: SET_DEEPLINK_DATA,
    payload: {id: null, data: {}, fromService: null, passthrough: null,
      ...(expectedRequestId == null ? {} : {expectedRequestId})}
  }
}

// Replaces the open request's passthrough without opening it again.
export const setDeeplinkPassthroughData = passthrough => {
  return {
    type: SET_DEEPLINK_PASSTHROUGH_DATA,
    payload: { passthrough }
  }
}

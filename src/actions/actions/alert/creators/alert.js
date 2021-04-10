import { PUSH_ALERT, SET_ACTIVE_ALERT, SHIFT_ALERTS } from "../../../../utils/constants/storeType"

export const pushAlert = (id) => {
  return {
    type: PUSH_ALERT,
    payload: {
      alert: id
    }
  }
}

export const shiftAlerts = () => {
  return {
    type: SHIFT_ALERTS,
  }
}

export const setActiveAlert = (activeAlert) => {
  return {
    type: SET_ACTIVE_ALERT,
    payload: {
      activeAlert
    }
  }
}

export const completeAlert = (result) => {
  return {
    type: SET_ACTIVE_ALERT,
    payload: {
      activeAlert: null,
      result
    }
  }
}
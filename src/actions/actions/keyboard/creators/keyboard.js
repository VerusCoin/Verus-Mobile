import { SET_KEYBOARD_HEIGHT } from "../../../../utils/constants/storeType"

export const setKeyboardHeight = (height) => {
  return {
    type: SET_KEYBOARD_HEIGHT,
    payload: { height }
  }
}
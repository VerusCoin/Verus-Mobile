import { Keyboard, Platform } from "react-native"
import store from "../../../../store";
import { setKeyboardActive, setKeyboardHeight } from "../creators/keyboard";

const dispatchKeyboardHeight = (e) => store.dispatch(setKeyboardHeight(e.endCoordinates.height))

const dispatchKeyboardActive = (active) => store.dispatch(setKeyboardActive(active))

export const activateKeyboardListener = () => {
  const keyboardHideEvent = Platform.OS === 'android' ? "keyboardDidHide" : "keyboardWillHide"

  Keyboard.removeAllListeners("keyboardDidShow")
  Keyboard.removeAllListeners(keyboardHideEvent)
  
  Keyboard.addListener(
    "keyboardDidShow",
    (e) => {
      dispatchKeyboardHeight(e)
      dispatchKeyboardActive(true)
    }
  );

  Keyboard.addListener(
    keyboardHideEvent,
    () => {
      dispatchKeyboardActive(false)
    }
  );

  if (Platform.OS === 'ios') {
    Keyboard.removeAllListeners("keyboardWillShow")
    
    Keyboard.addListener(
      "keyboardWillShow",
      () => {
        dispatchKeyboardActive(true)
      }
    );
  }
}
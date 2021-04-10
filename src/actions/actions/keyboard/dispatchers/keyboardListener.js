import { Keyboard } from "react-native"
import store from "../../../../store";
import { setKeyboardHeight } from "../creators/keyboard";

const dispatchKeyboardHeight = (e) => store.dispatch(setKeyboardHeight(e.endCoordinates.height))

export const activateKeyboardListener = () => {
  Keyboard.removeAllListeners("keyboardDidShow")
  
  Keyboard.addListener(
    "keyboardDidShow",
    (e) => {
      dispatchKeyboardHeight(e)
    }
  );
}
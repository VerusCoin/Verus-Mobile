import { Linking } from "react-native"
import store from "../../../../store";
import { setDeeplinkUrl } from "../creators/deeplink";

const dispatchDeeplinkUrl = (url) => store.dispatch(setDeeplinkUrl(url))

export const updateDeeplinkUrl = async () => {
  const url = await Linking.getInitialURL()

  dispatchDeeplinkUrl(url)
}
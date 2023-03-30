import { Linking } from "react-native"

export const openUrl = (url) => {
  try {
    if (url != null) {
      Linking.openURL(url)
    }
  } catch(e) {
    console.warn(e)
  }
}
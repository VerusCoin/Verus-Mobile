import * as Keychain from 'react-native-keychain';
import { INTERNAL_APP_ID } from '../../../env/index'
import { Platform } from 'react-native'

const SERVER_NAME = `${INTERNAL_APP_ID}_Session`

export const getBiometricPassword = async (accountHash, title = "Authenticate to retreive password") => {
  const credentials = await Keychain.getGenericPassword({
    authenticationPrompt: { title }
  });

  if (credentials != null) return (JSON.parse(credentials.password))[accountHash]
  else throw new Error("Biometric authentication not enabled on this device!")
}

export const getSessionPassword = async (title = "Authenticate Profile") => {
  const credentials = await Keychain.getInternetCredentials(SERVER_NAME, {
    authenticationPrompt: { title }
  });

  if (credentials != null) return credentials.password
  else throw new Error("Failed to retrieve session password")
}

export const setSessionPassword = async (password) => {
  await Keychain.setInternetCredentials(
    SERVER_NAME,
    INTERNAL_APP_ID,
    password,
    {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }
  );
}

export const removeSessionPassword = async () => {
  await Keychain.resetInternetCredentials(SERVER_NAME)
}

export const storeBiometricPassword = async (accountHash, password) => {
  let credentials = {}

  try {
    const unparsedCredentials = await Keychain.getGenericPassword({
      authenticationPrompt: { title: "Authenticate to store password in biometric keychain" }
    })

    if (unparsedCredentials !== false) {
      credentials = JSON.parse(unparsedCredentials.password);
    }
  } catch (e) {
    console.warn(e)
    throw e
  }

  await Keychain.setGenericPassword(INTERNAL_APP_ID, JSON.stringify({ ...credentials, [accountHash]: password }), {
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
  })
}

export const removeBiometricPassword = async (accountHash) => {
  let credentials = {}

  try {
    const unparsedCredentials = await Keychain.getGenericPassword({
      authenticationPrompt: { title: "Authenticate to remove password in biometric keychain" }
    })

    credentials = JSON.parse(unparsedCredentials.password);
  } catch (e) {
    console.warn(e)
  }

  delete credentials[accountHash]

  await Keychain.setGenericPassword(INTERNAL_APP_ID, JSON.stringify(credentials), {
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
  })
}

export const getSupportedBiometryType = async () => {
  const biometryType = await Keychain.getSupportedBiometryType()

  switch (biometryType) {
    case Keychain.BIOMETRY_TYPE.TOUCH_ID:
      return {
        display_name: "Touch ID",
        biometry: await passesSecurityThreshold()
      }
    case Keychain.BIOMETRY_TYPE.FACE_ID:
      return {
        display_name: "Face ID",
        biometry: await passesSecurityThreshold()
      }
    case Keychain.BIOMETRY_TYPE.FINGERPRINT:
      return {
        display_name: "Fingerprint",
        biometry: await passesSecurityThreshold()
      }
    case Keychain.BIOMETRY_TYPE.IRIS:
      return {
        display_name: "Iris Recognition",
        biometry: await passesSecurityThreshold()
      }
    case Keychain.BIOMETRY_TYPE.FACE:
      return {
        display_name: "Facial Recognition",
        biometry: await passesSecurityThreshold()
      }
    default:
      return {
        display_name: "None",
        biometry: false
      }
  }
}

export const passesSecurityThreshold = async () => {
  if (Platform.OS == 'ios') return true
  else return false
  
  //TODO: RE-Enable Biometry on Android when it can be forced to prompt every login
  // const securityLevel = await Keychain.getSecurityLevel({ accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY })

  // return securityLevel == Keychain.SECURITY_LEVEL[BIOMETRIC_SECURITY_THRESHOLD]
}
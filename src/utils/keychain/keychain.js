import * as Keychain from 'react-native-keychain';
import { INTERNAL_APP_ID, BIOMETRIC_SECURITY_THRESHOLD } from '../../../env/index'
import { Platform } from 'react-native'
import { randomBytes } from '../crypto/randomBytes';

const INCLUDE_SERVICE = Platform.OS === 'android'

// This credential key is used to encrypt 'hot' data stored in the redux store that 
// we don't want to be exposed unless it is requested
const SESSION_CREDENTIAL_KEY = `${INTERNAL_APP_ID}_Session`

// This credential key is used to encrypt data in async storage to protect access to it 
// in case of password bruteforce
const PERSISTENT_CREDENTIAL_KEY = `${INTERNAL_APP_ID}_Persistent`

// This credential key is used to encrypt the data retrievable through biometric auth
const BIOMETRIC_CREDENTIAL_KEY = `${INTERNAL_APP_ID}_Biometric`

const DEFAULT_GENERIC_PASSWORD_KEY = 'default'

const getInternetCredential = async (credentialKey, title) => {
  const credentials = await Keychain.getInternetCredentials(credentialKey, INCLUDE_SERVICE ? {
    service: 'com.verus.verusmobile',
    authenticationPrompt: { title }
  } : {
    authenticationPrompt: { title }
  });

  if (credentials != null) return credentials.password
  else throw new Error(`Failed to retrieve credential for ${credentialKey}`)
}

const setInternetCredential = (credentialKey, value) => {
  return Keychain.setInternetCredentials(
    credentialKey,
    INTERNAL_APP_ID,
    value,
    {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }
  );
}

const removeInternetCredential = (credentialKey) => {
  return Keychain.resetInternetCredentials(credentialKey)
}

const getGenericCredential = async (credentialKey = DEFAULT_GENERIC_PASSWORD_KEY) => {
  const credentials = await Keychain.getGenericPassword({
    service: credentialKey
  });

  if (credentials != null) return credentials.password
  else throw new Error(`Failed to retrieve credential for ${credentialKey}`)
}

const setGenericCredential = (credentialKey = DEFAULT_GENERIC_PASSWORD_KEY, value) => {
  return Keychain.setGenericPassword(INTERNAL_APP_ID, value, {
    service: credentialKey,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  })
}

const removeGenericCredential = (credentialKey = DEFAULT_GENERIC_PASSWORD_KEY) => {
  return Keychain.resetGenericPassword({
    service: credentialKey
  })
}

export const getPersistentCredential = () => {
  return getGenericCredential(PERSISTENT_CREDENTIAL_KEY);
}

export const setPersistentCredential = (value) => {
  return setGenericCredential(PERSISTENT_CREDENTIAL_KEY, value);
}

export const removePersistentCredential = async () => {
  return removeGenericCredential(PERSISTENT_CREDENTIAL_KEY)
}

export const generatePersistentCredential = async () => {
  return await saveNewPersistentCredential(await randomBytes(128))
}

export const saveNewPersistentCredential = async (credBuf) => {
  if (!Buffer.isBuffer(credBuf)) throw new Error("Credential is not buffer")

  const credString = credBuf.toString('base64');

  const originalCred = await getPersistentCredential();
  await setPersistentCredential(credString);
  const retrievedCred = await getPersistentCredential();

  if (retrievedCred !== credString) {
    await setPersistentCredential(originalCred);
    throw new Error("Loaded credential does not equal set credential, reset cred")
  }

  return retrievedCred
}

export const getSessionCredential = (title = "Authenticate Profile") => {
  return getInternetCredential(SESSION_CREDENTIAL_KEY, title);
}

export const setSessionCredential = (password) => {
  return setInternetCredential(SESSION_CREDENTIAL_KEY, password);
}

export const removeSessionCredential = async () => {
  return removeInternetCredential(SESSION_CREDENTIAL_KEY)
}

export const getBiometricCredential = async (title = "Authenticate to retrieve password") => {
  const credentials = await Keychain.getGenericPassword({
    service: BIOMETRIC_CREDENTIAL_KEY,
    authenticationPrompt: { title }
  });

  if (credentials != null) return credentials.password
  else throw new Error(`Failed to retrieve biometric credential`)
}

export const setBiometricCredential = (value) => {
  return Keychain.setGenericPassword(INTERNAL_APP_ID, value, {
    service: BIOMETRIC_CREDENTIAL_KEY,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
  })
}

export const generateBiometricCredential = async () => {
  const bytes = await randomBytes(128);
  if (!Buffer.isBuffer(bytes)) throw new Error("Credential is not buffer");

  return await setBiometricCredential(bytes.toString('base64'))
}

export const removeBiometricCredential = () => {
  return Keychain.resetGenericPassword({
    service: BIOMETRIC_CREDENTIAL_KEY
  })
}

export const getLegacyBiometricData = async (title = "Authenticate to retrieve password") => {
  const credentials = await Keychain.getGenericPassword(INCLUDE_SERVICE ? {
    service: 'com.verus.verusmobile',
    authenticationPrompt: { title }
  } : {
    authenticationPrompt: { title }
  });

  if (credentials != null) return (JSON.parse(credentials.password))
  else throw new Error("Biometric authentication not enabled on this device!")
}

export const getLegacyBiometricPassword = async (accountHash, title = "Authenticate to retrieve password") => {
  const credentials = await Keychain.getGenericPassword(INCLUDE_SERVICE ? {
    service: 'com.verus.verusmobile',
    authenticationPrompt: { title }
  } : {
    authenticationPrompt: { title }
  });

  if (credentials != null) return (JSON.parse(credentials.password))[accountHash]
  else throw new Error("Biometric authentication not enabled on this device!")
}

export const storeLegacyBiometricPassword = async (accountHash, password) => {
  let credentials = {}

  try {
    const unparsedCredentials = await Keychain.getGenericPassword(
      INCLUDE_SERVICE
        ? {
            service: "com.verus.verusmobile",
            authenticationPrompt: {
              title: "Authenticate to store password in biometric keychain",
            },
          }
        : {
            authenticationPrompt: {
              title: "Authenticate to store password in biometric keychain",
            },
          }
    );

    if (unparsedCredentials !== false) {
      credentials = JSON.parse(unparsedCredentials.password);
    }
  } catch (e) {
    console.warn(e)
    throw e
  }

  await Keychain.setGenericPassword(INTERNAL_APP_ID, JSON.stringify({ ...credentials, [accountHash]: password }), INCLUDE_SERVICE ? {
    service: 'com.verus.verusmobile',
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
  } : {
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
  })
}

export const removeLegacyBiometricPassword = async (accountHash) => {
  let credentials = {}

  try {
    const unparsedCredentials = await Keychain.getGenericPassword(INCLUDE_SERVICE ? {
      service: 'com.verus.verusmobile',
      authenticationPrompt: { title: "Authenticate to remove password in biometric keychain" }
    } : {
      authenticationPrompt: { title: "Authenticate to remove password in biometric keychain" }
    })

    credentials = JSON.parse(unparsedCredentials.password);
  } catch (e) {
    console.warn(e)
  }

  delete credentials[accountHash]

  await Keychain.setGenericPassword(INTERNAL_APP_ID, JSON.stringify(credentials), INCLUDE_SERVICE ? {
    service: 'com.verus.verusmobile',
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
  } : {
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
  })
}

export const removeAllLegacyBiometricPasswords = async () => {
  await Keychain.setGenericPassword(INTERNAL_APP_ID, "{}", INCLUDE_SERVICE ? {
    service: 'com.verus.verusmobile',
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
  } : {
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
  const securityLevel = await Keychain.getSecurityLevel({
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
  });

  return securityLevel == Keychain.SECURITY_LEVEL[BIOMETRIC_SECURITY_THRESHOLD]
}
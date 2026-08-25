import * as Keychain from 'react-native-keychain';
import {
  INTERNAL_APP_ID,
  BIOMETRIC_SECURITY_THRESHOLD,
} from '../../../env/index';
import {NativeModules, Platform} from 'react-native';
import {randomBytes} from '../crypto/randomBytes';

const INCLUDE_SERVICE = Platform.OS === 'android';

// This credential key is used to encrypt 'hot' data stored in the redux store that
// we don't want to be exposed unless it is requested
const SESSION_CREDENTIAL_KEY = `${INTERNAL_APP_ID}_Session`;

// This credential key is used to encrypt data in async storage to protect access to it
// in case of password bruteforce
const PERSISTENT_CREDENTIAL_KEY = `${INTERNAL_APP_ID}_Persistent`;

// This credential key is used to encrypt the data retrievable through biometric auth
const BIOMETRIC_CREDENTIAL_KEY = `${INTERNAL_APP_ID}_BiometricCurrentSetV1`;
const PRE_CURRENT_SET_BIOMETRIC_CREDENTIAL_KEY = `${INTERNAL_APP_ID}_Biometric`;
const BIOMETRIC_CURRENT_SET_SERVICE =
  'com.verus.verusmobile.biometric.currentset.v1';
const PRE_CURRENT_SET_LEGACY_BIOMETRIC_SERVICE = 'com.verus.verusmobile';

export const ANDROID_BIOMETRIC_CREDENTIAL_STATUS = Object.freeze({
  VALID: 'VALID',
  MISSING: 'MISSING',
  INVALIDATED: 'INVALIDATED',
});

export const BIOMETRIC_ENROLLMENT_CHANGED_ERROR_CODE =
  'BIOMETRIC_ENROLLMENT_CHANGED';
export const BIOMETRIC_ENROLLMENT_PROTECTION_ERROR_CODE =
  'BIOMETRIC_ENROLLMENT_PROTECTION_UNAVAILABLE';
export const BIOMETRIC_PASSWORD_NOT_FOUND_ERROR_CODE =
  'BIOMETRIC_PASSWORD_NOT_FOUND';

export const createBiometricPasswordNotFoundError = (
  accountHash,
  cause = null,
) => {
  const error = new Error(
    'No biometric password is stored for this profile.',
  );
  error.code = BIOMETRIC_PASSWORD_NOT_FOUND_ERROR_CODE;
  error.accountHash = accountHash;
  if (cause != null) error.cause = cause;
  return error;
};

export const isBiometricPasswordNotFoundError = error =>
  error?.code === BIOMETRIC_PASSWORD_NOT_FOUND_ERROR_CODE;

const DEFAULT_GENERIC_PASSWORD_KEY = 'default';

const getInternetCredential = async (credentialKey, title) => {
  const credentials = await Keychain.getInternetCredentials(
    credentialKey,
    INCLUDE_SERVICE
      ? {
          service: 'com.verus.verusmobile',
          authenticationPrompt: {title},
        }
      : {
          authenticationPrompt: {title},
        },
  );

  if (credentials !== false && credentials != null) return credentials.password;
  else throw new Error(`Failed to retrieve credential for ${credentialKey}`);
};

const setInternetCredential = (credentialKey, value) => {
  return Keychain.setInternetCredentials(
    credentialKey,
    INTERNAL_APP_ID,
    value,
    {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    },
  );
};

const removeInternetCredential = credentialKey => {
  return Keychain.resetInternetCredentials(credentialKey);
};

const getOptionalGenericCredential = async (
  credentialKey = DEFAULT_GENERIC_PASSWORD_KEY,
) => {
  const credentials = await Keychain.getGenericPassword({
    service: credentialKey,
  });

  if (credentials !== false && credentials != null) return credentials.password;
  else return null;
};

const setGenericCredential = (
  credentialKey = DEFAULT_GENERIC_PASSWORD_KEY,
  value,
) => {
  return Keychain.setGenericPassword(INTERNAL_APP_ID, value, {
    service: credentialKey,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

const removeGenericCredential = (
  credentialKey = DEFAULT_GENERIC_PASSWORD_KEY,
) => {
  return Keychain.resetGenericPassword({
    service: credentialKey,
  });
};

export const getPersistentCredential = () => {
  return getOptionalGenericCredential(PERSISTENT_CREDENTIAL_KEY);
};

export const setPersistentCredential = value => {
  return setGenericCredential(PERSISTENT_CREDENTIAL_KEY, value);
};

export const removePersistentCredential = async () => {
  return removeGenericCredential(PERSISTENT_CREDENTIAL_KEY);
};

export const generatePersistentCredential = async () => {
  return await saveNewPersistentCredential(await randomBytes(128));
};

export const saveNewPersistentCredential = async credBuf => {
  if (!Buffer.isBuffer(credBuf)) throw new Error('Credential is not buffer');

  const credString = credBuf.toString('base64');

  const originalCred = await getPersistentCredential();
  await setPersistentCredential(credString);
  const retrievedCred = await getPersistentCredential();

  if (retrievedCred !== credString) {
    if (originalCred != null) {
      await setPersistentCredential(originalCred);
    } else {
      await removePersistentCredential();
    }

    throw new Error(
      'Loaded credential does not equal set credential, reset cred',
    );
  }

  return retrievedCred;
};

export const getSessionCredential = (title = 'Authenticate Profile') => {
  return getInternetCredential(SESSION_CREDENTIAL_KEY, title);
};

export const setSessionCredential = password => {
  return setInternetCredential(SESSION_CREDENTIAL_KEY, password);
};

export const removeSessionCredential = async () => {
  return removeInternetCredential(SESSION_CREDENTIAL_KEY);
};

const getAndroidBiometricEnrollmentModule = () => {
  const enrollmentModule = NativeModules.VerusBiometricEnrollment;

  if (
    enrollmentModule == null ||
    typeof enrollmentModule.getEnrollmentBoundCredentialStatus !== 'function' ||
    typeof enrollmentModule.setEnrollmentBoundCredential !== 'function' ||
    typeof enrollmentModule.getEnrollmentBoundCredential !== 'function' ||
    typeof enrollmentModule.removeEnrollmentBoundCredential !== 'function'
  ) {
    const error = new Error(
      'Biometric enrollment protection is unavailable on this device.',
    );
    error.code = BIOMETRIC_ENROLLMENT_PROTECTION_ERROR_CODE;
    throw error;
  }

  return enrollmentModule;
};

const removeAndroidBiometricEnrollmentKey = async () => {
  if (Platform.OS !== 'android') return;

  const enrollmentModule = getAndroidBiometricEnrollmentModule();
  await enrollmentModule.removeEnrollmentBoundCredential();
};

const throwEnrollmentChanged = cause => {
  const error = new Error(
    'Biometric enrollment changed. Re-enable biometric authentication with your wallet password.',
  );
  error.code = BIOMETRIC_ENROLLMENT_CHANGED_ERROR_CODE;
  error.cause = cause;
  throw error;
};

export const getAndroidBiometricCredentialStatus = async () => {
  if (Platform.OS !== 'android') {
    return ANDROID_BIOMETRIC_CREDENTIAL_STATUS.MISSING;
  }
  const enrollmentModule = getAndroidBiometricEnrollmentModule();
  let status;

  try {
    status = await enrollmentModule.getEnrollmentBoundCredentialStatus();
  } catch (cause) {
    const error = new Error(
      'Unable to verify biometric enrollment. Use your wallet password instead.',
    );
    error.code = BIOMETRIC_ENROLLMENT_PROTECTION_ERROR_CODE;
    error.cause = cause;
    throw error;
  }

  if (!Object.values(ANDROID_BIOMETRIC_CREDENTIAL_STATUS).includes(status)) {
    const error = new Error(
      'Android returned an invalid biometric enrollment status.',
    );
    error.code = BIOMETRIC_ENROLLMENT_PROTECTION_ERROR_CODE;
    error.nativeStatus = status;
    throw error;
  }

  return status;
};

export const assertAndroidBiometricEnrollmentUnchanged = async () => {
  if (Platform.OS !== 'android') return true;

  const status = await getAndroidBiometricCredentialStatus();
  if (status !== ANDROID_BIOMETRIC_CREDENTIAL_STATUS.VALID) {
    throwEnrollmentChanged();
  }
  return true;
};

export const isBiometricEnrollmentChangedError = error =>
  error?.code === BIOMETRIC_ENROLLMENT_CHANGED_ERROR_CODE;

export const isBiometricEnrollmentProtectionError = error => {
  return (
    isBiometricEnrollmentChangedError(error) ||
    error?.code === BIOMETRIC_ENROLLMENT_PROTECTION_ERROR_CODE
  );
};

export const getBiometricCredential = async (
  title = 'Authenticate to retrieve password',
) => {
  if (Platform.OS === 'android') {
    await assertAndroidBiometricEnrollmentUnchanged();

    try {
      // The native implementation passes the decrypt Cipher into the prompt,
      // so this read cannot reuse react-native-keychain's five-second window.
      return await getAndroidBiometricEnrollmentModule().getEnrollmentBoundCredential(
        title,
      );
    } catch (cause) {
      if (
        cause?.code === 'E_BIOMETRIC_ENROLLMENT_CHANGED' ||
        cause?.code === 'E_BIOMETRIC_ENROLLMENT_KEY_MISSING'
      ) {
        throwEnrollmentChanged(cause);
      }

      throw cause;
    }
  }

  const credentials = await Keychain.getGenericPassword({
    service: BIOMETRIC_CREDENTIAL_KEY,
    authenticationPrompt: {title},
  });

  if (credentials !== false && credentials != null) return credentials.password;
  else throw new Error(`Failed to retrieve biometric credential`);
};

export const setBiometricCredential = async value => {
  let credentialBytes;
  try {
    credentialBytes = Buffer.from(value, 'base64');
  } catch (_) {
    credentialBytes = null;
  }
  if (
    typeof value !== 'string' ||
    credentialBytes?.length !== 128 ||
    credentialBytes.toString('base64') !== value
  ) {
    throw new Error(
      'Biometric credential must be canonical Base64 for exactly 128 bytes.',
    );
  }

  if (Platform.OS === 'android') {
    await getAndroidBiometricEnrollmentModule().setEnrollmentBoundCredential(
      value,
    );
    return value;
  }

  return Keychain.setGenericPassword(INTERNAL_APP_ID, value, {
    service: BIOMETRIC_CREDENTIAL_KEY,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  });
};

export const generateBiometricCredential = async () => {
  const bytes = await randomBytes(128);
  if (!Buffer.isBuffer(bytes)) throw new Error('Credential is not buffer');

  const value = bytes.toString('base64');
  await setBiometricCredential(value);
  return value;
};

export const removeBiometricCredential = async () => {
  if (Platform.OS === 'android') {
    await removeAndroidBiometricEnrollmentKey();
    return;
  }

  return Keychain.resetGenericPassword({service: BIOMETRIC_CREDENTIAL_KEY});
};

export const getPreCurrentSetBiometricSourceAvailability = async () => {
  if (Platform.OS !== 'android') {
    return {
      vaultCredential: false,
      directService: false,
    };
  }

  const services = await Keychain.getAllGenericPasswordServices();
  return {
    vaultCredential: services.includes(
      PRE_CURRENT_SET_BIOMETRIC_CREDENTIAL_KEY,
    ),
    directService: services.includes(PRE_CURRENT_SET_LEGACY_BIOMETRIC_SERVICE),
  };
};

const getRequiredGenericCredential = async (service, title) => {
  const credentials = await Keychain.getGenericPassword({
    service,
    authenticationPrompt: {title},
  });

  if (credentials !== false && credentials != null) return credentials.password;
  throw new Error(`No biometric credential found for ${service}`);
};

export const getPreCurrentSetBiometricCredential = title => {
  if (Platform.OS !== 'android') {
    throw new Error(
      'Android legacy biometric credentials are unavailable on iOS.',
    );
  }
  return getRequiredGenericCredential(
    PRE_CURRENT_SET_BIOMETRIC_CREDENTIAL_KEY,
    title,
  );
};

export const getPreCurrentSetLegacyBiometricData = async title => {
  if (Platform.OS !== 'android') {
    throw new Error('Android legacy biometric data is unavailable on iOS.');
  }
  const password = await getRequiredGenericCredential(
    PRE_CURRENT_SET_LEGACY_BIOMETRIC_SERVICE,
    title,
  );
  return JSON.parse(password);
};

export const removePreCurrentSetBiometricCredential = () =>
  Keychain.resetGenericPassword({
    service: PRE_CURRENT_SET_BIOMETRIC_CREDENTIAL_KEY,
  });

export const removePreCurrentSetLegacyBiometricData = () => {
  if (Platform.OS !== 'android') return;
  return Keychain.resetGenericPassword({
    service: PRE_CURRENT_SET_LEGACY_BIOMETRIC_SERVICE,
  });
};

export const removePreCurrentSetBiometricCredentials = async () => {
  await removePreCurrentSetBiometricCredential();
  if (Platform.OS === 'android') {
    await removePreCurrentSetLegacyBiometricData();
  }
};

const parseBiometricPasswordMap = value => {
  const parsed = JSON.parse(value);
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Biometric password data is invalid.');
  }
  for (const key of Object.keys(parsed)) {
    if (typeof parsed[key] !== 'string') {
      throw new Error('Biometric password data contains an invalid password.');
    }
  }
  return parsed;
};

const canonicalBiometricPasswordMap = value =>
  JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = value[key];
        return result;
      }, {}),
  );

const getIosCurrentBiometricData = async title => {
  const credentials = await Keychain.getGenericPassword({
    service: BIOMETRIC_CURRENT_SET_SERVICE,
    authenticationPrompt: {title},
  });
  return credentials === false || credentials == null
    ? null
    : parseBiometricPasswordMap(credentials.password);
};

const setIosCurrentBiometricData = data =>
  Keychain.setGenericPassword(INTERNAL_APP_ID, JSON.stringify(data), {
    service: BIOMETRIC_CURRENT_SET_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  });

export const getLegacyBiometricData = async (
  title = 'Authenticate to retrieve password',
) => {
  if (Platform.OS !== 'ios') {
    throw new Error(
      'iOS biometric keychain storage is unavailable on Android.',
    );
  }

  const currentData = await getIosCurrentBiometricData(title);
  if (currentData != null) {
    // Idempotent crash/beta recovery: do not assume an existing current-set
    // map already contains every entry from the old default service. Merge the
    // source first, let the newer current-set values win, verify any rewrite,
    // and only then remove BIOMETRY_ANY.
    const oldCredentials = await Keychain.getGenericPassword({
      authenticationPrompt: {title},
    });
    if (oldCredentials === false || oldCredentials == null) return currentData;

    const oldData = parseBiometricPasswordMap(oldCredentials.password);
    const mergedData = {...oldData, ...currentData};
    if (
      canonicalBiometricPasswordMap(mergedData) !==
      canonicalBiometricPasswordMap(currentData)
    ) {
      await setIosCurrentBiometricData(mergedData);
      const verifiedData = await getIosCurrentBiometricData(
        'Verify migrated biometric passwords',
      );
      if (
        verifiedData == null ||
        canonicalBiometricPasswordMap(verifiedData) !==
          canonicalBiometricPasswordMap(mergedData)
      ) {
        throw new Error('Unable to verify recovered iOS biometric passwords.');
      }
    }

    await Keychain.resetGenericPassword();
    return mergedData;
  }

  const oldCredentials = await Keychain.getGenericPassword({
    authenticationPrompt: {title},
  });
  if (oldCredentials === false || oldCredentials == null) {
    throw new Error('Biometric authentication not enabled on this device!');
  }

  // This accepted upgrade can be authorized by a newly enrolled biometric.
  // It protects all future reads with BIOMETRY_CURRENT_SET, but it cannot prove
  // that the biometric performing this one-time migration is the old owner.
  const oldData = parseBiometricPasswordMap(oldCredentials.password);
  await setIosCurrentBiometricData(oldData);
  const verifiedData = await getIosCurrentBiometricData(
    'Verify migrated biometric passwords',
  );
  if (
    verifiedData == null ||
    canonicalBiometricPasswordMap(verifiedData) !==
      canonicalBiometricPasswordMap(oldData)
  ) {
    throw new Error('Unable to verify migrated iOS biometric passwords.');
  }

  await Keychain.resetGenericPassword();
  return verifiedData;
};

export const getLegacyBiometricPassword = async (
  accountHash,
  title = 'Authenticate to retrieve password',
) => {
  let data;

  try {
    data = await getLegacyBiometricData(title);
  } catch (error) {
    if (
      error?.message === 'Biometric authentication not enabled on this device!'
    ) {
      throw createBiometricPasswordNotFoundError(accountHash, error);
    }
    throw error;
  }

  if (!Object.prototype.hasOwnProperty.call(data, accountHash)) {
    throw createBiometricPasswordNotFoundError(accountHash);
  }

  return data[accountHash];
};

const getIosBiometricDataForMutation = async title => {
  try {
    return await getLegacyBiometricData(title);
  } catch (error) {
    if (
      error?.message === 'Biometric authentication not enabled on this device!'
    ) {
      return {};
    }
    throw error;
  }
};

export const storeLegacyBiometricPassword = async (accountHash, password) => {
  if (Platform.OS !== 'ios') {
    throw new Error(
      'iOS biometric keychain storage is unavailable on Android.',
    );
  }
  let credentials = {};

  try {
    credentials = await getIosBiometricDataForMutation(
      'Authenticate to store password in biometric keychain',
    );
  } catch (e) {
    console.warn(e);
    throw e;
  }

  await setIosCurrentBiometricData({...credentials, [accountHash]: password});
};

export const removeLegacyBiometricPassword = async accountHash => {
  if (Platform.OS !== 'ios') {
    throw new Error(
      'iOS biometric keychain storage is unavailable on Android.',
    );
  }
  let credentials = {};

  try {
    credentials = await getIosBiometricDataForMutation(
      'Authenticate to remove password in biometric keychain',
    );
  } catch (e) {
    console.warn(e);
    throw e;
  }

  delete credentials[accountHash];

  await setIosCurrentBiometricData(credentials);
};

export const removeAllLegacyBiometricPasswords = async () => {
  if (Platform.OS !== 'ios') {
    throw new Error(
      'iOS biometric keychain storage is unavailable on Android.',
    );
  }
  await setIosCurrentBiometricData({});
};

export const getSupportedBiometryType = async () => {
  const biometryType = await Keychain.getSupportedBiometryType();

  switch (biometryType) {
    case Keychain.BIOMETRY_TYPE.TOUCH_ID:
      return {
        display_name: 'Touch ID',
        biometry: await passesSecurityThreshold(),
      };
    case Keychain.BIOMETRY_TYPE.FACE_ID:
      return {
        display_name: 'Face ID',
        biometry: await passesSecurityThreshold(),
      };
    case Keychain.BIOMETRY_TYPE.FINGERPRINT:
      return {
        display_name: 'Fingerprint',
        biometry: await passesSecurityThreshold(),
      };
    case Keychain.BIOMETRY_TYPE.IRIS:
      return {
        display_name: 'Iris Recognition',
        biometry: await passesSecurityThreshold(),
      };
    case Keychain.BIOMETRY_TYPE.FACE:
      return {
        display_name: 'Facial Recognition',
        biometry: await passesSecurityThreshold(),
      };
    default:
      return {
        display_name: 'None',
        biometry: false,
      };
  }
};

export const passesSecurityThreshold = async () => {
  const securityLevel = await Keychain.getSecurityLevel({
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
  });

  return securityLevel == Keychain.SECURITY_LEVEL[BIOMETRIC_SECURITY_THRESHOLD];
};

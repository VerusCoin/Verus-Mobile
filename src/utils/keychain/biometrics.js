import { Platform } from "react-native";
import { generateBiometricCredential, getLegacyBiometricData, getLegacyBiometricPassword, removeAllLegacyBiometricPasswords, removeLegacyBiometricPassword, storeLegacyBiometricPassword } from "./keychain"
import { SecureStorage } from "./secureStore"

// We continue to use "legacy" biometric storage on iOS devices because the reason to migrate to a model where 
// an encrypted 'vault' is stored in async storage while its encryption key is stored in the biometric keychain
// was necessary due to a limitation on keychain size in Android. If limitations occur on iOS, iOS can be migrated
// by simply deleting the Platform.OS exceptions in the functions below.

const androidBiometricVaultExists = async () => {
  return (
    SecureStorage.biometryFlagSet() ||
    (await SecureStorage.hasBiometricVault())
  );
}

const getLegacyBiometricDataIfAvailable = async title => {
  try {
    const legacyBiometricData = await getLegacyBiometricData(title);

    return legacyBiometricData != null &&
      typeof legacyBiometricData === "object" &&
      !Array.isArray(legacyBiometricData)
      ? legacyBiometricData
      : {};
  } catch(e) {
    if (e.message !== "Biometric authentication not enabled on this device!") {
      console.log("Unable to read legacy biometric data:");
      console.log(e);
    }

    return {};
  }
}

export const getBiometricPassword = async (accountHash, title) => {
  if (Platform.OS === "ios") return getLegacyBiometricPassword(accountHash, title);

  if (await androidBiometricVaultExists()) {
    try {
      return await SecureStorage.getPasswordFromBiometricVault(accountHash);
    } catch(e) {
      const allBiometricDataJson = await getLegacyBiometricDataIfAvailable(title);
      const password = allBiometricDataJson[accountHash];

      if (password != null) {
        try {
          await SecureStorage.setPasswordInBiometricVault(accountHash, password);
        } catch(storeError) {
          console.log("Error migrating legacy biometric password to secure store:");
          console.log(storeError);
        }

        return password;
      }

      throw e;
    }
  } else {
    // Attempt to migrate data to secure store while also fetching biometric password if data is stored in legacy 
    // keychain format
    const allBiometricDataJson = await getLegacyBiometricData(title);
    const password = allBiometricDataJson[accountHash];

    try {
      await generateBiometricCredential();
      await SecureStorage.setBiometricVaultData(allBiometricDataJson);
      await removeAllLegacyBiometricPasswords();
    } catch(e) {
      console.log("Error migrating biometric passwords to secure store:");
      console.log(e);
    }

    return password;
  }
}

export const storeBiometricPassword = async (accountHash, password) => {
  if (Platform.OS === "ios") return storeLegacyBiometricPassword(accountHash, password);

  if (!(await androidBiometricVaultExists())) {
    const legacyBiometricData = await getLegacyBiometricDataIfAvailable(
      "Authenticate to store password in biometric keychain",
    );

    await generateBiometricCredential();
    await SecureStorage.setBiometricVaultData({
      ...legacyBiometricData,
      [accountHash]: password,
    })

    if (Object.keys(legacyBiometricData).length > 0) {
      await removeAllLegacyBiometricPasswords();
    }
  } else return SecureStorage.setPasswordInBiometricVault(accountHash, password);
}

export const removeBiometricPassword = async (accountHash) => {
  if (Platform.OS === "ios") return removeLegacyBiometricPassword(accountHash);

  if (await androidBiometricVaultExists()) {
    return SecureStorage.removePasswordFromBiometricVault(accountHash);
  } else {
    return removeLegacyBiometricPassword(accountHash);
  }
}

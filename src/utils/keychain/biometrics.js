import { Platform } from "react-native";
import { generateBiometricCredential, getLegacyBiometricData, getLegacyBiometricPassword, removeAllLegacyBiometricPasswords, removeLegacyBiometricPassword, storeLegacyBiometricPassword } from "./keychain"
import { SecureStorage } from "./secureStore"

// We continue to use "legacy" biometric storage on iOS devices because the reason to migrate to a model where 
// an encrypted 'vault' is stored in async storage while its encryption key is stored in the biometric keychain
// was necessary due to a limitation on keychain size in Android. If limitations occur on iOS, iOS can be migrated
// by simply deleting the Platform.OS exceptions in the functions below.

export const getBiometricPassword = async (accountHash, title) => {
  if (Platform.OS === "ios") return getLegacyBiometricPassword(accountHash, title);

  if (SecureStorage.biometryFlagSet()) {
    return SecureStorage.getPasswordFromBiometricVault(accountHash);
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

  if (!SecureStorage.biometryFlagSet()) {
    await generateBiometricCredential();
    await SecureStorage.setBiometricVaultData({ [accountHash]: password })
  } else return SecureStorage.setPasswordInBiometricVault(accountHash, password);
}

export const removeBiometricPassword = async (accountHash) => {
  if (Platform.OS === "ios") return removeLegacyBiometricPassword(accountHash);

  if (SecureStorage.biometryFlagSet()) {
    return SecureStorage.removePasswordFromBiometricVault(accountHash);
  } else {
    return removeLegacyBiometricPassword(accountHash);
  }
}
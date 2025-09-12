import AsyncStorage from '@react-native-async-storage/async-storage';
import { BigNumber } from 'verus-typescript-primitives';
import { 
  USER_DATA_STORAGE_INTERNAL_KEY,
  PERSONAL_DATA_STORAGE_INTERNAL_KEY,
  SERVICE_STORAGE_INTERNAL_KEY
} from '../../../env/index';
import { saltedDecryptMGK, saltedEncryptMGK } from '../crypto/crypto';
import { 
  generatePersistentCredential, 
  getBiometricCredential, 
  getPersistentCredential, 
  saveNewPersistentCredential 
} from './keychain';
import { randomBytes } from '../crypto/randomBytes';

class SecureStore {
  credential;
  flags;

  /** @type {Array<string>} */
  keys;

  static FLAG_STORE_IS_ENCRYPTED = new BigNumber(1);
  static FLAG_STORE_HAS_BIOMETRIC_VAULT = new BigNumber(2);

  static SECURE_STORE_FLAG_KEY = 'secureStoreFlags'
  static SECURE_STORE_BIOMETRIC_VAULT_KEY = 'biometricVault'

  constructor(keys) {
    this.credential = null;
    this.flags = new BigNumber(0);
    this.keys = keys
  }

  async initializeWithKeychain() {
    let persistentCredential;

    try {
      persistentCredential = await getPersistentCredential();

      if (persistentCredential == null) {
        persistentCredential = await generatePersistentCredential();
      } else {
        try {
          await this.initialize(persistentCredential);

          // TODO: Consider cycling on every app start
          // if (this.isEncrypted() && this.credential != null) {
          //   await this.cycleCredential();
          // }
          
          return;
        } catch (e) {
          console.warn("Could not initialize persistent credential into keychain")
          console.warn(e)
          return;
        }
      }
    } catch(e) {
      console.warn("Could not initialize persistent credential into keychain")
      console.warn(e)
    }

    await this.initialize(persistentCredential);
  }

  async initialize(credential) {
    this.credential = credential;

    const item = await AsyncStorage.getItem(SecureStore.SECURE_STORE_FLAG_KEY);

    if (item != null) {
      this.flags = new BigNumber(item);

      this.isEncrypted();
    } else {
      if (credential != null) {
        try {
          await this.encryptAllStorage()
          return;
        } catch(e) {
          console.warn("Failed to initialize credential")
          this.credential = null;
        }
      }
    }
  }

  encryptedFlagSet() {
    return !!((this.flags.and(SecureStore.FLAG_STORE_IS_ENCRYPTED)).toNumber())
  }

  biometryFlagSet() {
    return !!((this.flags.and(SecureStore.FLAG_STORE_HAS_BIOMETRIC_VAULT)).toNumber())
  }

  toggleEncryptedFlag() {
    this.flags = this.flags.xor(SecureStore.FLAG_STORE_IS_ENCRYPTED);
  }

  toggleBiometryFlag() {
    this.flags = this.flags.xor(SecureStore.FLAG_STORE_HAS_BIOMETRIC_VAULT);
  }

  setEncryptedFlag(state = true) {
    if (this.encryptedFlagSet() !== state) {
      this.toggleEncryptedFlag()
    }
  }

  setBiometryFlag(state = true) {
    if (this.biometryFlagSet() !== state) {
      this.toggleBiometryFlag()
    }
  }

  isEncrypted() {
    if (this.encryptedFlagSet()) {
      if (this.credential == null) throw new Error("CRITICAL ERROR! Unable to decrypt wallet data because of missing keychain credential! Try restarting wallet, or clearing wallet data and restoring your wallet from the seed you have backed up (this action will clear all wallet/account data from this device).");

      return true;
    } else return false
  }

  isEncryptedKey(key) {
    return this.isEncrypted() && this.keys.includes(key)
  }

  validateCredential() {
    if (this.credential == null) {
      throw new Error("Invalid or missing credential for secure store")
    }
  }

  async encryptData(data) {
    this.validateCredential();

    return saltedEncryptMGK(this.credential, data);
  }

  decryptData(b64) {
    this.validateCredential();

    return saltedDecryptMGK(this.credential, b64);
  }

  async encryptAllStorage() {
    const storage = await AsyncStorage.multiGet(this.keys);
    const encryptedKeyMap = new Map();

    for (const kv of storage) {
      const [key, value] = kv;

      if (this.keys.includes(key) && value != null) {
        const encryptedData = await this.encryptData(value);
        const decryptedData = this.decryptData(encryptedData);

        if (decryptedData !== value) {
          throw new Error("Error while encrypting all storage, decrypted/encrypted data mismatch for " + key)
        }

        encryptedKeyMap.set(key, encryptedData)
      }
    }

    encryptedKeyMap.set(SecureStore.SECURE_STORE_FLAG_KEY, (this.flags.or(SecureStore.FLAG_STORE_IS_ENCRYPTED)).toString())

    await AsyncStorage.multiSet(Array.from(encryptedKeyMap))
    await this.initialize(this.credential)
  }

  async decryptAllStorage() {
    const storage = await AsyncStorage.multiGet(this.keys);
    const decryptedKeyMap = new Map();

    for (const kv of storage) {
      const [key, value] = kv;

      if (this.keys.includes(key) && value != null) {
        const decryptedData = this.decryptData(value);
        decryptedKeyMap.set(key, decryptedData)
      }
    }

    const newFlags = this.encryptedFlagSet() ? this.flags.xor(SecureStore.FLAG_STORE_IS_ENCRYPTED) : this.flags;

    decryptedKeyMap.set(SecureStore.SECURE_STORE_FLAG_KEY, (newFlags).toString())
    
    await AsyncStorage.multiSet(Array.from(decryptedKeyMap))
    await this.initialize(this.credential)
  }

  async cycleCredential() {
    const newCredential = await randomBytes(128);
    const newCredentialString = newCredential.toString('base64');

    const storage = await AsyncStorage.multiGet(this.keys);
    const encryptedKeyMap = new Map();

    for (const kv of storage) {
      const [key, value] = kv;

      if (this.keys.includes(key) && value != null) {
        const originallyDecryptedData = this.decryptData(value);

        try {
          JSON.parse(originallyDecryptedData)
        } catch(e) {
          throw new Error("Malformed data detected, cancelling credential cycle")
        }

        const encryptedData = await saltedEncryptMGK(newCredentialString, originallyDecryptedData);
        const decryptedData = saltedDecryptMGK(newCredentialString, encryptedData);

        if (decryptedData !== originallyDecryptedData) {
          throw new Error("Error while cycling credential all storage, decrypted/encrypted data mismatch for " + key)
        }

        encryptedKeyMap.set(key, encryptedData)
      }
    }

    await this.initialize(await saveNewPersistentCredential(newCredential))

    return AsyncStorage.multiSet(Array.from(encryptedKeyMap))
  }

  async setItem(key, value, callback) {
    if (this.isEncryptedKey(key)) {
      this.validateCredential();

      const encryptedValue = await this.encryptData(value);

      return AsyncStorage.setItem(key, encryptedValue, callback);
    } else {
      return AsyncStorage.setItem(key, value, callback);
    }
  }

  async getItem(key, callback) {
    if (this.isEncryptedKey(key)) {
      this.validateCredential();

      const item = await AsyncStorage.getItem(key, callback);

      if (item == null) return item;

      try {
        const decryptedItem = this.decryptData(item);

        if (!decryptedItem) throw new Error("Failed to decrypt")

        return decryptedItem;
      } catch (e) {
        throw new Error("CRITICAL ERROR! Unable to decrypt encrypted wallet data. Try restarting your wallet, or clearing wallet data and restoring your wallet from the seed you have backed up (this action will clear all wallet/account data from this device).");
      }
      
    } else {
      return AsyncStorage.getItem(key, callback);
    }
  }

  async getPasswordFromBiometricVault(accountHash) {
    const bioCred = await getBiometricCredential();

    if (bioCred == null) throw new Error("No biometric credential found in keychain");

    const vault = await AsyncStorage.getItem(SecureStore.SECURE_STORE_BIOMETRIC_VAULT_KEY);

    if (vault != null) {
      try {
        const data = saltedDecryptMGK(bioCred, vault);
        const dataJson = JSON.parse(data);

        for (const key in dataJson) {
          if (accountHash === key) {
            return dataJson[key];
          }
        }
      } catch(e) {
        console.warn("Critical biometric vault error, failed to decrypt biometric vault")
      }
      
      throw new Error("No password found stored for account.")
    } else throw new Error("No biometric vault found in storage.")
  }

  async setBiometricVaultData(vaultData) {
    const changesMap = new Map();

    const bioCred = await getBiometricCredential();
    if (bioCred == null) throw new Error("No biometric credential found in keychain");

    const encryptedVault = await saltedEncryptMGK(bioCred, JSON.stringify(vaultData));

    changesMap.set(SecureStore.SECURE_STORE_BIOMETRIC_VAULT_KEY, encryptedVault);
    changesMap.set(SecureStore.SECURE_STORE_FLAG_KEY, (this.flags.or(SecureStore.FLAG_STORE_HAS_BIOMETRIC_VAULT)).toString())

    return AsyncStorage.multiSet(Array.from(changesMap))
  }

  async setPasswordInBiometricVault(accountHash, password) {
    const bioCred = await getBiometricCredential();
    if (bioCred == null) throw new Error("No biometric credential found in keychain");

    const vault = await AsyncStorage.getItem(SecureStore.SECURE_STORE_BIOMETRIC_VAULT_KEY);

    const newVault = vault == null ? {} : JSON.parse(saltedDecryptMGK(bioCred, vault));
    newVault[accountHash] = password;

    const encryptedNewVault = await saltedEncryptMGK(bioCred, JSON.stringify(newVault));

    return AsyncStorage.setItem(SecureStore.SECURE_STORE_BIOMETRIC_VAULT_KEY, encryptedNewVault);
  }

  async removePasswordFromBiometricVault(accountHash) {
    const bioCred = await getBiometricCredential();
    if (bioCred == null) throw new Error("No biometric credential found in keychain");

    const vault = await AsyncStorage.getItem(SecureStore.SECURE_STORE_BIOMETRIC_VAULT_KEY);

    if (vault == null) throw new Error("No vault found to remove key from")

    let newVault = JSON.parse(saltedDecryptMGK(bioCred, vault));
    delete newVault[accountHash];

    const encryptedNewVault = await saltedEncryptMGK(bioCred, JSON.stringify(newVault));

    return AsyncStorage.setItem(SecureStore.SECURE_STORE_BIOMETRIC_VAULT_KEY, encryptedNewVault);
  }

  multiRemove(keys, callback) {
    return AsyncStorage.multiRemove(keys, callback);
  }

  removeItem(keys, callback) {
    return AsyncStorage.removeItem(keys, callback);
  }
}

export const SecureStorage = new SecureStore(
  [
    USER_DATA_STORAGE_INTERNAL_KEY,
    PERSONAL_DATA_STORAGE_INTERNAL_KEY,
    SERVICE_STORAGE_INTERNAL_KEY
  ]
);
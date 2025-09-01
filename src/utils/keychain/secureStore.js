import AsyncStorage from '@react-native-async-storage/async-storage';
import { BigNumber } from 'verus-typescript-primitives';
import { 
  USER_DATA_STORAGE_INTERNAL_KEY,
  PERSONAL_DATA_STORAGE_INTERNAL_KEY,
  SERVICE_STORAGE_INTERNAL_KEY
} from '../../../env/index';
import { saltedDecrypt, saltedEncrypt } from '../crypto/crypto';
import { generatePersistentCredential, getPersistentCredential, saveNewPersistentCredential } from './keychain';
import { randomBytes } from '../crypto/randomBytes';

class SecureStore {
  credential;
  flags;

  /** @type {Array<string>} */
  keys;

  static FLAG_STORE_IS_ENCRYPTED = new BigNumber(1);
  static SECURE_STORE_FLAG_KEY = 'secureStoreFlags'

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

          if (this.isEncrypted() && this.credential != null) {
            await this.cycleCredential();
          }
          
          return;
        } catch (e) {
          console.warn("Could not initialize persistent credential into keychain")
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

  isEncrypted() {
    if (!!((this.flags.and(SecureStore.FLAG_STORE_IS_ENCRYPTED)).toNumber())) {
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

    return saltedEncrypt(this.credential, data);
  }

  decryptData(b64) {
    this.validateCredential();

    return saltedDecrypt(this.credential, b64);
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

    encryptedKeyMap.set(SecureStore.SECURE_STORE_FLAG_KEY, (new BigNumber(1)).toString())

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

    decryptedKeyMap.set(SecureStore.SECURE_STORE_FLAG_KEY, (new BigNumber(0)).toString())
    
    await AsyncStorage.multiSet(Array.from(decryptedKeyMap))
    await this.initialize(this.credential)
  }

  async cycleCredential() {
    const newCredential = await randomBytes(128);
    const newCredentialString = newCredential.toString('hex');

    const storage = await AsyncStorage.multiGet(this.keys);
    const encryptedKeyMap = new Map();

    for (const kv of storage) {
      const [key, value] = kv;

      if (this.keys.includes(key) && value != null) {
        const originallyDecryptedData = this.decryptData(value);
        const encryptedData = await saltedEncrypt(newCredentialString, originallyDecryptedData);
        const decryptedData = saltedDecrypt(newCredentialString, encryptedData);

        if (decryptedData !== originallyDecryptedData) {
          throw new Error("Error while cycling credential all storage, decrypted/encrypted data mismatch for " + key)
        }

        encryptedKeyMap.set(key, encryptedData)
      }
    }

    await this.initialize(await saveNewPersistentCredential(Buffer.from(newCredentialString, 'hex')))

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
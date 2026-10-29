/**
 * encryptDataDescriptor.js
 *
 * Wraps arbitrary data in a DataDescriptor, encrypts it to a Sapling
 * payment address, and returns both the typed descriptor object and a
 * daemon-compatible JSON representation.
 */

import {
  Credential,
  CredentialKey,
  DATA_TYPE_STRING,
  DataDescriptor,
  DataDescriptorKey,
  VdxfUniValue,
} from "verus-typescript-primitives";

import { encryptData } from "../api/channels/dlight/requests/encrypt";

/**
 * Encrypt an array of uni values containing data descriptors to a Sapling payment address.
 *
 * @param {string} encryptToAddress - Sapling payment address to encrypt to.
 * @param {Array<{ [key: string]: DataDescriptor }>} uniValues       - Raw data to encrypt.
 * @returns {Promise<{ encryptedDescriptor: DataDescriptor, encryptedDescriptorJson: object }>}
 */
export const encryptVDXFUniValuesToDescriptor = async (encryptToAddress, uniValues) => {
  // Create VdxfUniValue from the map
  const urlRefUniValue = new VdxfUniValue({ values: uniValues });

  const plaintext = urlRefUniValue.toBuffer();
  const encryptedData = await encryptData(
    encryptToAddress,
    plaintext.toString('hex'),
    false,
  );

  // Both native platforms return these exact hex fields. A ciphertext string
  // alone cannot describe an encrypted descriptor because it has no EPK.
  const ciphertextHex = encryptedData?.encryptedData;
  const epkHex = encryptedData?.ephemeralPublicKey;
  if (typeof ciphertextHex !== 'string' || typeof epkHex !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(epkHex) || !/^[0-9a-f]+$/i.test(ciphertextHex) ||
      ciphertextHex.length !== (plaintext.length + 16) * 2) {
    throw new Error('Invalid native encrypted descriptor response.');
  }

  // Wrap encrypted data in DataDescriptor
  const encryptedDescriptor = new DataDescriptor({
    flags: DataDescriptor.FLAG_ENCRYPTED_DATA,
    objectdata: Buffer.from(ciphertextHex, 'hex'),
    epk: Buffer.from(epkHex, 'hex'),
  });

  // Build daemon-compatible JSON (raw hex values)
  const encryptedDescriptorJson = {
    version: 1,
    flags: encryptedDescriptor.flags.toNumber(),
    objectdata: ciphertextHex,
    epk: epkHex,
  };

  return { encryptedDescriptor, encryptedDescriptorJson };
};

/**
 * Encrypt a Buffer of data to a Sapling payment address.
 *
 * @param {string} encryptToAddress - Sapling payment address to encrypt to.
 * @param {Buffer} dataBuffer       - Raw data to encrypt.
 * @returns {Promise<{ encryptedDescriptor: DataDescriptor, encryptedDescriptorJson: object }>}
 */
export const encryptDataBufferToDescriptor = async (encryptToAddress, dataBuffer) => {
  // Wrap data in a DataDescriptor
  const innerDescriptor = new DataDescriptor({ objectdata: dataBuffer });

  const innerRef = [];
  innerRef.push({ [DataDescriptorKey.vdxfid]: innerDescriptor });

  return encryptVDXFUniValuesToDescriptor(encryptToAddress, innerRef);
};

/**
 * Encrypt a credential to a Sapling payment address.
 *
 * @param {string} encryptToAddress - Sapling payment address to encrypt to.
 * @param {Credential} credential       - Raw data to encrypt.
 * @returns {Promise<{ encryptedDescriptor: DataDescriptor, encryptedDescriptorJson: object }>}
 */
export const encryptCredentialToDescriptor = async (encryptToAddress, credential) => {
  // Wrap data in a DataDescriptor
  const innerDescriptor = new DataDescriptor({
    objectdata: new VdxfUniValue({
      values: [
        { [CredentialKey.vdxfid]: credential }
      ]
    }).toBuffer()
  });

  const innerRef = [];
  innerRef.push({ [DataDescriptorKey.vdxfid]: innerDescriptor });
  
  return encryptVDXFUniValuesToDescriptor(encryptToAddress, innerRef);
};

/**
 * Encrypt a utf8 string to a Sapling payment address.
 *
 * @param {string} encryptToAddress - Sapling payment address to encrypt to.
 * @param {string} str       - Raw data to encrypt.
 * @returns {Promise<{ encryptedDescriptor: DataDescriptor, encryptedDescriptorJson: object }>}
 */
export const encryptStringToDescriptor = async (encryptToAddress, str) => {
  // Wrap data in a DataDescriptor
  const innerDescriptor = new DataDescriptor({
    objectdata: new VdxfUniValue({
      values: [
        { [DATA_TYPE_STRING.vdxfid]: str }
      ]
    }).toBuffer()
  });

  const innerRef = [];
  innerRef.push({ [DataDescriptorKey.vdxfid]: innerDescriptor });
  
  return encryptVDXFUniValuesToDescriptor(encryptToAddress, innerRef);
};

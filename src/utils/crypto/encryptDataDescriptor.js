/**
 * encryptDataDescriptor.js
 *
 * Wraps arbitrary data in a DataDescriptor, encrypts it to a Sapling
 * payment address, and returns both the typed descriptor object and a
 * daemon-compatible JSON representation.
 */

import {
  DataDescriptor,
  DataDescriptorKey,
  VdxfUniValue,
} from "verus-typescript-primitives";

import { encryptData } from "../api/channels/dlight/requests/encrypt";

/**
 * Encrypt a Buffer of data to a Sapling payment address.
 *
 * @param {string} encryptToAddress - Sapling payment address to encrypt to.
 * @param {Buffer} dataBuffer       - Raw data to encrypt.
 * @returns {Promise<{ encryptedDescriptor: DataDescriptor, encryptedDescriptorJson: object }>}
 */
export const encryptDataToDescriptor = async (encryptToAddress, dataBuffer) => {
  // Wrap data in a DataDescriptor
  const innerDescriptor = new DataDescriptor({ objectdata: dataBuffer });

  const innerRef = [];
  innerRef.push({ [DataDescriptorKey.vdxfid]: innerDescriptor });

  // Create VdxfUniValue from the map
  const urlRefUniValue = new VdxfUniValue({ values: innerRef });

  const encryptedData = await encryptData(
    encryptToAddress,
    urlRefUniValue.toBuffer().toString('hex'),
    true,
  );

  // Extract raw ciphertext hex — handle both string result and object result
  const ciphertextHex =
    typeof encryptedData === 'string'
      ? encryptedData
      : encryptedData.encryptedData;
  const epkHex = encryptedData.ephemeralPublicKey;

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

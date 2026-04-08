/**
 * encryptCredentials.js
 *
 * Replicates the daemon's `signdata` RPC for credential encryption on mobile.
 * When an identity update request contains `vrsc::identity.credential` in the
 * contentmultimap, this module encrypts the credential data before the
 * transaction is created — ensuring plaintext credentials are never sent to the
 * RPC server.
 *
 * Also computes the hashed VDXF key offline (replicating `getvdxfid` with
 * uint256 initial data) so the IVK is never leaked to the server.
 */

import {
  CredentialKey,
  DataDescriptorKey,
  FqnVdxfUniValue,
  IDENTITY_CREDENTIAL,
  IdentityUpdateRequestDetails,
  VdxfUniValue,
  fromBase58Check,
  toBase58Check,
} from "verus-typescript-primitives";

import { I_ADDR_VERSION } from "verus-typescript-primitives/dist/constants/vdxf";
import { hash, hash160 } from "verus-typescript-primitives/dist/utils/hash";

import { Tools } from "react-native-verus";
import { zGetEncryptionAddress } from "../api/channels/dlight/requests/zGetEncryptionAddress";
import { getKeyMaterial } from "./getKeyMaterial";
import { encryptCredentialToDescriptor } from "./encryptDataDescriptor";

/**
 * Offline replication of C++ CCrossChainRPCData::GetConditionID(uint160, uint256).
 * Produces the same result as: getvdxfid "vrsc::identity.credential" '{"uint256":"<ivkHex>"}'
 * TODO: Move into verus-typescript-primitives
 *
 * @param {string} baseKeyIAddr - i-address of the base VDXF key (e.g. IDENTITY_CREDENTIAL.vdxfid)
 * @param {string} uint256Hex   - 256-bit value in display (big-endian) hex (e.g. the IVK)
 * @returns {Buffer} 20-byte hash160 result
 */
export const getConditionID = (baseKeyIAddr, uint256Hex) => {
  // fromBase58Check gives 20 bytes in internal LE order (matches C++ serialization)
  const cidBuf = fromBase58Check(baseKeyIAddr).hash;
  // IVK hex from native module is in display (BE) format; reverse to LE internal
  const uint256Buf = Buffer.from(uint256Hex, "hex").reverse();
  // double SHA256 (matches CHashWriter::GetHash)
  const chainHash = hash(cidBuf, uint256Buf);
  // SHA256 + RIPEMD160
  return hash160(chainHash);
};

/**
 * Main entry point: processes encrypted keys in an identity update request.
 *
 * 1. Extracts credential entries from the CLI JSON contentmultimap
 * 2. Encrypts each entry to the subject identity's Sapling address
 * 3. Hashes the VDXF key offline with the IVK
 * 4. Returns a new IdentityUpdateRequestDetails with encrypted contentmultimap
 *
 * @param {string} systemId          - Chain system ID (e.g. "i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV")
 * @param {IdentityUpdateRequestDetails} details - Original request details
 * @param {object} subjectIdentity   - Identity object with .identity.identityaddress and .identity.privateaddress
 * @param {object} coinObj           - Coin object for the chain
 * @returns {Promise<IdentityUpdateRequestDetails>} Modified details with encrypted credentials
 */
export const processEncryptedKeys = async (
  systemId,
  details,
  subjectIdentity,
  coinObj
) => {
  const credentialKey = IDENTITY_CREDENTIAL.vdxfid;

  if (
    !details.identity.containsContentMultiMap() ||
    !details.identity.contentMultiMap.kvContent.hasAddress(credentialKey)
  ) {
    return details; // nothing to encrypt
  }

  const credentialEntries = details.identity.contentMultiMap.kvContent.getByAddress(credentialKey);

  if (!credentialEntries || credentialEntries.some(x => Buffer.isBuffer(x))) {
    throw new Error("Incorrect credential data format");
  }

  // Validate z-address exists on subject identity
  const identity = subjectIdentity.identity || subjectIdentity;
  const privateAddress = identity.privateaddress;
  if (!privateAddress) {
    throw new Error(
      "Identity must have a z-address (private address) to store encrypted credentials."
    );
  }

  // Get key material (extended spending key)
  const keyMaterial = await getKeyMaterial(systemId);

  // Validate that the identity's z-address matches the account's dlight seed.
  // If they differ the account cannot decrypt the stored credentials.
  // keyMaterial.extsk is already hex (decoded in getKeyMaterial), so call
  // Tools.deriveShieldedAddress directly rather than getAddresses (which
  // expects bech32).
  const derivedAddress = await Tools.deriveShieldedAddress(keyMaterial.extsk, "", coinObj.id);
  if (!derivedAddress || derivedAddress !== privateAddress) {
    throw new Error(
      "The z-address on this identity does not match the z-address linked to your account. " +
      "Credential encryption requires the identity's z-address to be derived from the same seed as your account's shielded (Z) address."
    );
  }

  // Convert identity address to 20-byte hex for zGetEncryptionAddress
  const identityAddress = identity.identityaddress;
  let idHex = fromBase58Check(identityAddress).hash.toString("hex");
  if (idHex.length % 2 !== 0) idHex = "0" + idHex;

  // Derive encryption address (self-encryption: fromId=toId=subject identity)
  const keys = await zGetEncryptionAddress(coinObj.system_id, {
    ...keyMaterial,
    fromId: idHex,
    toId: idHex,
  });

  if (!keys.address || !keys.ivk) {
    throw new Error("Failed to derive encryption address for credential encryption.");
  }

  const encryptionAddress = keys.address;
  const ivkHex = keys.ivk;

  const encryptedUniValues = [];

  for (const entry of credentialEntries) {
    if (entry instanceof VdxfUniValue && entry instanceof FqnVdxfUniValue) {
      for (const innerUniValue of entry.entries()) {
        const iaddr = innerUniValue[0].toAddress();

        if (iaddr !== CredentialKey.vdxfid) throw new Error("No inner credential key found in credential")
        else {
          const cred = innerUniValue[1];
          const encryptedDescriptorRes = (await encryptCredentialToDescriptor(encryptionAddress, cred));

          const val = new VdxfUniValue({
            values: [{
              [DataDescriptorKey.vdxfid]: encryptedDescriptorRes.encryptedDescriptor
            }]
          })

          encryptedUniValues.push(FqnVdxfUniValue.fromVdxfUniValue(val));
        }
      }
    } else throw new Error("Incorrectly formatted credential entries")
  }

  // Compute hashed key offline (replaces getvdxfid RPC)
  const hashedKeyHash = getConditionID(credentialKey, ivkHex);
  const hashedKeyIAddr = toBase58Check(hashedKeyHash, I_ADDR_VERSION);

  const modifiedDetails = new IdentityUpdateRequestDetails();
  modifiedDetails.fromBuffer(details.toBuffer());

  modifiedDetails.identity.contentMultiMap.kvContent.deleteByAddress(credentialKey);;
  modifiedDetails.identity.contentMultiMap.kvContent.setByAddress(hashedKeyIAddr, encryptedUniValues);

  // Reconstruct IdentityUpdateRequestDetails from modified CLI JSON
  return modifiedDetails;
};

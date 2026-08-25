import {
  Credential,
  CredentialKey,
  DataDescriptor,
  DataDescriptorKey,
  FqnVdxfUniValue,
  IDENTITY_CREDENTIAL,
  VdxfUniValue,
  fromBase58Check,
  toBase58Check,
} from "verus-typescript-primitives";
import { I_ADDR_VERSION } from "verus-typescript-primitives/dist/constants/vdxf";
import { CoinDirectory } from "../../CoinData/CoinDirectory";
import { getIdentityContent } from "../../api/channels/verusid/requests/getIdentityContent";
import { decryptData } from "../../api/channels/dlight/requests/decrypt";
import { zGetEncryptionAddress } from "../../api/channels/dlight/requests/zGetEncryptionAddress";
import { getConditionID } from "../../crypto/encryptCredentials";
import { getKeyMaterial } from "../../crypto/getKeyMaterial";

const asArray = value => {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
};

const scopeMatches = (credential, scope) => {
  if (!scope) return false;

  const scopes = credential.scopes;
  if (Array.isArray(scopes)) return scopes.includes(scope);

  if (scopes != null && typeof scopes === "object") {
    return (
      Object.keys(scopes).includes(scope) ||
      Object.values(scopes).includes(scope)
    );
  }

  return scopes === scope;
};

const parseVdxfUniValue = buffer => {
  const value = new VdxfUniValue();
  value.fromBuffer(buffer, 0);
  return value;
};

const parseFqnVdxfUniValue = buffer => {
  const value = new FqnVdxfUniValue();
  value.fromBuffer(buffer, 0);
  return value;
};

const extractCredentialFromInnerDescriptor = descriptor => {
  if (!(descriptor instanceof DataDescriptor) || !descriptor.objectdata) {
    return [];
  }

  const innerValue = parseVdxfUniValue(descriptor.objectdata);
  const credentials = [];

  for (const entry of innerValue.values) {
    const credential = entry[CredentialKey.vdxfid];

    if (credential instanceof Credential) {
      credentials.push(credential);
    }
  }

  return credentials;
};

const extractCredentialsFromPlaintext = plaintextBuffer => {
  const outerValue = parseVdxfUniValue(plaintextBuffer);
  const credentials = [];

  for (const entry of outerValue.values) {
    const credential = entry[CredentialKey.vdxfid];
    if (credential instanceof Credential) {
      credentials.push(credential);
      continue;
    }

    const descriptor = entry[DataDescriptorKey.vdxfid];
    credentials.push(...extractCredentialFromInnerDescriptor(descriptor));
  }

  return credentials;
};

const parseDescriptorJson = value => {
  if (value instanceof DataDescriptor) return value;
  if (value == null || typeof value !== "object") return null;

  try {
    return DataDescriptor.fromJson(value);
  } catch (_) {
    return null;
  }
};

const getDescriptorFromStoredValue = storedValue => {
  if (storedValue instanceof DataDescriptor) return storedValue;

  if (typeof storedValue === "string") {
    const value = parseFqnVdxfUniValue(Buffer.from(storedValue, "hex"));

    for (const [key, data] of value.entries()) {
      if (key.toAddress() === DataDescriptorKey.vdxfid && data instanceof DataDescriptor) {
        return data;
      }
    }
  }

  if (storedValue != null && typeof storedValue === "object") {
    const descriptorData =
      storedValue[DataDescriptorKey.vdxfid] ||
      storedValue[DataDescriptorKey.qualifiedname.name];

    const descriptor = parseDescriptorJson(descriptorData);
    if (descriptor instanceof DataDescriptor) return descriptor;

    if (storedValue.objectdata != null) {
      return parseDescriptorJson(storedValue);
    }
  }

  return null;
};

const decryptCredentialDescriptor = async (descriptor, fallbackIvkHex) => {
  if (!(descriptor instanceof DataDescriptor)) return [];

  const symmetricKeyHex = descriptor.ssk ? descriptor.ssk.toString("hex") : null;
  let ivkHex = descriptor.ivk ? descriptor.ivk.toString("hex") : fallbackIvkHex;
  let ephemeralPublicKeyHex = descriptor.epk ? descriptor.epk.toString("hex") : null;

  if (symmetricKeyHex) {
    ivkHex = null;
    ephemeralPublicKeyHex = null;
  }

  const plaintext = await decryptData({
    ivkHex,
    ephemeralPublicKeyHex,
    ciphertextHex: descriptor.objectdata.toString("hex"),
    symmetricKeyHex,
  });

  const plaintextBuffer = Buffer.isBuffer(plaintext)
    ? plaintext
    : Buffer.from(plaintext, "hex");

  return extractCredentialsFromPlaintext(plaintextBuffer);
};

export const getScopedCredentials = async ({
  systemID,
  identityAddress,
  scope,
  credentialKeys,
}) => {
  const coinObj = CoinDirectory.getBasicCoinObj(systemID);

  if (!coinObj) {
    throw new Error("Unsupported system: " + systemID);
  }

  const keyMaterial = await getKeyMaterial(coinObj.id);
  const identityHash = fromBase58Check(identityAddress).hash;
  const idHex = Buffer.from(identityHash).toString("hex");

  const keys = await zGetEncryptionAddress(coinObj.system_id, {
    ...keyMaterial,
    fromId: idHex,
    toId: idHex,
  });

  if (!keys.ivk) {
    throw new Error("Unable to derive credential viewing key.");
  }

  const hashedKey = toBase58Check(
    getConditionID(IDENTITY_CREDENTIAL.vdxfid, keys.ivk),
    I_ADDR_VERSION,
  );

  const contentRes = await getIdentityContent(
    coinObj.system_id,
    identityAddress,
  );

  if (contentRes.error) {
    throw new Error(contentRes.error.message);
  }

  const contentMultiMap = contentRes.result?.identity?.contentmultimap || {};
  const encryptedEntries = asArray(contentMultiMap[hashedKey]);
  const requestedKeys = new Set(credentialKeys || []);
  const credentials = [];

  for (const entry of encryptedEntries) {
    try {
      const descriptor = getDescriptorFromStoredValue(entry);
      const decryptedCredentials = await decryptCredentialDescriptor(descriptor, keys.ivk);

      for (const credential of decryptedCredentials) {
        if (
          requestedKeys.has(credential.credentialKey) &&
          scopeMatches(credential, scope) &&
          credential.isValid()
        ) {
          credentials.push(credential);
        }
      }
    } catch (e) {
      console.warn("Unable to parse encrypted credential entry", e);
    }
  }

  return credentials;
};

export const getMissingCredentialKeys = (credentialKeys, credentials) => {
  const found = new Set(credentials.map(credential => credential.credentialKey));
  return credentialKeys.filter(key => !found.has(key));
};

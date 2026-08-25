import {
  fromBase58Check,
  toIAddress,
} from "verus-typescript-primitives";
import { I_ADDRESS_VERSION } from "../../../../constants/constants";

const ROOT_SYSTEM_NAMES = {
  i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV: "VRSC",
  iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq: "VRSCTEST",
};

const getRootSystemName = systemId => {
  return ROOT_SYSTEM_NAMES[systemId] || null;
};

const getAddressVersion = value => {
  try {
    return fromBase58Check(value).version;
  } catch (e) {
    return null;
  }
};

const getExpectedLookupAddress = (systemId, lookup) => {
  if (typeof lookup !== "string" || lookup.trim().length === 0) {
    throw new Error("Invalid lookup identifier.");
  }

  const normalizedLookup = lookup.trim();
  const addressVersion = getAddressVersion(normalizedLookup);

  if (addressVersion != null) {
    if (addressVersion !== I_ADDRESS_VERSION) {
      throw new Error("Lookup identifier is not an identity address.");
    }

    return normalizedLookup;
  }

  const rootSystemName = getRootSystemName(systemId);

  if (rootSystemName != null) {
    return toIAddress(normalizedLookup, rootSystemName);
  }

  const cleanLookup = normalizedLookup
    .split("@")
    .filter(part => part.length > 0)
    .join("@");

  if (!cleanLookup.includes(".")) {
    throw new Error(
      "Cannot securely resolve an unqualified name for this system. Use an identity address or fully qualified name.",
    );
  }

  return toIAddress(normalizedLookup);
};

const getResponseAddressCandidates = (systemId, fullyQualifiedName) => {
  if (
    typeof fullyQualifiedName !== "string" ||
    fullyQualifiedName.trim().length === 0
  ) {
    throw new Error("Response is missing a fully qualified name.");
  }

  const candidates = new Set();
  const normalizedName = fullyQualifiedName.trim();
  const rootSystemName = getRootSystemName(systemId);

  candidates.add(toIAddress(normalizedName));

  if (rootSystemName != null) {
    candidates.add(toIAddress(normalizedName, rootSystemName));
  }

  return candidates;
};

export const validateLookupBinding = (
  systemId,
  lookup,
  responseAddress,
  fullyQualifiedName,
  responseType,
) => {
  if (typeof responseAddress !== "string") {
    throw new Error(`Response is missing a ${responseType} address.`);
  }

  const responseCandidates = getResponseAddressCandidates(
    systemId,
    fullyQualifiedName,
  );

  if (!responseCandidates.has(responseAddress)) {
    throw new Error(`Unable to parse response ${responseType} address.`);
  }

  const expectedAddress = getExpectedLookupAddress(systemId, lookup);

  if (expectedAddress !== responseAddress) {
    throw new Error(
      `RPC ${responseType} response does not match the requested identifier.`,
    );
  }
};

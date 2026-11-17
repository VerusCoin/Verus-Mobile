import {IDENTITY_FLAG_REVOKED} from 'verus-typescript-primitives';
import {isIdentityIndexUnavailable} from './identityIndex';
import {getIdentitiesWithAddress} from './requests/getIdentitiesWithAddress';
import {getIdentity} from './requests/getIdentity';
import {
  getIdentitiesWithRecovery,
  getIdentitiesWithRevocation,
} from './requests/getIdentitiesWithAuthority';

export const AUTHORITY_IDENTITY_DISCOVERY_STATUS = {
  EMPTY: 'empty',
  ERROR: 'error',
  LOADING: 'loading',
  READY: 'ready',
  UNSUPPORTED: 'unsupported',
};

const AUTHORITY_LOOKUP_BATCH_SIZE = 6;
const REVOKED_FLAG = IDENTITY_FLAG_REVOKED.toNumber();
const ROOT_SYSTEM_SUFFIX = /\.(?:VRSC|VRSCTEST)@$/i;

const normalizeResults = result => {
  if (result == null) return [];
  return Array.isArray(result) ? result : [result];
};

const getIdentityDefinition = result => result?.identity || result || {};

const isRevoked = identity =>
  (Number(identity?.flags || 0) & REVOKED_FLAG) !== 0;

const getDisplayName = result => {
  const identity = getIdentityDefinition(result);
  const friendlyName =
    result?.fullyqualifiedname ||
    result?.fullyQualifiedName ||
    result?.friendlyname ||
    result?.friendlyName;

  if (friendlyName) return friendlyName.replace(ROOT_SYSTEM_SUFFIX, '@');
  if (identity.name) return `${identity.name.replace(/@$/, '')}@`;

  return identity.identityaddress || 'VerusID';
};

const hydrateCandidates = async ({candidateMap, isRecovery, systemId}) => {
  const indexedCandidates = Array.from(candidateMap.values());
  const hydratedCandidates = [];
  let hydrationFailed = false;

  for (
    let offset = 0;
    offset < indexedCandidates.length;
    offset += AUTHORITY_LOOKUP_BATCH_SIZE
  ) {
    const candidateBatch = indexedCandidates.slice(
      offset,
      offset + AUTHORITY_LOOKUP_BATCH_SIZE,
    );
    const identityResponses = await Promise.all(
      candidateBatch.map(candidate =>
        getIdentity(systemId, candidate.identityAddress),
      ),
    );

    for (let index = 0; index < candidateBatch.length; index += 1) {
      const indexedCandidate = candidateBatch[index];
      const identityResponse = identityResponses[index];

      if (identityResponse?.error || !identityResponse?.result) {
        hydrationFailed = true;
        continue;
      }

      const identity = getIdentityDefinition(identityResponse.result);

      if (
        !isEligibleTarget(
          identity,
          indexedCandidate.authorityId,
          isRecovery,
        )
      ) {
        continue;
      }

      hydratedCandidates.push({
        displayName: getDisplayName(identityResponse.result),
        identity,
        identityAddress: identity.identityaddress,
      });
    }
  }

  return {candidates: hydratedCandidates, hydrationFailed};
};

const isUsableAuthority = (identity, primaryAddress) => {
  const minimumSignatures = Number(identity.minimumsignatures || 1);

  return (
    !isRevoked(identity) &&
    minimumSignatures <= 1 &&
    Array.isArray(identity.primaryaddresses) &&
    identity.primaryaddresses.includes(primaryAddress) &&
    Boolean(identity.identityaddress)
  );
};

const isEligibleTarget = (identity, authorityId, isRecovery) => {
  if (!identity.identityaddress) return false;

  if (isRecovery) {
    return (
      isRevoked(identity) && identity.recoveryauthority === authorityId
    );
  }

  const protectsItself =
    identity.identityaddress === identity.revocationauthority &&
    identity.identityaddress === identity.recoveryauthority;

  return (
    !isRevoked(identity) &&
    !protectsItself &&
    identity.revocationauthority === authorityId
  );
};

const responseStatus = response => {
  if (!response?.error) return null;

  return isIdentityIndexUnavailable(response.error)
    ? AUTHORITY_IDENTITY_DISCOVERY_STATUS.UNSUPPORTED
    : AUTHORITY_IDENTITY_DISCOVERY_STATUS.ERROR;
};

export const discoverAuthorityIdentityTargets = async ({
  isRecovery,
  primaryAddress,
  systemId,
}) => {
  try {
    const authorityResponse = await getIdentitiesWithAddress(
      systemId,
      primaryAddress,
      true,
    );
    const authorityResponseStatus = responseStatus(authorityResponse);

    if (authorityResponseStatus) {
      return {candidates: [], status: authorityResponseStatus};
    }

    const authorities = normalizeResults(authorityResponse.result)
      .map(getIdentityDefinition)
      .filter(identity => isUsableAuthority(identity, primaryAddress));
    const candidateMap = new Map();

    for (
      let offset = 0;
      offset < authorities.length;
      offset += AUTHORITY_LOOKUP_BATCH_SIZE
    ) {
      const authorityBatch = authorities.slice(
        offset,
        offset + AUTHORITY_LOOKUP_BATCH_SIZE,
      );
      const targetResponses = await Promise.all(
        authorityBatch.map(authority => {
          const authorityId = authority.identityaddress;

          return isRecovery
            ? getIdentitiesWithRecovery(systemId, authorityId, true)
            : getIdentitiesWithRevocation(systemId, authorityId, true);
        }),
      );

      for (let index = 0; index < authorityBatch.length; index += 1) {
        const authorityId = authorityBatch[index].identityaddress;
        const targetResponse = targetResponses[index];
        const targetResponseStatus = responseStatus(targetResponse);

        if (targetResponseStatus) {
          return {candidates: [], status: targetResponseStatus};
        }

        for (const result of normalizeResults(targetResponse.result)) {
          const identity = getIdentityDefinition(result);

          if (!isEligibleTarget(identity, authorityId, isRecovery)) continue;

          candidateMap.set(identity.identityaddress, {
            authorityId,
            identityAddress: identity.identityaddress,
          });
        }
      }
    }

    const {candidates, hydrationFailed} = await hydrateCandidates({
      candidateMap,
      isRecovery,
      systemId,
    });
    candidates.sort((left, right) =>
      left.displayName.localeCompare(right.displayName),
    );

    return {
      candidates,
      status: candidates.length
        ? AUTHORITY_IDENTITY_DISCOVERY_STATUS.READY
        : hydrationFailed
        ? AUTHORITY_IDENTITY_DISCOVERY_STATUS.ERROR
        : AUTHORITY_IDENTITY_DISCOVERY_STATUS.EMPTY,
    };
  } catch (error) {
    return {
      candidates: [],
      status: isIdentityIndexUnavailable(error)
        ? AUTHORITY_IDENTITY_DISCOVERY_STATUS.UNSUPPORTED
        : AUTHORITY_IDENTITY_DISCOVERY_STATUS.ERROR,
    };
  }
};

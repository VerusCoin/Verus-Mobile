import {ApiRequest} from 'verus-typescript-primitives';
import VrpcProvider from '../../../../vrpc/vrpcInterface';

const GET_IDENTITIES_WITH_RECOVERY = 'getidentitieswithrecovery';
const GET_IDENTITIES_WITH_REVOCATION = 'getidentitieswithrevocation';

class GetIdentitiesWithAuthorityRequest extends ApiRequest {
  constructor(chain, command, identityId, unspent) {
    super(chain, command);
    this.query = {
      identityid: identityId,
      unspent,
    };
  }

  getParams() {
    return [this.query];
  }
}

const getIdentitiesWithAuthority = (
  systemId,
  command,
  identityId,
  unspent = true,
) => {
  const request = new GetIdentitiesWithAuthorityRequest(
    systemId,
    command,
    identityId,
    unspent,
  );
  return VrpcProvider.getEndpoint(systemId).request(request);
};

export const getIdentitiesWithRecovery = (
  systemId,
  identityId,
  unspent = true,
) =>
  getIdentitiesWithAuthority(
    systemId,
    GET_IDENTITIES_WITH_RECOVERY,
    identityId,
    unspent,
  );

export const getIdentitiesWithRevocation = (
  systemId,
  identityId,
  unspent = true,
) =>
  getIdentitiesWithAuthority(
    systemId,
    GET_IDENTITIES_WITH_REVOCATION,
    identityId,
    unspent,
  );

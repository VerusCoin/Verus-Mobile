import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getIdentity = (coinObj, iAddressOrName, height, txproof, txproofheight) => {
  return VrpcProvider.getEndpoint(coinObj.id).getIdentity(
    iAddressOrName,
    height,
    txproof,
    txproofheight,
  );
}

export const extractIdentityAddress = async (
  identityAddressString,
  coinId = 'VRSC',
) => {
  if (coinId !== 'VRSC' && coinId !== 'VRSCTEST') {
    throw new Error(
      'VerusIDs are currently only supported for VRSC and VRSCTEST',
    );
  }

  let identityArray = identityAddressString.split('@');

  if (identityArray.length !== 2) throw new Error('Invalid VerusID format.');

  if (identityArray[1] === ':private' || identityArray[1] === '') {
    try {
      let status, identity;
      const idRes = await getIdentity({id: coinId}, `${identityArray[0]}@`);

      if (idRes.error) throw new Error(idRes.error.message)
      else {
        status = idRes.result.status
        identity = idRes.result.identity
      }

      if (status !== 'active') {
        throw new Error(
          `${identity.name}@ is currently either revoked or unable to receive funds.`,
        );
      }

      if (identityArray[1] === ':private') {
        if (identity.privateaddress != null) {
          return identity.privateaddress;
        } else {
          throw new Error(`${identity.name}@ has no private address.`);
        }
      } else {
        return identity.identityaddress;
      }
    } catch (e) {
      console.warn(e);
      throw e;
    }
  } else {
    throw new Error('Invalid VerusID format.');
  }
};
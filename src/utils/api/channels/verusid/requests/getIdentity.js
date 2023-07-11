import { toIAddress } from "verus-typescript-primitives";
import { CoinDirectory } from "../../../../CoinData/CoinDirectory";
import VrpcProvider from "../../../../vrpc/vrpcInterface"
import { IS_PBAAS } from "../../../../constants/intervalConstants";

export const getIdentity = async (systemId, iAddressOrName, height, txproof, txproofheight) => {
  const res = await VrpcProvider.getEndpoint(systemId).getIdentity(
    iAddressOrName,
    height,
    txproof,
    txproofheight,
  );

  if (res.error) return res;
  else {
    try {
      const identityDefinition = res.result.identity;
      const identityFqn = res.result.fullyqualifiedname;
      
      const calculatedIAddrMain = toIAddress(identityFqn, "VRSC");
      const calculatedIAddrTest = toIAddress(identityFqn, "VRSCTEST");
    
      if (
        calculatedIAddrMain !== identityDefinition.identityaddress &&
        calculatedIAddrTest !== identityDefinition.identityaddress
      ) {
        return {
          id: 0,
          error: {
            message: 'Unable to parse response identityaddress.',
            code: -1,
          },
        };
      }
    } catch(e) {
      return {
        id: 0,
        error: {
          message: e.message,
          code: -1
        }
      }
    }

    return res;
  }
}

export const extractIdentityAddress = async (
  identityAddressString,
  coinObj,
  channel
) => {
  if (!coinObj.tags.includes(IS_PBAAS)) {
    throw new Error(
      'VerusIDs are not currently supported for ' + coinObj.display_ticker,
    );
  }

  let identityArray = identityAddressString.split('@');
  const [channelName, iAddress, systemId] = channel.split('.')

  if (identityArray.length !== 2) throw new Error('Invalid VerusID format.');

  if (identityArray[1] === ':private' || identityArray[1] === '') {
    try {
      let status, identity;
      const idRes = await getIdentity(systemId, `${identityArray[0]}@`);

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
          return { address: identity.privateaddress };
        } else {
          throw new Error(`${identity.name}@ has no private address.`);
        }
      } else {
        return { address: identity.identityaddress, label: idRes.result.fullyqualifiedname };
      }
    } catch (e) {
      console.warn(e);
      throw e;
    }
  } else {
    throw new Error('Invalid VerusID format.');
  }
};
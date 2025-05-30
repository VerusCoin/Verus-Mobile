import { decompile, GetIdentityResponse, OPS, OptCCParams, Identity, fromBase58Check, IdentityUpdateRequestDetails } from "verus-typescript-primitives";
import VrpcProvider from "../../../../vrpc/vrpcInterface"
import { getIdentity } from "./getIdentity";
import { getSpendableUtxos, getTransaction, sendRawTransaction } from "../../vrpc/callCreators";
import { networks, Transaction } from "@bitgo/utxo-lib";
import { I_ADDRESS_VERSION } from "../../../../constants/constants";

export const extractIdOutputFromTx = (rawIdTx, vout = null) => {
  const identityTransaction = Transaction.fromHex(rawIdTx, networks.verus);

  for (const i = vout != null ? vout : 0; i < identityTransaction.outs.length; i++) {
    if (vout != null && i > vout) break;

    const output = identityTransaction.outs[i];
    const decomp = decompile(Buffer.from(output.script));
  
    if (decomp.length !== 4) continue;
    if (decomp[1] !== OPS.OP_CHECKCRYPTOCONDITION) continue;
    if (decomp[3] !== OPS.OP_DROP) continue;
  
    try {
      const outParams = OptCCParams.fromChunk(Buffer.from(decomp[2]));
  
      const __identity = new Identity();
      __identity.fromBuffer(outParams.getParamObject());

      return __identity;
    } catch(e) {
      continue;
    }
  }

  throw new Error("Could not find identity output in tx");
}

/**
 * Safely extracts an editable/serializable identity class instance from the transaction an identity came from,
 * as opposed to trusting the server to return the object correctly
 * @param {string} systemId 
 * @param {GetIdentityResponse["result"]} getIdentityResult 
 * @returns {Promise<{tx: string, identity: Identity}>}
 */
export const getUpdatableIdentity = async (systemId, getIdentityResult) => {
  const { txid, vout } = getIdentityResult;

  const rawIdTxRes = await getTransaction(systemId, txid, 0);

  if (rawIdTxRes.error) throw new Error(rawIdTxRes.error.message);
  else {
    const rawIdTx = rawIdTxRes.result;
    const identity = extractIdOutputFromTx(rawIdTx, vout);

    return { tx: rawIdTx, identity };
  }
}

/**
 * Updates the provided identity from its current state (using the provided identities i-addr) to the 
 * state provided in identity
 * @param {string} systemId The system id to update the id on
 * @param {Identity | IdentityUpdateRequestDetails} identity The identity to update to
 * @param {string} changeAaddr The address to send the change to
 * @param {string} rawIdTx The raw transaction that created the identity
 * @param {number} idHeight The height of the block that the identity was created in
 * @param {boolean} fundTransaction Whether or not to fund the transaction that gets returned
 * @returns 
 */
export const createUpdateIdentityTx = async (systemId, identity, changeAaddr, rawIdTx, idHeight, fundTransaction = true, updateIdentityTransactionHex) => {
  const verusid = VrpcProvider.getVerusIdInterface(systemId);
  const utxos = fundTransaction ? await getSpendableUtxos(systemId, systemId, [changeAaddr]) : undefined;

  return verusid.createUpdateIdentityTransaction(identity, changeAaddr, rawIdTx, idHeight, utxos, undefined, undefined, undefined, undefined, updateIdentityTransactionHex);
}

export const createRevokeIdentityTx = async (systemId, iAddr, changeAaddr) => {
  const verusid = VrpcProvider.getVerusIdInterface(systemId);

  const idRes = await getIdentity(systemId, iAddr);

  if (idRes.error) throw new Error(idRes.error.message);
  else {
    const { blockheight } = idRes.result;
    const { tx, identity } = await getUpdatableIdentity(systemId, idRes.result);
    const utxos = await getSpendableUtxos(systemId, systemId, [changeAaddr]);

    return verusid.createRevokeIdentityTransaction(identity, changeAaddr, tx, blockheight, utxos);
  }
}

export const createRecoverIdentityTx = async (systemId, iAddr, recoveryAuthority, revocationAuthority, primaryAddresses, privateAddress, changeAaddr) => {
  const verusid = VrpcProvider.getVerusIdInterface(systemId);

  const idRes = await getIdentity(systemId, iAddr);

  if (idRes.error) throw new Error(idRes.error.message);
  else {
    const { blockheight } = idRes.result;
    const { tx, identity } = await getUpdatableIdentity(systemId, idRes.result);

    async function getAuthorityAddress(authString) {
      let addressVersion;
      try {
        const { version } = fromBase58Check(authString);
        addressVersion = version
      } catch(e) {}

      if (addressVersion != null && addressVersion === I_ADDRESS_VERSION) {
        return authString
      } else {
        const recRes = await getIdentity(systemId, authString);
        if (recRes.error) throw new Error(recRes.error.message);
        else {
          const id = (await getUpdatableIdentity(systemId, recRes.result)).identity;
          return id.getIdentityAddress()
        }
      }
    }

    if (primaryAddresses != null) identity.setPrimaryAddresses(primaryAddresses);
    if (privateAddress != null) identity.setPrivateAddress(privateAddress);

    if (recoveryAuthority != null) {
      identity.setRecovery(await getAuthorityAddress(recoveryAuthority))
    }

    if (revocationAuthority != null) {
      identity.setRevocation(await getAuthorityAddress(revocationAuthority))
    }
    
    const utxos = await getSpendableUtxos(systemId, systemId, [changeAaddr]);
    return verusid.createRecoverIdentityTransaction(identity, changeAaddr, tx, blockheight, utxos);
  }
}

export const pushUpdateIdentityTx = (systemId, txHex, inputs, keys) => {
  const verusid = VrpcProvider.getVerusIdInterface(systemId);
  const signedTx = verusid.signUpdateIdentityTransaction(txHex, inputs, keys);

  return sendRawTransaction(systemId, signedTx);
}
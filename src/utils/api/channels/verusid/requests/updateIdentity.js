import {
  decompile,
  GetIdentityResponse,
  OPS,
  OptCCParams,
  Identity,
  fromBase58Check,
  IdentityUpdateRequestDetails,
  IdentityUpdateResponseDetails,
} from 'verus-typescript-primitives';
import VrpcProvider from '../../../../vrpc/vrpcInterface';
import {getIdentity} from './getIdentity';
import {getSpendableUtxos, getTransaction} from '../../vrpc/callCreators';
import {networks, Transaction} from '@bitgo/utxo-lib';
import {I_ADDRESS_VERSION} from '../../../../constants/constants';
import {verifyIdentityUpdateFunding} from 'verusid-ts-client';
import {assertSupportedIdentityUploads} from '../../../../identityUpdate/uploadPolicy';

export const extractIdOutputFromTx = (rawIdTx, vout = null) => {
  const identityTransaction = Transaction.fromHex(rawIdTx, networks.verus);

  // A supplied vout selects one definition; otherwise inspect each output.
  for (let i = vout != null ? vout : 0; i < identityTransaction.outs.length; i++) {
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
    } catch (e) {
      continue;
    }
  }

  throw new Error('Could not find identity output in tx');
};

/**
 * Safely extracts an editable/serializable identity class instance from the transaction an identity came from,
 * as opposed to trusting the server to return the object correctly
 * @param {string} systemId
 * @param {GetIdentityResponse["result"]} getIdentityResult
 * @returns {Promise<{tx: string, identity: Identity}>}
 */
export const getUpdatableIdentity = async (systemId, getIdentityResult) => {
  const {txid, vout} = getIdentityResult;

  const rawIdTxRes = await getTransaction(systemId, txid, 0);

  if (rawIdTxRes.error) throw new Error(rawIdTxRes.error.message);
  else {
    const rawIdTx = rawIdTxRes.result;
    const identity = extractIdOutputFromTx(rawIdTx, vout);

    const identityAddress = getIdentityResult.identity.identityaddress;

    if (identityAddress !== identity.getIdentityAddress()) {
      throw new Error('Identity from rawtx does not match intended identity');
    }

    return {tx: rawIdTx, identity};
  }
};

/**
 * Updates the provided identity from its current state (using the provided identities i-addr) to the
 * state provided in identity
 * @param {string} systemId The system id to update the id on
 * @param {Identity | IdentityUpdateRequestDetails} identity The identity to update to
 * @param {string} changeAaddr The address to send the change to
 * @param {string} rawIdTx The raw transaction that created the identity
 * @param {number} idHeight The height of the block that the identity was created in
 * @param {boolean} fundTransaction Whether or not to fund the transaction that gets returned
 * @returns The prepared identity transaction and its funding approval.
 */
export const createUpdateIdentityTx = async (
  systemId,
  identity,
  changeAaddr,
  rawIdTx,
  idHeight,
  fundTransaction = true,
  isTestnet,
  localUploadCrypto,
  currentHeight,
) => {
  assertSupportedIdentityUploads(identity);

  const verusid = VrpcProvider.getVerusIdInterface(systemId);
  const utxos = fundTransaction
    ? await getSpendableUtxos(systemId, systemId, [changeAaddr])
    : undefined;

  // The SDK snapshots and canonicalizes the request itself. A serialization
  // roundtrip here can discard upload fields whose flags have not been set yet.
  return verusid.createUpdateIdentityTransaction(
    identity,
    changeAaddr,
    rawIdTx,
    idHeight,
    utxos,
    systemId,
    undefined,
    undefined,
    currentHeight,
    undefined,
    true,
    isTestnet,
    false,
    localUploadCrypto?.decryptData,
    localUploadCrypto,
  );
};

// Gift/claim and management flows supply the funding candidates they reviewed.
export const createUpdateIdentityTxWithUtxos = async ({
  systemId,
  identity,
  changeAaddr,
  rawIdTx,
  idHeight,
  utxos,
  maxFee,
  expectedIdentityPrimaryAddress,
  fundRawTransactionResult,
  currentHeight,
  isTestnet,
  localUploadCrypto,
}) => {
  assertSupportedIdentityUploads(identity);

  const verusid = VrpcProvider.getVerusIdInterface(systemId);

  return verusid.createUpdateIdentityTransaction(
    identity,
    changeAaddr,
    rawIdTx,
    idHeight,
    utxos,
    systemId,
    maxFee,
    fundRawTransactionResult,
    currentHeight,
    undefined,
    true,
    isTestnet,
    false,
    localUploadCrypto?.decryptData,
    localUploadCrypto,
  );
};

// Keep explicit currency outputs and the identity update in one SDK approval.
export const createUpdateIdentityWithCurrencyTransferTx = async ({
  systemId,
  identity,
  changeAaddr,
  rawIdTx,
  idHeight,
  currencyTransferOutputs,
  utxos,
  maxFee,
  expectedIdentityPrimaryAddress,
  expectedIdentityPrimaryAddresses,
  expectedIdentityMinimumSignatures,
  fundRawTransactionResult,
  currentHeight,
  isTestnet,
  localUploadCrypto,
}) => {
  assertSupportedIdentityUploads(identity);

  const verusid = VrpcProvider.getVerusIdInterface(systemId);

  return verusid.createUpdateIdentityWithCurrencyTransferTransaction(
    identity,
    changeAaddr,
    rawIdTx,
    idHeight,
    currencyTransferOutputs,
    utxos,
    {
      chainIAddr: systemId,
      maxFee,
      fundRawTransactionResult,
      currentHeight,
      parseVdxfObjects: true,
      isTestnet,
      expectedIdentityPrimaryAddress,
      expectedIdentityPrimaryAddresses,
      expectedIdentityMinimumSignatures,
      decryptData: localUploadCrypto?.decryptData,
      localUploadCrypto,
    },
  );
};

export const createUpdateIdentityResponse = async (
  systemId,
  signerId,
  reqId,
  txid,
  primAddrWif,
) => {
  const verusid = VrpcProvider.getVerusIdInterface(systemId);

  return verusid.createIdentityUpdateResponse(
    signerId,
    IdentityUpdateResponseDetails.fromJson({
      flags: '0',
      requestid: reqId,
      createdat: (Date.now() / 1000).toFixed(0),
      txid: txid,
    }),
    primAddrWif,
  );
};

export const createRevokeIdentityTx = async (systemId, iAddr, changeAaddr) => {
  const verusid = VrpcProvider.getVerusIdInterface(systemId);

  const idRes = await getIdentity(systemId, iAddr);

  if (idRes.error) throw new Error(idRes.error.message);
  else {
    const {blockheight} = idRes.result;
    const {tx, identity} = await getUpdatableIdentity(systemId, idRes.result);
    const utxos = await getSpendableUtxos(systemId, systemId, [changeAaddr]);

    return verusid.createRevokeIdentityTransaction(
      identity,
      changeAaddr,
      tx,
      blockheight,
      utxos,
      systemId,
    );
  }
};

export const createRecoverIdentityTx = async (
  systemId,
  iAddr,
  recoveryAuthority,
  revocationAuthority,
  primaryAddresses,
  privateAddress,
  changeAaddr,
) => {
  const verusid = VrpcProvider.getVerusIdInterface(systemId);

  const idRes = await getIdentity(systemId, iAddr);

  if (idRes.error) throw new Error(idRes.error.message);
  else {
    const {blockheight} = idRes.result;
    const {tx, identity} = await getUpdatableIdentity(systemId, idRes.result);

    // Recovery accepts either authority i-addresses or names resolved on-chain.
    async function getAuthorityAddress(authString) {
      let addressVersion;

      try {
        const {version} = fromBase58Check(authString);
        addressVersion = version;
      } catch (e) {}

      if (addressVersion != null && addressVersion === I_ADDRESS_VERSION) {
        return authString;
      } else {
        const recRes = await getIdentity(systemId, authString);

        if (recRes.error) throw new Error(recRes.error.message);
        else {
          const id = (await getUpdatableIdentity(systemId, recRes.result)).identity;

          return id.getIdentityAddress();
        }
      }
    }

    if (primaryAddresses != null) identity.setPrimaryAddresses(primaryAddresses);
    if (privateAddress != null) identity.setPrivateAddress(privateAddress);

    if (recoveryAuthority != null) {
      identity.setRecovery(await getAuthorityAddress(recoveryAuthority));
    }

    if (revocationAuthority != null) {
      identity.setRevocation(await getAuthorityAddress(revocationAuthority));
    }

    const utxos = await getSpendableUtxos(systemId, systemId, [changeAaddr]);

    return verusid.createRecoverIdentityTransaction(
      identity,
      changeAaddr,
      tx,
      blockheight,
      utxos,
      systemId,
    );
  }
};

export const verifyIdentityUpdateTx = (
  systemId,
  txHex,
  inputs,
  fundingApproval,
  lockContext,
) => {
  if (!fundingApproval) throw new Error('Missing verified identity funding approval.');

  if (fundingApproval.systemId !== systemId) {
    throw new Error('Identity funding approval belongs to a different chain.');
  }

  return verifyIdentityUpdateFunding(fundingApproval, txHex, inputs, lockContext);
};

export const signUpdateIdentityTx = (
  systemId,
  txHex,
  inputs,
  keys,
  fundingApproval,
  lockContext,
) => {
  // Verify the reviewed inputs before signing and the resulting bytes afterward.
  verifyIdentityUpdateTx(systemId, txHex, inputs, fundingApproval, lockContext);

  const verusid = VrpcProvider.getVerusIdInterface(systemId);
  const signedHex = verusid.signUpdateIdentityTransaction(
    txHex,
    inputs,
    keys,
    fundingApproval,
    lockContext,
  );

  verifyIdentityUpdateTx(systemId, signedHex, inputs, fundingApproval, lockContext);

  return signedHex;
};

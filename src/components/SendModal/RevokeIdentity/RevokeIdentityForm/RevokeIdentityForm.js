import {captureIdentityUpdateContext, assertIdentityUpdateContext, validateIdentityUpdateContext} from '../../../../utils/identityUpdate/verifiedSubmission';
import {satsToCoins} from '../../../../utils/math';
import BigNumber from 'bignumber.js';
import store from '../../../../store';
import {showFundRawTransactionErrorAlert} from '../../../../utils/vrpc/fundRawTransactionError';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
import {fromBase58Check} from '@bitgo/utxo-lib/dist/src/address';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../../utils/api/channels/verusid/callCreators';
import {ELECTRUM} from '../../../../utils/constants/intervalConstants';
import {
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_IDENTITY_TO_REVOKE_FIELD,
  SEND_MODAL_SYSTEM_ID,
} from '../../../../utils/constants/sendModal';
import {deriveKeyPair} from '../../../../utils/keys';
import {RevokeIdentityFormRender} from './RevokeIdentityForm.render';
import {createRevokeIdentityTx} from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import {decryptkey} from '../../../../utils/seedCrypt';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import useAuthorityIdentityDiscovery from '../../../../containers/RevokeRecover/useAuthorityIdentityDiscovery';

const SAFE_REVOCATION_ERRORS = new Set([
  'This VerusID could not be found on the selected blockchain.',
  'Cannot revoke VerusID that is already revoked.',
  'Cannot revoke VerusID that has itself set as both revocation and recovery.',
  'The revocation authority could not be verified on this blockchain.',
  'Revocation identity is not active, and therefore unable to sign transactions.',
  'Revocation identity has minimum signatures > 1. Please revoke through CLI or Verus Desktop.',
  'The imported secret or key does not control this VerusID’s revocation authority.',
]);

const getSafeRevocationError = (error, networkName) => {
  if (error?.message === 'Unable to decrypt recovery secret') {
    return 'The imported authority key could not be read. Go back and import it again.';
  }

  if (SAFE_REVOCATION_ERRORS.has(error?.message)) return error.message;

  if (
    error?.message === "Couldn't fund raw transaction" ||
    error?.message === 'Insufficient funds in UTXOs provided'
  ) {
    return `The authority address needs enough ${networkName} to pay the network fee before this VerusID can be revoked.`;
  }

  return 'The VerusID could not be prepared for revocation. Check the identity, blockchain, and connection, then try again.';
};

const RevokeIdentityForm = props => {
  const sendModal = useObjectSelector(state => state.sendModal);
  const instanceKey = useSelector(state => state.authentication.instanceKey);
  const encryptedIdentitySeed =
    sendModal.data[SEND_MODAL_ENCRYPTED_IDENTITY_SEED];
  const systemId = sendModal.data[SEND_MODAL_SYSTEM_ID];
  const [networkName, setNetworkName] = useState(systemId);
  const [formError, setFormError] = useState(null);
  const initialIdentity =
    sendModal.data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD]?.trim() || '';
  const [shouldAutoOpenIdentitySheet] = useState(
    () => !initialIdentity,
  );
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const identitySheetVisibleRef = useRef(false);
  const [manualEntry, setManualEntry] = useState(Boolean(initialIdentity));
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const identityDiscovery = useAuthorityIdentityDiscovery({
    active: !manualEntry,
    encryptedSeed: encryptedIdentitySeed,
    instanceKey,
    isRecovery: false,
    systemId,
  });

  identitySheetVisibleRef.current = identitySheetVisible;

  useEffect(() => {
    const handleRequestClose = () => {
      if (!identitySheetVisibleRef.current) return false;

      setIdentitySheetVisible(false);
      return true;
    };

    props.setIdentitySafetyRequestCloseHandler(handleRequestClose);

    return () => props.setIdentitySafetyRequestCloseHandler(null);
  }, [props.setIdentitySafetyRequestCloseHandler]);

  useEffect(() => {
    try {
      const systemObj = CoinDirectory.findSystemCoinObj(systemId);
      setNetworkName(systemObj.display_name);
    } catch (e) {}
  }, [systemId]);

  const formHasError = useCallback(() => {
    const {data} = sendModal;

    const identity =
      data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD] != null
        ? data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD].trim()
        : '';

    if (!identity || identity.length < 1) {
      return 'Enter the VerusID you want to revoke.';
    }

    try {
      fromBase58Check(identity);
    } catch (e) {
      if (!identity.endsWith('@')) {
        return 'Enter a VerusID name ending in @ or a valid i-address.';
      }
    }

    return null;
  }, [sendModal]);

  const getPotentialPrimaryAddresses = useCallback(async () => {
    const seed = decryptkey(instanceKey, encryptedIdentitySeed);

    if (!seed) throw new Error('Unable to decrypt recovery secret');

    const system = CoinDirectory.findSystemCoinObj(systemId);
    const keyObj = await deriveKeyPair(seed, system, ELECTRUM);
    const {addresses} = keyObj;

    return addresses;
  }, [encryptedIdentitySeed, instanceKey, systemId]);

  const chooseCandidate = useCallback(candidate => {
    setFormError(null);
    setSelectedCandidate(candidate);
    setManualEntry(false);
    props.updateSendFormData(
      SEND_MODAL_IDENTITY_TO_REVOKE_FIELD,
      candidate.identityAddress,
    );
    setIdentitySheetVisible(false);
  }, [props.updateSendFormData]);

  const chooseManualEntry = useCallback(() => {
    setFormError(null);
    setSelectedCandidate(null);
    setManualEntry(true);
    setIdentitySheetVisible(false);
  }, []);

  const openIdentitySheet = useCallback(() => {
    setManualEntry(false);
    setIdentitySheetVisible(true);
  }, []);

  useEffect(() => {
    if (!shouldAutoOpenIdentitySheet || manualEntry || selectedCandidate) return;

    const {candidates, status} = identityDiscovery;

    if (status === 'ready' && candidates.length === 1) {
      chooseCandidate(candidates[0]);
      return;
    }

    if (
      (status === 'ready' && candidates.length > 1) ||
      status === 'error' ||
      status === 'unsupported'
    ) {
      setIdentitySheetVisible(true);
    }
  }, [
    chooseCandidate,
    identityDiscovery.candidates,
    identityDiscovery.status,
    manualEntry,
    selectedCandidate,
    shouldAutoOpenIdentitySheet,
  ]);

  const updateIdentity = text => {
    setFormError(null);
    setSelectedCandidate(null);
    props.updateSendFormData(SEND_MODAL_IDENTITY_TO_REVOKE_FIELD, text);
  };

  const submitData = useCallback(async () => {
    const validationError = formHasError();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    props.setLoading(true);

    const {data} = sendModal;

    const identity = data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD];

    let ownedAddress = '';
    let revocableByUser = false;

    let updateContext;
    try {
      updateContext = captureIdentityUpdateContext({
        systemId: data[SEND_MODAL_SYSTEM_ID], modalRequestId: sendModal.requestId, allowSignedOut: true,
      });
      const tarRes = await getIdentity(data[SEND_MODAL_SYSTEM_ID], identity);
      assertIdentityUpdateContext(updateContext);
      if (tarRes.error) {
        throw new Error(
          'This VerusID could not be found on the selected blockchain.',
        );
      }

      if (tarRes.result.status === 'revoked') {
        throw new Error('Cannot revoke VerusID that is already revoked.');
      }

      const revocation = tarRes.result.identity.revocationauthority;
      const recovery = tarRes.result.identity.recoveryauthority;
      const idaddr = tarRes.result.identity.identityaddress;

      if (revocation === idaddr && revocation === recovery) {
        throw new Error(
          'Cannot revoke VerusID that has itself set as both revocation and recovery.',
        );
      }

      const revRes = await getIdentity(data[SEND_MODAL_SYSTEM_ID], revocation);
      assertIdentityUpdateContext(updateContext);
      if (revRes.error) {
        throw new Error(
          'The revocation authority could not be verified on this blockchain.',
        );
      }

      if (revRes.result.status !== 'active') {
        throw new Error(
          'Revocation identity is not active, and therefore unable to sign transactions.',
        );
      }

      if (revRes.result.identity.minimumsignatures > 1) {
        throw new Error(
          'Revocation identity has minimum signatures > 1. Please revoke through CLI or Verus Desktop.',
        );
      }

      let isInWallet = false;
      const addrs = await getPotentialPrimaryAddresses();
      assertIdentityUpdateContext(updateContext);

      for (const address of revRes.result.identity.primaryaddresses) {
        if (addrs.includes(address)) {
          isInWallet = true;
          ownedAddress = address;
          revocableByUser = true;
          break;
        }
      }

      if (!isInWallet) {
        throw new Error(
          'The imported secret or key does not control this VerusID’s revocation authority.',
        );
      }

      updateContext = {...updateContext, identitySnapshots: [{
        identityAddress: revRes.result.identity.identityaddress,
        txid: revRes.result.txid, vout: revRes.result.vout,
      }]};
      const friendlyNames = await getFriendlyNameMap(
        data[SEND_MODAL_SYSTEM_ID],
        tarRes.result,
      );

      assertIdentityUpdateContext(updateContext);
      const targetIdAddr = tarRes.result.identity.identityaddress;
      const revocationResult = await createRevokeIdentityTx(
        data[SEND_MODAL_SYSTEM_ID],
        targetIdAddr,
        revRes.result.identity.identityaddress,
      );

      await validateIdentityUpdateContext(updateContext, revocationResult);
      assertIdentityUpdateContext(updateContext);
      props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        updateContext,
        fee: satsToCoins(BigNumber(revocationResult.fundingApproval.nativeFee)).toString(),
        feeCurrency: networkName,
        targetId: tarRes.result,
        revocationId: revRes.result,
        friendlyNames,
        ownedAddress,
        revocableByUser,
        revocationResult,
      });
    } catch (e) {
      if (e.code === 'SESSION_CHANGED') return;
      if (updateContext) {
        try { assertIdentityUpdateContext(updateContext); } catch (_) { return; }
      }
      if (!showFundRawTransactionErrorAlert(e)) {
        setFormError(getSafeRevocationError(e, networkName));
      }
    } finally {
      if (store.getState().sendModal.requestId === sendModal.requestId) props.setLoading(false);
    }
  }, [formHasError, getPotentialPrimaryAddresses, sendModal, props]);

  return RevokeIdentityFormRender({
    chooseCandidate,
    chooseManualEntry,
    formError,
    identityDiscovery,
    identitySheetVisible,
    manualEntry,
    onCloseIdentitySheet: () => setIdentitySheetVisible(false),
    onOpenIdentitySheet: openIdentitySheet,
    selectedCandidate,
    submitData,
    updateIdentity,
    formDataValue: sendModal.data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD],
    loading: props.loading,
    networkName,
    onBack: props.cancel,
  });
};

export default RevokeIdentityForm;

import React, {useState, useCallback, useRef} from 'react';
import {useSelector} from 'react-redux';
import {useFocusEffect} from '@react-navigation/native';
import {revokeRecoverSubmissionError} from '../../../../containers/RevokeRecover/submissionError';
import {
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
  SEND_MODAL_SYSTEM_ID,
} from '../../../../utils/constants/sendModal';
import {RevokeIdentityConfirmRender} from './RevokeIdentityConfirm.render';
import {assertIdentityUpdateContext, submitReviewedIdentityUpdate} from '../../../../utils/identityUpdate/verifiedSubmission';
import store from '../../../../store';
import {decryptkey} from '../../../../utils/seedCrypt';
import {deriveKeyPair} from '../../../../utils/keys';
import {ELECTRUM} from '../../../../utils/constants/intervalConstants';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';

const RevokeIdentityConfirm = props => {
  const targetId = props.route.params.targetId;
  const revocationId = props.route.params.revocationId;
  const revocationResult = props.route.params.revocationResult;
  const friendlyNames = props.route.params.friendlyNames;
  const updateContext = props.route.params.updateContext;
  const submitting = useRef(false);
  const completed = useRef(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const instanceKey = useSelector(state => state.authentication.instanceKey);

  useFocusEffect(useCallback(() => {
    setAcknowledged(false);
    setSubmitError(null);
  }, [revocationResult, updateContext]));

  const sendModal = useObjectSelector(state => state.sendModal);
  const encryptedIdentitySeed =
    sendModal.data[SEND_MODAL_ENCRYPTED_IDENTITY_SEED];
  const systemId = sendModal.data[SEND_MODAL_SYSTEM_ID];
  let networkName = systemId;

  try {
    networkName = CoinDirectory.findSystemCoinObj(systemId).display_name;
  } catch (_) {}

  const goBack = useCallback(() => {
    setSubmitError(null);
    setAcknowledged(false);
    props.navigation.navigate(SEND_MODAL_FORM_STEP_FORM);
  }, [props]);

  const getSpendingKey = useCallback(async () => {
    const seed = decryptkey(instanceKey, encryptedIdentitySeed);

    if (!seed) throw new Error('Unable to decrypt recovery secret');

    const system = CoinDirectory.findSystemCoinObj(systemId);
    const keyObj = await deriveKeyPair(seed, system, ELECTRUM);

    return keyObj.privKey;
  }, [encryptedIdentitySeed, instanceKey, systemId]);

  const submitData = useCallback(async () => {
    if (submitError || !acknowledged || props.loading || submitting.current || completed.current) return;
    submitting.current = true;

    setSubmitError(null);
    await props.setLoading(true);
    await props.setPreventExit(true);

    try {
      const result = await submitReviewedIdentityUpdate({
        built: revocationResult,
        context: updateContext,
        getKeys: async () => {
          const spendingKey = await getSpendingKey();
          return revocationResult.utxos.map(() => [spendingKey]);
        },
      });
      assertIdentityUpdateContext(updateContext);
      completed.current = true;

      props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
        targetId,
        revocationId,
        txid: result.txid,
      });
    } catch (e) {
      if (e.code === 'SESSION_CHANGED') return;
      try { assertIdentityUpdateContext(updateContext); } catch (_) { return; }
      if (e.code === 'BROADCAST_UNKNOWN') {
        completed.current = true;
        props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
          targetId, txid: e.txid, deliveryUnknown: true,
        });
        return;
      }
      setAcknowledged(false);
      setSubmitError(revokeRecoverSubmissionError(e, 'revocation'));
    }
    finally {
      submitting.current = false;
      if (store.getState().sendModal.requestId === updateContext.modalRequestId) {
        props.setPreventExit(false);
        props.setLoading(false);
      }
    }
  }, [targetId, sendModal, acknowledged, submitError, props, updateContext, getSpendingKey, revocationResult]);

  return RevokeIdentityConfirmRender({
    fee: props.route.params.fee,
    feeCurrency: props.route.params.feeCurrency,
    acknowledged,
    loading: props.loading,
    networkName,
    onAcknowledgedChange: setAcknowledged,
    targetId,
    revocationId,
    friendlyNames,
    goBack,
    submitData,
    revocableByUser: !!props.route.params.revocableByUser,
    ownedAddress: props.route.params.ownedAddress || '',
    submitError,
  });
};

export default RevokeIdentityConfirm;

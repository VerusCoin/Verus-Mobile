import React, {useCallback, useRef} from 'react';
import {useSelector} from 'react-redux';
import {Alert} from 'react-native';
import {
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
} from '../../../../utils/constants/sendModal';
import {RecoverIdentityConfirmRender} from './RecoverIdentityConfirm.render';
import {assertIdentityUpdateContext, submitReviewedIdentityUpdate} from '../../../../utils/identityUpdate/verifiedSubmission';
import {decryptkey} from '../../../../utils/seedCrypt';
import {deriveKeyPair} from '../../../../utils/keys';
import {ELECTRUM} from '../../../../utils/constants/intervalConstants';
import {coinsList} from '../../../../utils/CoinData/CoinsList';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import store from '../../../../store';

const RecoverIdentityConfirm = props => {
  const {
    targetId, recoveryId, recoveryResult, friendlyNames, updateContext, revocationAddr, recoveryAddr, primaryAddr, privateAddr,
  } = props.route.params;
  const instanceKey = useSelector(state => state.authentication.instanceKey);
  const sendModal = useObjectSelector(state => state.sendModal);

  const goBack = useCallback(() => {
    props.setModalHeight();
    props.navigation.navigate(SEND_MODAL_FORM_STEP_FORM);
  }, [props]);

  const getSpendingKey = useCallback(async () => {
    const encryptedSeed = sendModal.data[SEND_MODAL_ENCRYPTED_IDENTITY_SEED];
    const seed = decryptkey(instanceKey, encryptedSeed);

    if (!seed) throw new Error("Unable to decrypt seed");

    const keyObj = await deriveKeyPair(seed, coinsList.VRSC, ELECTRUM);

    return keyObj.privKey;
  }, [instanceKey, sendModal.data[SEND_MODAL_ENCRYPTED_IDENTITY_SEED]]);

  const submitting = useRef(false);
  const completed = useRef(false);

  const submitData = useCallback(async () => {
    if (submitting.current || completed.current) return;
    submitting.current = true;
    await props.setLoading(true);
    await props.setPreventExit(true);

    try {
      const result = await submitReviewedIdentityUpdate({
        built: recoveryResult,
        context: updateContext,
        getKeys: async () => {
          const spendingKey = await getSpendingKey();
          return recoveryResult.utxos.map(() => [spendingKey]);
        },
      });

      assertIdentityUpdateContext(updateContext);
      completed.current = true;
      props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
        targetId,
        recoveryId,
        txid: result.txid,
      });
    } catch (e) {
      if (e.code === 'SESSION_CHANGED') return;
      try {
        assertIdentityUpdateContext(updateContext);
      } catch (_) {
        return;
      }
      if (e.code === 'BROADCAST_UNKNOWN') {
        completed.current = true;
        props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
          targetId,
          recoveryId,
          txid: e.txid,
          deliveryUnknown: true,
        });
      } else {
        Alert.alert('Error', e.message);
      }
    } finally {
      submitting.current = false;

      if (store.getState().sendModal.requestId === updateContext.modalRequestId) {
        props.setPreventExit(false);
        props.setLoading(false);
      }
    }
  }, [targetId, recoveryId, recoveryResult, updateContext, getSpendingKey, props]);

  return RecoverIdentityConfirmRender({
    fee: props.route.params.fee,
    feeCurrency: props.route.params.feeCurrency,
    targetId,
    getSpendingKey,
    friendlyNames,
    goBack,
    submitData,
    recoverableByUser: !!props.route.params.recoverableByUser,
    ownedAddress: props.route.params.ownedAddress || '',
    sendModal,
    revocationAddr,
    recoveryAddr,
    primaryAddr,
    privateAddr,
  });
};

export default RecoverIdentityConfirm;

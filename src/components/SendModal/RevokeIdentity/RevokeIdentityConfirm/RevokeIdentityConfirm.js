import React, {useCallback, useRef} from 'react';
import {useSelector} from 'react-redux';
import {Alert} from 'react-native';
import {
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
} from '../../../../utils/constants/sendModal';
import {RevokeIdentityConfirmRender} from './RevokeIdentityConfirm.render';
import {assertIdentityUpdateContext, submitReviewedIdentityUpdate} from '../../../../utils/identityUpdate/verifiedSubmission';
import {decryptkey} from '../../../../utils/seedCrypt';
import {deriveKeyPair} from '../../../../utils/keys';
import {ELECTRUM} from '../../../../utils/constants/intervalConstants';
import {coinsList} from '../../../../utils/CoinData/CoinsList';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import store from '../../../../store';

const RevokeIdentityConfirm = props => {
  const {
    targetId, revocationId, revocationResult, friendlyNames, updateContext,
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
      try {
        assertIdentityUpdateContext(updateContext);
      } catch (_) {
        return;
      }
      if (e.code === 'BROADCAST_UNKNOWN') {
        completed.current = true;
        props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
          targetId,
          revocationId,
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
  }, [targetId, revocationId, revocationResult, updateContext, getSpendingKey, props]);

  return RevokeIdentityConfirmRender({
    fee: props.route.params.fee,
    feeCurrency: props.route.params.feeCurrency,
    targetId,
    getSpendingKey,
    friendlyNames,
    goBack,
    submitData,
    revocableByUser: !!props.route.params.revocableByUser,
    ownedAddress: props.route.params.ownedAddress || '',
  });
};

export default RevokeIdentityConfirm;

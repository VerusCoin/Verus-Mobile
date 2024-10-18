import React, {useState, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Alert} from 'react-native';
import {
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
  SEND_MODAL_SYSTEM_ID,
} from '../../../../utils/constants/sendModal';
import {RecoverIdentityConfirmRender} from './RecoverIdentityConfirm.render';
import { pushUpdateIdentityTx } from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import { decryptkey } from '../../../../utils/seedCrypt';
import { deriveKeyPair } from '../../../../utils/keys';
import { ELECTRUM } from '../../../../utils/constants/intervalConstants';
import { coinsList } from '../../../../utils/CoinData/CoinsList';

const RecoverIdentityConfirm = props => {
  const [targetId, setTargetId] = useState(props.route.params.targetId);
  const [recoveryId, setRecoveryId] = useState(props.route.params.recoveryId);
  const [ownedAddress, setOwnedAddress] = useState(props.route.params.ownedAddress);
  const [recoverableByUser, setRecoverableByUser] = useState(props.route.params.recoverableByUser);
  const [recoveryResult, setRecoveryResult] = useState(props.route.params.recoveryResult);
  const [revocationAddr, setRevocationAddr] = useState(props.route.params.revocationAddr);
  const [recoveryAddr, setRecoveryAddr] = useState(props.route.params.recoveryAddr);
  const [primaryAddr, setPrimaryAddr] = useState(props.route.params.primaryAddr);
  const [privateAddr, setPrivateAddr] = useState(props.route.params.privateAddr);

  const [friendlyNames, setFriendlyNames] = useState(
    props.route.params.friendlyNames,
  );
  const instanceKey = useSelector(state => state.authentication.instanceKey);

  const dispatch = useDispatch();
  const sendModal = useSelector(state => state.sendModal);
  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const activeCoinList = useSelector(state => state.coins.activeCoinList);

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
  }, []);

  const submitData = useCallback(async () => {
    await props.setLoading(true);
    await props.setPreventExit(true);
    const { data } = sendModal;

    try {
      const spendingKey = await getSpendingKey();

      const keys = [];
      for (let i = 0; i < recoveryResult.utxos.length; i++) {
        keys.push([spendingKey])
      }

      const result = await pushUpdateIdentityTx(data[SEND_MODAL_SYSTEM_ID], recoveryResult.hex, recoveryResult.utxos, keys);
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
        targetId,
        recoveryId,
        txid: result.result
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    props.setPreventExit(false);
    props.setLoading(false);
  }, [
    targetId,
    friendlyNames,
    sendModal,
    activeAccount,
    activeCoinList,
    dispatch,
    props,
  ]);

  return RecoverIdentityConfirmRender({
    targetId,
    friendlyNames,
    goBack,
    submitData,
    recoverableByUser: !!props.route.params.recoverableByUser,
    ownedAddress: props.route.params.ownedAddress || '',
    sendModal,
    revocationAddr,
    recoveryAddr,
    primaryAddr,
    privateAddr
  });
};

export default RecoverIdentityConfirm;

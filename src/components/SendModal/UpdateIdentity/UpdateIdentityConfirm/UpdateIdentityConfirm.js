import React, {useState, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Alert} from 'react-native';
import {
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
  SEND_MODAL_IDENTITY_UPDATE_FRIENDLY_NAMES,
  SEND_MODAL_IDENTITY_UPDATE_UPDATES,
  SEND_MODAL_SYSTEM_ID,
} from '../../../../utils/constants/sendModal';
import {UpdateIdentityConfirmRender} from './UpdateIdentityConfirm.render';
import { pushUpdateIdentityTx } from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import { decryptkey } from '../../../../utils/seedCrypt';
import { deriveKeyPair } from '../../../../utils/keys';
import { ELECTRUM } from '../../../../utils/constants/intervalConstants';
import { coinsList } from '../../../../utils/CoinData/CoinsList';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import { closeSendModal } from '../../../../actions/actions/sendModal/dispatchers/sendModal';

const UpdateIdentityConfirm = props => {
  const sendModal = useObjectSelector(state => state.sendModal);
  const { data, coinObj, subWallet } = sendModal;

  const [fee, setFee] = useState(props.route.params.fee);
  const [feeCurrency, setFeeCurrency] = useState(props.route.params.feeCurrency);
  const [txHex, setTxHex] = useState(props.route.params.txHex);
  const [utxos, setUtxos] = useState(props.route.params.utxos);

  const [friendlyNames, setFriendlyNames] = useState(
    data[SEND_MODAL_IDENTITY_UPDATE_FRIENDLY_NAMES]
  );

  const instanceKey = useSelector(state => state.authentication.instanceKey);

  const dispatch = useDispatch();
  
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);

  const goBack = useCallback(() => {
    closeSendModal()
  }, []);

  const getSpendingKey = useCallback(async () => {
    const encryptedSeed = sendModal.data[SEND_MODAL_ENCRYPTED_IDENTITY_SEED];
    const seed = decryptkey(instanceKey, encryptedSeed);

    if (!seed) throw new Error("Unable to decrypt seed");

    const keyObj = await deriveKeyPair(seed, coinsList.VRSC, ELECTRUM);

    return keyObj.privKey;
  }, []);

  const submitData = useCallback(async () => {
    // await props.setLoading(true);
    // await props.setPreventExit(true);
    // const { data } = sendModal;

    // try {
    //   const spendingKey = await getSpendingKey();

    //   const keys = [];
    //   for (let i = 0; i < recoveryResult.utxos.length; i++) {
    //     keys.push([spendingKey])
    //   }

    //   const result = await pushUpdateIdentityTx(data[SEND_MODAL_SYSTEM_ID], recoveryResult.hex, recoveryResult.utxos, keys);
      
    //   if (result.error) {
    //     throw new Error(result.error.message);
    //   }

    //   props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
    //     recoveryId,
    //     txid: result.result
    //   });
    // } catch (e) {
    //   Alert.alert('Error', e.message);
    // }

    // props.setPreventExit(false);
    // props.setLoading(false);
  }, [
    friendlyNames,
    sendModal,
    activeAccount,
    activeCoinList,
    dispatch,
    props,
  ]);

  return UpdateIdentityConfirmRender({
    goBack,
    submitData,
    ownedAddress: props.route.params.ownedAddress || '',
    sendModal,
    fee,
    feeCurrency,
    friendlyNames
  });
};

export default UpdateIdentityConfirm;

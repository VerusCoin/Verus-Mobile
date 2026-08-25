import React, {useState, useCallback} from 'react';
import {Alert} from 'react-native';
import {
  SEND_MODAL_FORM_STEP_RESULT,
  SEND_MODAL_IDENTITY_UPDATE_FRIENDLY_NAMES
} from '../../../../utils/constants/sendModal';
import {UpdateIdentityConfirmRender} from './UpdateIdentityConfirm.render';
import { pushUpdateIdentityTx } from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import { API_SEND } from '../../../../utils/constants/intervalConstants';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import { closeSendModal } from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import { requestPrivKey } from '../../../../utils/auth/authBox';

const UpdateIdentityConfirm = props => {
  const sendModal = useObjectSelector(state => state.sendModal);
  const { data, coinObj, subWallet } = sendModal;

  const [fee, setFee] = useState(props.route.params.fee);
  const [feeCurrency, setFeeCurrency] = useState(props.route.params.feeCurrency);
  const [txHex, setTxHex] = useState(props.route.params.txHex);
  const [utxos, setUtxos] = useState(props.route.params.utxos);
  const [identity, setIdentity] = useState(props.route.params.identity);
  const [loading, setLoading] = useState(false);

  const [friendlyNames, setFriendlyNames] = useState(
    data[SEND_MODAL_IDENTITY_UPDATE_FRIENDLY_NAMES]
  );

  const goBack = useCallback(() => {
    closeSendModal()
  }, []);

  const submitData = useCallback(async () => {
    setLoading(true);
    await props.setPreventExit(true);

    try {
      const [channelName, channelAddress, systemId] = subWallet.api_channels[API_SEND].split('.');

      const spendingKey = await requestPrivKey(coinObj.id, channelName);

      const keys = [];
      for (let i = 0; i < utxos.length; i++) {
        keys.push([spendingKey])
      }

      const result = await pushUpdateIdentityTx(systemId, txHex, utxos, keys);
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      const txid = result.result;

      props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
        identity,
        txid
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    props.setPreventExit(false);
    setLoading(false);
  }, [
    subWallet,
    props,
  ]);

  return UpdateIdentityConfirmRender({
    goBack,
    loading,
    submitData,
    ownedAddress: props.route.params.ownedAddress || '',
    sendModal,
    fee,
    feeCurrency,
    friendlyNames
  });
};

export default UpdateIdentityConfirm;

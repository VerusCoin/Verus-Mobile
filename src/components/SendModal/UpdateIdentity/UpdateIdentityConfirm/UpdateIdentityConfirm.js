import React, {useState, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Alert} from 'react-native';
import {
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
  SEND_MODAL_IDENTITY_UPDATE_FRIENDLY_NAMES,
  SEND_MODAL_IDENTITY_UPDATE_REQUEST_HEX,
  SEND_MODAL_IDENTITY_UPDATE_UPDATES,
  SEND_MODAL_SYSTEM_ID,
} from '../../../../utils/constants/sendModal';
import {UpdateIdentityConfirmRender} from './UpdateIdentityConfirm.render';
import { createUpdateIdentityResponse, pushUpdateIdentityTx } from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import { decryptkey } from '../../../../utils/seedCrypt';
import { deriveKeyPair } from '../../../../utils/keys';
import { API_SEND, ELECTRUM, VRPC } from '../../../../utils/constants/intervalConstants';
import { coinsList } from '../../../../utils/CoinData/CoinsList';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import { closeSendModal } from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import { requestPrivKey } from '../../../../utils/auth/authBox';
import { IdentityUpdateRequest, IdentityUpdateResponse } from 'verus-typescript-primitives';
import axios from 'axios';
import { ResponseUri } from 'verus-typescript-primitives/dist/vdxf/classes/ResponseUri';
import base64url from 'base64url';
import { primitives } from 'verusid-ts-client';
import AlertAsync from 'react-native-alert-async';
import { openUrl } from '../../../../utils/linking';
import { URL } from 'react-native-url-polyfill';

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

  const canRedirect = (uri) => {
    return AlertAsync(
      'Redirect',
      `To complete this request you need to redirect to ${uri}, would you like to redirect?`,
      [
        {
          text: 'No',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        {text: 'Continue', onPress: () => Promise.resolve(true)},
      ],
      {
        cancelable: false,
      },
    )
  }

  const canRetry = (uri) => {
    return AlertAsync(
      "Error when crafting response",
      "Identity was updated but an error ocurred when crafting the response to send back to the requestor.",
      [
        {
          text: 'Retry',
          onPress: () => Promise.resolve(true),
          style: 'cancel',
        },
        {text: 'Continue', onPress: () => Promise.resolve(false)},
      ],
      {
        cancelable: false,
      },
    )
  }

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

      const reqHex = data[SEND_MODAL_IDENTITY_UPDATE_REQUEST_HEX];

      const req = new IdentityUpdateRequest();
      req.fromBuffer(Buffer.from(reqHex, 'hex'));

      const sendResponse = async () => {
        const res = await createUpdateIdentityResponse(
          systemId,
          req.details.getIdentityAddress(),
          req.details.requestid.toString(),
          txid,
          spendingKey
        );

        const primaryResponseUri = req.details.responseuris[0];
        const uriString = primaryResponseUri.getUriString();

        if (primaryResponseUri.type.eq(ResponseUri.TYPE_POST)) {
          await axios.post(
            uriString,
            res.toJson()
          );
        } else if (primaryResponseUri.type.eq(ResponseUri.TYPE_REDIRECT)) {
          const url = new URL(uriString);

          url.searchParams.set(
            primitives.IDENTITY_UPDATE_RESPONSE_VDXF_KEY.vdxfid,
            base64url(res.toBuffer())
          );

          if (await canRedirect(uriString)) {
            openUrl(url.toString());
          }
        } else Alert.alert("Unknown response URI type");
      }

      const sendResponseRec = async () => {
        try {
          await sendResponse();
        } catch(e) {
          console.warn(e);
  
          if (await canRetry()) {
            await sendResponseRec();
          }
        }
      }

      if (req.details.containsResponseUris()) {
        await sendResponseRec();
      }

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

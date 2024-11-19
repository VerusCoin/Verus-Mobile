import {useCallback, useEffect, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {fromBase58Check} from '@bitgo/utxo-lib/dist/src/address';
import {Alert, Dimensions} from 'react-native';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';
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
import { createRevokeIdentityTx } from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import { coinsList } from '../../../../utils/CoinData/CoinsList';
import { decryptkey } from '../../../../utils/seedCrypt';
import { CoinDirectory } from '../../../../utils/CoinData/CoinDirectory';

const RevokeIdentityForm = (props) => {
  const { height } = Dimensions.get("window");
  const dispatch = useDispatch();
  const sendModal = useSelector(state => state.sendModal);
  const instanceKey = useSelector(state => state.authentication.instanceKey);
  const [networkName, setNetworkName] = useState(sendModal.data[SEND_MODAL_SYSTEM_ID]);

  useEffect(() => {
    try {
      const systemObj = CoinDirectory.findSystemCoinObj(sendModal.data[SEND_MODAL_SYSTEM_ID]);
      setNetworkName(systemObj.display_name);
    } catch(e) {}
  }, [])

  const formHasError = useCallback(() => {
    const {data} = sendModal;

    const identity =
      data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD] != null
        ? data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD].trim()
        : '';

    if (!identity || identity.length < 1) {
      createAlert('Required Field', 'Identity is a required field.');
      return true;
    }

    try {
      fromBase58Check(identity);
    } catch (e) {
      if (!identity.endsWith('@')) {
        createAlert(
          'Invalid Identity',
          'Identity not a valid identity handle or iAddress.',
        )

        return true;
      }
    }

    return false;
  }, [sendModal, dispatch]);

  const getPotentialPrimaryAddresses = useCallback(async (coinObj) => {
    const encryptedSeed = sendModal.data[SEND_MODAL_ENCRYPTED_IDENTITY_SEED];
    const seed = decryptkey(instanceKey, encryptedSeed);

    if (!seed) throw new Error("Unable to decrypt seed");

    const keyObj = await deriveKeyPair(seed, coinObj, ELECTRUM);
    const {addresses} = keyObj;

    return addresses;
  }, []);

  const submitData = useCallback(async () => {
    if (formHasError()) {
      return;
    }

    props.setLoading(true)

    const {data} = sendModal;

    const identity = data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD];

    let ownedAddress = '';
    let revocableByUser = false;

    try {
      const tarRes = await getIdentity(data[SEND_MODAL_SYSTEM_ID], identity);
      if (tarRes.error) {
        throw new Error(tarRes.error.message);
      }

      if (tarRes.result.status === "revoked") {
        throw new Error(
          'Cannot revoke VerusID that is already revoked.',
        );
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
      if (revRes.error) {
        throw new Error(revRes.error.message);
      }

      if (revRes.result.status !== "active") {
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
      const addrs = await getPotentialPrimaryAddresses(coinsList.VRSC);

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
          'Ensure that your imported seed/key corresponds to the primary address of the VerusID set as your revocation authority.',
        );
      }

      const friendlyNames = await getFriendlyNameMap(data[SEND_MODAL_SYSTEM_ID], tarRes.result);

      const targetIdAddr = tarRes.result.identity.identityaddress;
      const revocationResult = await createRevokeIdentityTx(data[SEND_MODAL_SYSTEM_ID], targetIdAddr, revRes.result.identity.identityaddress)

      props.setModalHeight(height >= 720 ? 696 : height - 24);
      props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        targetId: tarRes.result,
        revocationId: revRes.result,
        friendlyNames,
        ownedAddress,
        revocableByUser,
        revocationResult
      })
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    props.setLoading(false)
  }, [formHasError, getPotentialPrimaryAddresses, sendModal, dispatch, props]);

  return RevokeIdentityFormRender({
    submitData,
    updateSendFormData: props.updateSendFormData,
    formDataValue: sendModal.data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD],
    networkName
  });
};

export default RevokeIdentityForm;

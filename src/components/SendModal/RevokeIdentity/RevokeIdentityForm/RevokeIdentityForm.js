import {useCallback} from 'react';
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
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_IDENTITY_TO_REVOKE_FIELD,
  SEND_MODAL_SYSTEM_ID,
} from '../../../../utils/constants/sendModal';
import {deriveKeyPair} from '../../../../utils/keys';
import {RevokeIdentityFormRender} from './RevokeIdentityForm.render';
import { createRevokeIdentityTx } from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import { coinsList } from '../../../../utils/CoinData/CoinsList';

const RevokeIdentityForm = (props) => {
  const { height } = Dimensions.get("window");
  const dispatch = useDispatch();
  const sendModal = useSelector(state => state.sendModal);

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

  const getPotentialPrimaryAddresses = useCallback(async (coinObj, channel) => {
    const seeds = await props.requestSeeds();

    const seed = seeds[channel];

    if (!seed) throw new Error("No seed found");

    const keyObj = await deriveKeyPair(seed, coinObj, channel);
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

      const revocation = tarRes.result.identity.revocationauthority;

      const revRes = await getIdentity(data[SEND_MODAL_SYSTEM_ID], revocation);
      if (revRes.error) {
        throw new Error(revRes.error.message);
      }

      let isInWallet = false;
      const addrs = await getPotentialPrimaryAddresses(coinsList.VRSC, ELECTRUM);

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

      const friendlyNames = await getFriendlyNameMap(data[SEND_MODAL_SYSTEM_ID], targetId.result);
      props.setModalHeight(height >= 720 ? 696 : height - 24);

      const targetIdAddr = tarRes.result.identity.identityaddress;
      const revocationResult = await createRevokeIdentityTx(data[SEND_MODAL_SYSTEM_ID], targetIdAddr, addrs[0])

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
    formDataValue: sendModal.data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD]
  });
};

export default RevokeIdentityForm;

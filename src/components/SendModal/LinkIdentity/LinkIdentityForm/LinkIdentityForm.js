import {useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {fromBase58Check} from '@bitgo/utxo-lib/dist/src/address';
import {Alert, Dimensions} from 'react-native';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../../utils/api/channels/verusid/callCreators';
import {requestSeeds} from '../../../../utils/auth/authBox';
import {ELECTRUM} from '../../../../utils/constants/intervalConstants';
import {
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_IDENTITY_TO_LINK_FIELD,
} from '../../../../utils/constants/sendModal';
import {deriveKeyPair} from '../../../../utils/keys';
import {LinkIdentityFormRender} from './LinkIdentityForm.render';

const LinkIdentityForm = (props) => {
  const { height } = Dimensions.get("window");
  const dispatch = useDispatch();
  const sendModal = useSelector(state => state.sendModal);

  const formHasError = useCallback(() => {
    const {data} = sendModal;

    const identity =
      data[SEND_MODAL_IDENTITY_TO_LINK_FIELD] != null
        ? data[SEND_MODAL_IDENTITY_TO_LINK_FIELD].trim()
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
    const seeds = await requestSeeds();

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

    const {coinObj, data} = sendModal;

    const identity = data[SEND_MODAL_IDENTITY_TO_LINK_FIELD];

    let ownedAddress = '';
    let ownedByUser = false;

    try {
      const res = await getIdentity(coinObj.system_id, identity);

      if (res.error) {
        throw new Error(res.error.message);
      }

      const addrs = await getPotentialPrimaryAddresses(coinObj, ELECTRUM);

      let isInWallet = false;

      for (const address of res.result.identity.primaryaddresses) {
        if (addrs.includes(address)) {
          isInWallet = true;
          ownedAddress = address;
          ownedByUser = true;
          break;
        }
      }

      if (!isInWallet) {
        throw new Error(
          'Ensure that your wallet address for this account matches a primary address of the VerusID you are trying to add.',
        );
      }

      const friendlyNames = await getFriendlyNameMap(coinObj.system_id, res.result);
      props.setModalHeight(height >= 720 ? 696 : height - 24);

      props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        verusId: res.result,
        friendlyNames,
        ownedAddress,
        ownedByUser
      })
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    props.setLoading(false)
  }, [formHasError, getPotentialPrimaryAddresses, sendModal, dispatch, props]);

  return LinkIdentityFormRender({
    submitData,
    updateSendFormData: props.updateSendFormData,
    formDataValue: sendModal.data[SEND_MODAL_IDENTITY_TO_LINK_FIELD]
  });
};

export default LinkIdentityForm;

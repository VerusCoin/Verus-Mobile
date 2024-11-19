import {useCallback, useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {fromBase58Check} from '@bitgo/utxo-lib/dist/src/address';
import {Alert, Dimensions} from 'react-native';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';
import {
  getCurrency,
  getCurrencyNameMap
} from '../../../../utils/api/channels/verusid/callCreators';
import {requestSeeds} from '../../../../utils/auth/authBox';
import {
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_PBAAS_CURRENCY_PASSTHROUGH,
  SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD,
} from '../../../../utils/constants/sendModal';
import {deriveKeyPair} from '../../../../utils/keys';
import {AddPbaasCurrencyFormRender} from './AddPbaasCurrencyForm.render';

const AddPbaasCurrencyForm = (props) => {
  const { height } = Dimensions.get("window");
  const dispatch = useDispatch();
  const sendModal = useSelector(state => state.sendModal);
  const activeCoinsForUser = useSelector(state => state.coins.activeCoinsForUser);

  const formHasError = useCallback(() => {
    const {data} = sendModal;

    const currency =
      data[SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD] != null
        ? data[SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD].trim()
        : '';

    if (!currency || currency.length < 1) {
      createAlert('Required Field', 'Currency is a required field.');
      return true;
    }

    return false;
  }, [sendModal, dispatch]);

  const submitData = useCallback(async () => {
    if (formHasError()) {
      return;
    }

    props.setLoading(true)

    const {coinObj, data} = sendModal;

    const currency = data[SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD];

    try {
      const res = await getCurrency(coinObj.system_id, currency);

      if (res.error) {
        throw new Error(res.error.message);
      }

      if (activeCoinsForUser.some(x => x.id === res.result.currencyid)) {
        throw new Error(`${res.result.fullyqualifiedname} has already been added to your wallet.`)
      }

      const launchRes = await getCurrency(
        coinObj.system_id,
        res.result.launchsystemid ? res.result.launchsystemid : res.result.systemid,
      );

      if (launchRes.error) {
        throw new Error(launchRes.error.message);
      }

      const friendlyNames = await getCurrencyNameMap(coinObj, res.result);
      props.setModalHeight(height >= 720 ? 696 : height - 24);

      props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        currency: res.result,
        launchSystem: launchRes.result,
        friendlyNames,
      })
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    props.setLoading(false)
  }, [formHasError, sendModal, dispatch, props]);

  useEffect(() => {
    if (sendModal.data[SEND_MODAL_PBAAS_CURRENCY_PASSTHROUGH]) {
      props.updateSendFormData(SEND_MODAL_PBAAS_CURRENCY_PASSTHROUGH, false)
      submitData()
    }
  }, [])

  return AddPbaasCurrencyFormRender({
    submitData,
    updateSendFormData: props.updateSendFormData,
    formDataValue: sendModal.data[SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD]
  });
};

export default AddPbaasCurrencyForm;

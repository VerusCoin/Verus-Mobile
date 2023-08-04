import {useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {Alert} from 'react-native';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';
import {
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_CONTRACT_ADDRESS_FIELD,
} from '../../../../utils/constants/sendModal';
import {getWeb3ProviderForNetwork} from '../../../../utils/web3/provider';
import {AddErc20TokenFormRender} from './AddErc20TokenForm.render';

const AddErc20TokenForm = props => {
  const dispatch = useDispatch();
  const sendModal = useSelector(state => state.sendModal);

  const formHasError = useCallback(() => {
    const {data} = sendModal;

    const tokenAddr =
      data[SEND_MODAL_CONTRACT_ADDRESS_FIELD] != null
        ? data[SEND_MODAL_CONTRACT_ADDRESS_FIELD].trim()
        : '';

    if (!tokenAddr || tokenAddr.length < 1) {
      createAlert('Required Field', 'Address is a required field.');
      return true;
    }

    return false;
  }, [sendModal, dispatch]);

  const submitData = useCallback(async () => {
    if (formHasError()) {
      return;
    }

    props.setLoading(true);

    const {coinObj, data} = sendModal;

    const contractAddress = data[SEND_MODAL_CONTRACT_ADDRESS_FIELD];

    try {
      const contract = getWeb3ProviderForNetwork(
        coinObj.network,
      ).getUnitializedContractInstance(contractAddress);

      const name = await contract.name();
      const symbol = await contract.symbol();
      const decimals = await contract.decimals();

      Alert.alert(
        'Warning',
        'Data about this ERC20 token was retrieved from the token contract itself. Verify that the contract address you entered is correct before trusting the displayed symbol, name, and decimals.',
      );

      props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        contract: {
          address: contractAddress,
          symbol,
          decimals,
          name,
        },
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    props.setLoading(false);
  }, [formHasError, sendModal, dispatch, props]);

  return AddErc20TokenFormRender({
    submitData,
    updateSendFormData: props.updateSendFormData,
    formDataValue: sendModal.data[SEND_MODAL_CONTRACT_ADDRESS_FIELD],
  });
};

export default AddErc20TokenForm;

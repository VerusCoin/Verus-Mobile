import {useCallback, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {Alert} from 'react-native';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';
import {
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_CONTRACT_ADDRESS_FIELD,
} from '../../../../utils/constants/sendModal';
import {getWeb3ProviderForNetwork} from '../../../../utils/web3/provider';
import {AddErc20TokenFormRender} from './AddErc20TokenForm.render';
import { getCurrency } from '../../../../utils/api/channels/verusid/callCreators';
import { getCurrenciesMappedToEth } from '../../../../utils/api/channels/vrpc/requests/getCurrenciesMappedToEth';

const AddErc20TokenForm = props => {
  const dispatch = useDispatch();
  const sendModal = useSelector(state => state.sendModal);
  const darkMode = useSelector(state=> state.settings.darkModeState)

  const [useMappedCurrency, setUseMappedCurrency] = useState(false);

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

    const contractAddressField = data[SEND_MODAL_CONTRACT_ADDRESS_FIELD];

    try {
      const provider = getWeb3ProviderForNetwork(
        coinObj.network,
      )

      let contractAddress;

      if (useMappedCurrency) {
        const getCurrencyRes = await getCurrency(provider.getVrscSystem(), contractAddressField);

        if (getCurrencyRes.error) {
          throw new Error(getCurrencyRes.error.message);
        }

        const currencyDef = getCurrencyRes.result;

        const mappedCurrenciesRes = await getCurrenciesMappedToEth(provider.getVrscSystem(), provider.network);
        
        if (mappedCurrenciesRes.error) {
          throw new Error(mappedCurrenciesRes.error.message);
        }

        const mappedCurrenciesResult = mappedCurrenciesRes.result;

        const isMapped = mappedCurrenciesResult.currencyIdToContractAddressMap.has(currencyDef.currencyid);

        if (!isMapped) {
          throw new Error("Cannot get ERC20 contract from non-mapped PBaaS currency.")
        }

        contractAddress = mappedCurrenciesResult.currencyIdToContractAddressMap
          .get(currencyDef.currencyid)
          .values()
          .next().value;

      } else {
        contractAddress = contractAddressField;
      }

      const { name, symbol, decimals } = await provider.getContractInfo(contractAddress);

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
  }, [formHasError, sendModal, dispatch, props, useMappedCurrency]);

  return AddErc20TokenFormRender({
    submitData,
    updateSendFormData: props.updateSendFormData,
    formDataValue: sendModal.data[SEND_MODAL_CONTRACT_ADDRESS_FIELD],
    useMappedCurrency,
    setUseMappedCurrency,
    darkMode
  });
};

export default AddErc20TokenForm;

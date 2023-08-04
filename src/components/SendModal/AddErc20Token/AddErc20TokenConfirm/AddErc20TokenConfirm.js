import React, {useState, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Alert} from 'react-native';
import {addCoin, addKeypairs, setUserCoins} from '../../../../actions/actionCreators';
import {
  refreshActiveChainLifecycles
} from '../../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
} from '../../../../utils/constants/sendModal';
import {AddErc20TokenConfirmRender} from './AddErc20TokenConfirm.render';
import { CoinDirectory } from '../../../../utils/CoinData/CoinDirectory';
import { coinsList } from '../../../../utils/CoinData/CoinsList';

const AddErc20TokenConfirm = props => {
  const [contract, setCurrency] = useState(props.route.params.contract);

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

  const submitData = useCallback(async () => {
    await props.setLoading(true);
    await props.setPreventExit(true);

    try {
      const {coinObj} = sendModal;

      await CoinDirectory.addErc20Token(contract, coinObj.network);
      const fullCoinData = CoinDirectory.findCoinObj(contract.address)
  
      dispatch(
        await addKeypairs(
          fullCoinData,
          activeAccount.keys,
          activeAccount.keyDerivationVersion == null
            ? 0
            : activeAccount.keyDerivationVersion,
        ),
      );
  
      const addCoinAction = await addCoin(
        fullCoinData,
        activeCoinList,
        activeAccount.id,
        fullCoinData.compatible_channels,
      );
  
      if (addCoinAction) {
        dispatch(addCoinAction);
  
        const setUserCoinsAction = setUserCoins(
          activeCoinList,
          activeAccount.id,
        );
        dispatch(setUserCoinsAction);
  
        refreshActiveChainLifecycles(setUserCoinsAction.payload.activeCoinsForUser);
      } else {
        throw new Error('Error adding coin');
      }

      props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
        contract
      });
    } catch (e) {
      Alert.alert('Could not add currency', e.message);
    }

    props.setPreventExit(false);
    props.setLoading(false);
  }, [
    contract,
    sendModal,
    activeAccount,
    activeCoinList,
    dispatch,
    props,
  ]);

  return AddErc20TokenConfirmRender({
    contract,
    goBack,
    submitData
  });
};

export default AddErc20TokenConfirm;

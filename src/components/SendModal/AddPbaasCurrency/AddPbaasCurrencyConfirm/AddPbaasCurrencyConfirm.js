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
import {AddPbaasCurrencyConfirmRender} from './AddPbaasCurrencyConfirm.render';
import { CoinDirectory } from '../../../../utils/CoinData/CoinDirectory';

const AddPbaasCurrencyConfirm = props => {
  const [currency, setCurrency] = useState(props.route.params.currency);
  const [friendlyNames, setFriendlyNames] = useState(
    props.route.params.friendlyNames,
  );
  const [launchSystem, setLaunchSystem] = useState(
    props.route.params.launchSystem
  );

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
      await CoinDirectory.addPbaasCurrency(currency, Object.keys(activeAccount.testnetOverrides).length > 0, true)
      const fullCoinData = CoinDirectory.findCoinObj(currency.currencyid)
  
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
        currency,
        friendlyNames,
      });
    } catch (e) {
      Alert.alert('Could not add currency', e.message);
    }

    props.setPreventExit(false);
    props.setLoading(false);
  }, [
    currency,
    friendlyNames,
    sendModal,
    activeAccount,
    activeCoinList,
    dispatch,
    props,
  ]);

  return AddPbaasCurrencyConfirmRender({
    currency,
    friendlyNames,
    goBack,
    submitData,
    spotterSystem: sendModal.coinObj.system_id,
    longestChainOnLaunchSystem: launchSystem.bestheight
  });
};

export default AddPbaasCurrencyConfirm;

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
import { ERC20 } from '../../../../utils/constants/intervalConstants';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';

const AddErc20TokenConfirm = props => {
  const [contract, setCurrency] = useState(props.route.params.contract);

  const dispatch = useDispatch();
  const sendModal = useObjectSelector(state => state.sendModal);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);
  
  const testAccount = useSelector(state => (Object.keys(state.authentication.activeAccount.testnetOverrides).length > 0))

  const goBack = useCallback(() => {
    props.setModalHeight();
    props.navigation.navigate(SEND_MODAL_FORM_STEP_FORM);
  }, [props]);

  const submitData = useCallback(async () => {
    await props.setLoading(true);
    await props.setPreventExit(true);

    try {
      const {coinObj} = sendModal;
      let fullCoinData;

      for (const key in coinsList) {
        if (
          coinsList[key].proto === ERC20 &&
          ((coinsList[key].testnet && testAccount) ||
            (!coinsList[key].testnet && !testAccount)) &&
          coinsList[key].currency_id.toLowerCase() === contract.address.toLowerCase()
        ) {
          fullCoinData = CoinDirectory.findCoinObj(key);
        }
      }

      if (fullCoinData == null) {
        await CoinDirectory.addErc20Token(contract, coinObj.network);
        fullCoinData = CoinDirectory.findCoinObj(contract.address);
      }

      const activeCoinIndex = activeCoinsForUser.findIndex(coin => {
        return coin.id === fullCoinData.id
      });
      if (activeCoinIndex > -1) throw new Error(`${fullCoinData.display_ticker} already added.`)
  
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

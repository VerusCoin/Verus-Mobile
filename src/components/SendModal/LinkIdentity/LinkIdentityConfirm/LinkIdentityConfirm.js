import React, {useState, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Alert} from 'react-native';
import {setUserCoins} from '../../../../actions/actionCreators';
import {updateVerusIdWallet} from '../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  clearChainLifecycle,
  refreshActiveChainLifecycles,
} from '../../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {linkVerusId} from '../../../../actions/actions/services/dispatchers/verusid/verusid';
import {
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
} from '../../../../utils/constants/sendModal';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';
import {LinkIdentityConfirmRender} from './LinkIdentityConfirm.render';

const LinkIdentityConfirm = props => {
  const [verusId, setVerusId] = useState(props.route.params.verusId);
  const [friendlyNames, setFriendlyNames] = useState(
    props.route.params.friendlyNames,
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
      const {identityaddress} = verusId.identity;
      const {coinObj} = sendModal;

      await linkVerusId(
        identityaddress,
        convertFqnToDisplayFormat(verusId.fullyqualifiedname),
        coinObj.id,
      );

      await updateVerusIdWallet();
      clearChainLifecycle(coinObj.id);
      const setUserCoinsAction = setUserCoins(activeCoinList, activeAccount.id);
      dispatch(setUserCoinsAction);

      refreshActiveChainLifecycles(
        setUserCoinsAction.payload.activeCoinsForUser,
      );

      props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
        verusId,
        friendlyNames,
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    props.setPreventExit(false);
    props.setLoading(false);
  }, [
    verusId,
    friendlyNames,
    sendModal,
    activeAccount,
    activeCoinList,
    dispatch,
    props,
  ]);

  return LinkIdentityConfirmRender({
    verusId,
    friendlyNames,
    goBack,
    submitData,
  });
};

export default LinkIdentityConfirm;

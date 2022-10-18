import { CommonActions } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import AnimatedActivityIndicatorBox from '../../components/AnimatedActivityIndicatorBox';
import Styles from '../../styles/index';
import { primitives } from "verusid-ts-client"
import { verifyLoginConsentRequest } from '../../utils/api/channels/vrpc/requests/verifyLoginConsentRequest';
import { createAlert } from '../../actions/actions/alert/dispatchers/alert';
import VrpcProvider from '../../utils/vrpc/vrpcInterface';
import { findCoinObj } from '../../utils/CoinData/CoinData';
import { extractLoginConsentSig } from '../../utils/api/channels/vrpc/requests/extractLoginConsentSig';
import { getBlock } from '../../utils/api/channels/vrpc/callCreators';
import { LOGIN_CONSENT_INFO } from '../../utils/constants/deeplink';
import LoginRequestInfo from './LoginRequestInfo/LoginRequestInfo';

const DeepLink = (props) => {
  const deeplinkId = useSelector((state) => state.deeplink.id)
  const deeplinkData = useSelector((state) => state.deeplink.data)
  const signedIn = useSelector((state) => state.authentication.signedIn)
  const [displayKey, setDisplayKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [displayProps, setDisplayProps] = useState({})

  const cancel = () => {
    let resetAction

    if (signedIn) {
      resetAction = CommonActions.reset({
        index: 0,
        routes: [{name: 'SignedInStack'}],
      });
    } else {
      resetAction = CommonActions.reset({
        index: 0,
        routes: [{name: 'SignedOutStack'}],
      });
    }

    //dispatch(resetDeeplinkData())
    props.navigation.dispatch(resetAction);
  }

  const processDeeplink = async () => {
    try {
      switch (deeplinkId) {
        case primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid:
          const coinObj = findCoinObj(deeplinkData.system_id, null, true)
          VrpcProvider.initEndpoint(coinObj.id, coinObj.vrpc_endpoints[0])

          if (await verifyLoginConsentRequest(coinObj, deeplinkData)) {
            const sig = await extractLoginConsentSig(coinObj, deeplinkData)

            //TODO HARDENING: Verify height against time of signature

            const sigblock = await getBlock(coinObj, sig.height)
           
            if (sigblock.error) throw new Error(sigblock.error.message)

            const sigtime = sigblock.result.time

            setDisplayProps({
              deeplinkData,
              sigtime
            })
            setDisplayKey(LOGIN_CONSENT_INFO)
          } else {
            createAlert(
              'Failed to verify',
              'Failed to verify request signature',
            );
            cancel();
          }
          break;
        default:
          createAlert('Unsupported', 'Unsupported request');
          cancel();
          break;
      }
    } catch (e) {
      createAlert('Error', e.message);
      cancel();
    }
  };

  useEffect(() => {
    processDeeplink()
  }, [])

  const screens = {
    [LOGIN_CONSENT_INFO]: () => (
      <LoginRequestInfo
        {...displayProps}
        cancel={cancel}
        setLoading={setLoading}
        navigation={props.navigation}
      />
    ),
  };
  
  return (
    <View style={Styles.flexBackground}>
      {displayKey == null || loading ? <AnimatedActivityIndicatorBox /> : screens[displayKey]()}
    </View>
  );
};

export default DeepLink;

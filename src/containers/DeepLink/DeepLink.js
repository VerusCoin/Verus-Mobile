import { CommonActions } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AnimatedActivityIndicatorBox from '../../components/AnimatedActivityIndicatorBox';
import Styles from '../../styles/index';
import { primitives } from "verusid-ts-client"
import { verifyLoginConsentRequest } from '../../utils/api/channels/vrpc/requests/verifyLoginConsentRequest';
import { createAlert } from '../../actions/actions/alert/dispatchers/alert';
import VrpcProvider from '../../utils/vrpc/vrpcInterface';
import { extractLoginConsentSig } from '../../utils/api/channels/vrpc/requests/extractLoginConsentSig';
import { getBlock } from '../../utils/api/channels/vrpc/callCreators';
import { LOGIN_CONSENT_INFO } from '../../utils/constants/deeplink';
import LoginRequestInfo from './LoginRequestInfo/LoginRequestInfo';
import { getIdentity } from '../../utils/api/channels/verusid/callCreators';
import { convertFqnToDisplayFormat } from '../../utils/fullyqualifiedname';
import { resetDeeplinkData } from '../../actions/actionCreators';
import { NavigationActions } from '@react-navigation/compat';

const authorizedPermissions = [primitives.IDENTITY_VIEW.vdxfid, primitives.IDENTITY_AGREEMENT.vdxfid,/* primitives.ATTESTATION_READ_REQUEST.vdxfid */]
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory';

const DeepLink = (props) => {
  const deeplinkId = useSelector((state) => state.deeplink.id)
  const deeplinkData = useSelector((state) => state.deeplink.data)
  const signedIn = useSelector((state) => state.authentication.signedIn)
  const reDirect = useSelector((state) => state.deeplink.redirect)
  const [displayKey, setDisplayKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [displayProps, setDisplayProps] = useState({})
  const dispatch = useDispatch()

  const cancel = () => {
    let resetAction

    if (signedIn && reDirect) {
      resetAction = NavigationActions.back();
    } 
    else if (signedIn) {
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

    dispatch(resetDeeplinkData())
    props.navigation.dispatch(resetAction);
  }

  const processDeeplink = async () => {
    try {
      switch (deeplinkId) {
        case primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid:
          const request = new primitives.LoginConsentRequest(deeplinkData)

          if (request.challenge.context != null) {
            if (Object.keys(request.challenge.context.kv).length !== 0) {
              throw new Error("Login requests with context are currently unsupported.")
            }
          }

          const coinObj = CoinDirectory.findCoinObj(request.system_id, null, true)
          VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0])

          if (await verifyLoginConsentRequest(coinObj, request)) {
            for (const requestedPermission of request.challenge
              .requested_access) {
              if (
                !authorizedPermissions.includes(requestedPermission.vdxfkey)
              ) {
                throw new Error(
                  'Unrecognized requested permission ' +
                    requestedPermission.vdxfkey,
                );
              }
            }

            if (request.challenge.requested_access.length == 0) {
              throw new Error(
                'No permissions being requested in loginconsent request.',
              );
            }

            const sig = await extractLoginConsentSig(coinObj, request)

            const sigblock = await getBlock(coinObj.system_id, sig.height)
           
            if (sigblock.error) throw new Error(sigblock.error.message)

            const sigtime = sigblock.result.time

            const signedBy = await getIdentity(coinObj.system_id, request.signing_id)

            if (signedBy.error) throw new Error(signedBy.error.message)

            setDisplayProps({
              deeplinkData,
              sigtime,
              signerFqn: convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname)
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

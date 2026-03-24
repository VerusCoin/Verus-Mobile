import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { CommonActions } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import base64url from 'base64url';
import axios from 'axios';
import { URL } from 'react-native-url-polyfill';
import Styles from '../../../styles/index';
import AnimatedSuccessCheckmark from '../../../components/AnimatedSuccessCheckmark';
import Colors from '../../../globals/colors';
import { resetDeeplinkData } from '../../../actions/actionCreators';
import { openUrl } from '../../../utils/linking';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import { signGenericResponse } from '../../../utils/api/channels/vrpc/callCreators';
import { GenericRequest, GenericResponse, GENERIC_RESPONSE_DEEPLINK_VDXF_KEY, ResponseURI, BigNumber } from 'verus-typescript-primitives';
import { verifyGenericResponse } from '../../../utils/api/channels/vrpc/requests/verifyGenericResponse';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { VERUS_MOBILE_HANDLER_ID } from '../../../utils/constants/deeplink';

const GenericRequestComplete = props => {
  const { requestBufferString, responseBufferString } = props.route.params;
  const signedIn = useSelector(state => state.authentication.signedIn);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const completeRequest = () => {
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [{name: signedIn ? 'SignedInStack' : 'SignedOutStack'}],
    });

    dispatch(resetDeeplinkData());
    props.navigation.dispatch(resetAction);
  };

  const isPostUri = (uri) => {
    if (uri == null || uri.type == null) return false;
    if (uri.type.eq) return uri.type.eq(ResponseURI.TYPE_POST);
    return Number(uri.type) === ResponseURI.TYPE_POST.toNumber();
  };

  const isRedirectUri = (uri) => {
    if (uri == null || uri.type == null) return false;
    if (uri.type.eq) return uri.type.eq(ResponseURI.TYPE_REDIRECT);
    return Number(uri.type) === ResponseURI.TYPE_REDIRECT.toNumber();
  };

  const getResponseUri = (responseUris) => {
    if (responseUris == null || responseUris.length === 0) return null;

    const postUri = responseUris.find(uri => isPostUri(uri));
    if (postUri) return postUri;

    const redirectUri = responseUris.find(uri => isRedirectUri(uri));
    return redirectUri || null;
  };

  const handleResponseUri = async (request, response) => {
    if (!request) return;

    const responseUris = request.responseURIs || [];
    const responseUri = getResponseUri(responseUris);

    if (responseUri == null) return;

    if (isPostUri(responseUri)) {
      const responseBuffer = response.toBuffer();
      await axios.post(
        responseUri.getUriString(),
        responseBuffer,
        { headers: { 'Content-Type': 'application/octet-stream' } }
      );
    } else if (isRedirectUri(responseUri)) {
      const url = new URL(responseUri.getUriString());
      url.searchParams.set(
        GENERIC_RESPONSE_DEEPLINK_VDXF_KEY.vdxfid,
        base64url(response.toBuffer())
      );

      openUrl(url.toString());
    }
  };

  const responseNotice = useMemo(() => {
    if (!requestBufferString) return null;

    try {
      const request = new GenericRequest();
      request.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);

      const responseUri = getResponseUri(request.responseURIs || []);
      if (!responseUri) return null;

      if (isPostUri(responseUri)) {
        return "Press done to complete request.";
      }

      if (isRedirectUri(responseUri)) {
        const url = new URL(responseUri.getUriString());
        return `Press done to return to ${url.protocol}//${url.host}`;
      }
    } catch (e) {
      return null;
    }

    return null;
  }, [requestBufferString]);

  const onDone = async () => {
    try {
      setLoading(true);

      if (!requestBufferString || !responseBufferString) {
        setLoading(false);
        completeRequest();
        return;
      }

      const request = new GenericRequest();
      request.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);

      const response = new GenericResponse();
      response.fromBuffer(Buffer.from(responseBufferString, 'hex'), 0);

      response.createdAt = new BigNumber((Date.now() / 1000).toFixed(0));
      response.handledBy = VERUS_MOBILE_HANDLER_ID;

      response.setFlags();

      if (response.signature == null) {
        setLoading(false);
        completeRequest();
        return;
      }

      const signerSystemID = response.signature.systemID.toIAddress();
      const signerSystemName = getSystemNameFromSystemId(signerSystemID);
      const coinObj = CoinDirectory.getBasicCoinObj(signerSystemName);

      const signedResponse = await signGenericResponse(coinObj, response);
      const verification = await verifyGenericResponse(coinObj, signedResponse);

      if (!verification) {
        throw new Error("Response failed verification, ensure the identity you selected is still under your control.")
      }

      await handleResponseUri(request, signedResponse);
    } catch (e) {
      createAlert("Error", e.message)

      setLoading(false);
    }

    completeRequest();
  };

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between',
      }}>
      <View style={Styles.focalCenter}>
        <Text
          numberOfLines={1}
          style={{
            textAlign: 'center',
            fontSize: 20,
            color: Colors.verusDarkGray,
          }}>
          {loading ? 'Loading...' : 'Success!'}
        </Text>
        <View style={{paddingVertical: 16}}>
          {!loading && (
            <AnimatedSuccessCheckmark
              style={{
                width: 128,
              }}
            />
          )}
        </View>
        {responseNotice && (
          <View style={{paddingBottom: 12}}>
            <Text style={{textAlign: 'center', fontSize: 16, color: Colors.verusDarkGray}}>
              {responseNotice}
            </Text>
          </View>
        )}
        <View
          style={{
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            paddingTop: 16,
          }}>
          <Button
            textColor={Colors.warningButtonColor}
            style={{width: 148}}
            labelStyle={{fontSize: 18}}
            disabled={loading}
            onPress={() => completeRequest()}>
            Cancel
          </Button>
          <Button
            buttonColor={Colors.verusGreenColor}
            textColor={Colors.secondaryColor}
            style={{width: 148}}
            labelStyle={{fontSize: 18}}
            disabled={loading}
            onPress={() => onDone()}>
            Done
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

export default GenericRequestComplete;

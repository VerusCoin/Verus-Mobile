/*
  GenericRequestComplete
  - 2026-02-05: Redesigned UI to match stepper visual language. SafeAreaView layout
    with mainTitle header, centered checkmark, context-aware response notice card,
    single gradient "Complete" button in footer bar. Removed Cancel button (action
    is already done, skipping response delivery is bad UX). Updated notice copy:
    redirect shows "You'll be redirected to {host} to finish", POST shows
    "Your response will be sent to the requester".
*/
import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { CommonActions } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import base64url from 'base64url';
import axios from 'axios';
import { URL } from 'react-native-url-polyfill';
import AnimatedSuccessCheckmark from '../../../components/AnimatedSuccessCheckmark';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import GradientButton from '../../../components/GradientButton';
import Colors from '../../../globals/colors';
import { resetDeeplinkData } from '../../../actions/actionCreators';
import { openUrl } from '../../../utils/linking';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import { signGenericResponse } from '../../../utils/api/channels/vrpc/callCreators';
import { GenericRequest, GenericResponse, GENERIC_RESPONSE_DEEPLINK_VDXF_KEY, ResponseURI } from 'verus-typescript-primitives';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
        return "Your response will be sent to the requester";
      }

      if (isRedirectUri(responseUri)) {
        const url = new URL(responseUri.getUriString());
        return `You'll be redirected to ${url.protocol}//${url.host} to finish`;
      }
    } catch (e) {
      return null;
    }

    return null;
  }, [requestBufferString]);

  const onComplete = async () => {
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

      if (response.signature == null) {
        setLoading(false);
        completeRequest();
        return;
      }

      const signerSystemID = response.signature.systemID.toIAddress();
      const signerSystemName = getSystemNameFromSystemId(signerSystemID);
      const coinObj = CoinDirectory.getBasicCoinObj(signerSystemName);

      const signedResponse = await signGenericResponse(coinObj, response);

      await handleResponseUri(request, signedResponse);
    } catch (e) {
      console.warn(e);
      setLoading(false);
    }

    completeRequest();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <AnimatedActivityIndicatorBox />
          <Text style={styles.loadingText}>Completing request...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Centered success content */}
      <View style={styles.centerContent}>
        <Text style={styles.mainTitle}>Success</Text>

        <View style={styles.checkmarkContainer}>
          <AnimatedSuccessCheckmark
            style={{ width: 128 }}
          />
        </View>

        {responseNotice && (
          <View style={styles.noticeCard}>
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color="#666"
              style={{ marginRight: 8, marginTop: 1 }}
            />
            <Text style={styles.noticeText}>{responseNotice}</Text>
          </View>
        )}
      </View>

      {/* Footer with single Complete button */}
      <View style={styles.footer}>
        <GradientButton
          onPress={onComplete}
          style={styles.completeButton}
        >
          Complete
        </GradientButton>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.2,
    color: '#1A1A1A',
    marginBottom: 24,
    textAlign: 'center',
  },
  checkmarkContainer: {
    paddingVertical: 16,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    width: '100%',
  },
  noticeText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  footer: {
    backgroundColor: 'white',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  completeButton: {
    width: '100%',
  },
});

export default GenericRequestComplete;

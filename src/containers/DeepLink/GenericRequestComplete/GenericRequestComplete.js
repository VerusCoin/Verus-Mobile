/*
  GenericRequestComplete
  - 2026-02-05: Redesigned UI to match stepper visual language. SafeAreaView layout
  with mainTitle header, centered checkmark, context-aware response notice card,
  single gradient "Complete" button in footer bar. Removed Cancel button (action
  is already done, skipping response delivery is bad UX). Updated notice copy:
  redirect shows "You'll be redirected to {host} to finish", POST shows
  "Your response will be sent to the requester".
  - 2026-03-11: Clarified that the surfaced txid belongs to the identity update transaction .
  - 2026-04-08: Reintroduced a guarded cancel escape hatch after a POST response URI
  fails so users can leave the screen after at least one delivery attempt.
*/
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Platform, SafeAreaView, View, TouchableOpacity, Clipboard } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { CommonActions } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import {
  BigNumber,
  GenericRequest,
  GenericResponse,
  GENERIC_RESPONSE_DEEPLINK_VDXF_KEY,
  IDENTITY_UPDATE_RESPONSE_VDXF_KEY,
  ResponseURI,
  VERUS_MOBILE_GENERIC_REQUEST_HANDLER_ID,
} from 'verus-typescript-primitives';
import { verifyGenericResponse } from '../../../utils/api/channels/vrpc/requests/verifyGenericResponse';
import { createAlert, resolveAlert } from '../../../actions/actions/alert/dispatchers/alert';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { genericRequestCompleteStyles as styles } from '../../../styles';
import { markProvisioningDeeplinkComplete } from '../../../utils/deeplink/provisioningDeeplinkStorage';

const GenericRequestComplete = props => {
  const { requestBufferString, responseBufferString } = props.route.params;
  const insets = useSafeAreaInsets();
  const bottomNavigationInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 24 : 0,
  );
  const footerBottomPadding = 16 + bottomNavigationInset;
  const signedIn = useSelector(state => state.authentication.signedIn);
  const passthrough = useSelector(state => state.deeplink.passthrough);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [postFailed, setPostFailed] = useState(false);
  const [txidCopied, setTxidCopied] = useState(false);
  const txidCopyTimeoutRef = useRef(null);

  const completeRequest = () => {
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [{name: signedIn ? 'SignedInStack' : 'SignedOutStack'}],
    });

    dispatch(resetDeeplinkData());
    props.navigation.dispatch(resetAction);
  };

  const markSavedProvisioningRequestComplete = async () => {
    if (passthrough?.pendingProvisioningDeeplinkId) {
      try {
        await markProvisioningDeeplinkComplete(
          passthrough.pendingProvisioningDeeplinkId,
        );
      } catch (e) {
        console.warn('Unable to mark provisioning deeplink complete', e);
      }
    }
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
      try {
        await axios.post(
          responseUri.getUriString(),
          responseBuffer,
          { headers: { 'Content-Type': 'application/octet-stream' } }
        );
      } catch (error) {
        const status = error?.response?.status;
        const statusSuffix = status != null ? ` (HTTP ${status})` : '';
        const postError = new Error(
          `Failed to send the response to the requester${statusSuffix}.`
        );

        postError.isResponsePostError = true;
        postError.cause = error;
        throw postError;
      }
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

  const identityUpdateTxid = useMemo(() => {
    if (!responseBufferString) return null;

    try {
      const response = new GenericResponse();
      response.fromBuffer(Buffer.from(responseBufferString, 'hex'), 0);

      if (!response.details || response.details.length === 0) return null;

      for (const detail of response.details) {
        if (!detail || !detail.getIAddressKey || detail.getIAddressKey() !== IDENTITY_UPDATE_RESPONSE_VDXF_KEY.vdxfid) {
          continue;
        }

        if (
          detail.data &&
          typeof detail.data.containsTxid === 'function' &&
          typeof detail.data.getTxidString === 'function' &&
          detail.data.containsTxid()
        ) {
          return detail.data.getTxidString();
        }
      }
    } catch (e) {
      return null;
    }

    return null;
  }, [responseBufferString]);

  const copyTxid = () => {
    if (!identityUpdateTxid) return;

    if (txidCopyTimeoutRef.current) clearTimeout(txidCopyTimeoutRef.current);
    setTxidCopied(true);
    txidCopyTimeoutRef.current = setTimeout(() => {
      setTxidCopied(false);
      txidCopyTimeoutRef.current = null;
    }, 2000);

    Clipboard.setString(identityUpdateTxid);
  };

  const onCancel = async () => {
    const shouldCancel = await createAlert(
      'Cancel response?',
      'If you cancel now, the response will not be sent back to the requester.',
      [
        {
          text: 'Keep trying',
          style: 'cancel',
          onPress: () => resolveAlert(false),
        },
        {
          text: 'Cancel response',
          style: 'destructive',
          onPress: () => resolveAlert(true),
        },
      ],
      { cancelable: true }
    );

    if (shouldCancel) {
      completeRequest();
    }
  };

  useEffect(() => {
    return () => {
      if (txidCopyTimeoutRef.current) clearTimeout(txidCopyTimeoutRef.current);
    };
  }, []);

  const truncate = (value, start = 8, end = 6) => {
    if (!value) return '';
    if (value.length <= start + end + 3) return value;
    return `${value.slice(0, start)}...${value.slice(-end)}`;
  };

  // Keep the redesigned success UI while stamping and verifying the response metadata; integrated by Codex GPT-5 to match the upstream protocol path.
  const onComplete = async () => {
    try {
      setLoading(true);

      if (!requestBufferString || !responseBufferString) {
        await markSavedProvisioningRequestComplete();
        setLoading(false);
        completeRequest();
        return;
      }

      const request = new GenericRequest();
      request.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);

      const response = new GenericResponse();
      response.fromBuffer(Buffer.from(responseBufferString, 'hex'), 0);

      response.createdAt = new BigNumber((Date.now() / 1000).toFixed(0));
      response.handledBy = VERUS_MOBILE_GENERIC_REQUEST_HANDLER_ID;

      response.setFlags();
      if (response.signature == null) {
        await markSavedProvisioningRequestComplete();
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
        throw new Error('Response failed verification, ensure the identity you selected is still under your control.');
      }

      await handleResponseUri(request, signedResponse);
      await markSavedProvisioningRequestComplete();
    } catch (e) {
      if (e?.isResponsePostError) {
        setPostFailed(true);
      }

      createAlert('Error', e?.message || 'Failed to complete the request.');
      console.warn(e);
      setLoading(false);
      return;
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

        {identityUpdateTxid && (
          <View style={styles.txidCard}>
            <TouchableOpacity
              style={styles.txidRow}
              onPress={copyTxid}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Copy transaction ID"
            >
              <Text style={styles.txidLabel}>Identity update txid</Text>
              <View style={styles.txidValueRow}>
                <Text style={styles.txidValue} numberOfLines={1}>
                  {truncate(identityUpdateTxid)}
                </Text>
                {txidCopied ? (
                  <Text style={styles.copiedLabel}>Copied</Text>
                ) : (
                  <MaterialCommunityIcons name="content-copy" size={16} color={Colors.primaryColor} style={{ marginLeft: 6 }} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

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

      {/* Footer actions */}
      <View style={[styles.footer, {paddingBottom: footerBottomPadding}]}>
        {postFailed && (
          <View style={styles.ctaCol}>
            <Button
              mode="outlined"
              onPress={onCancel}
              style={styles.secondaryCta}
              contentStyle={styles.secondaryCtaContent}
              labelStyle={styles.secondaryCtaLabel}
            >
              Cancel
            </Button>
          </View>
        )}
        <View style={styles.ctaCol}>
          <GradientButton
            onPress={onComplete}
            style={styles.completeButton}
          >
            Complete
          </GradientButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default GenericRequestComplete;

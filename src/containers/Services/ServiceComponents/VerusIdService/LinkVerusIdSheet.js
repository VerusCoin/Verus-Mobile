import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Text, View} from 'react-native';
import {CircleAlert} from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import {useSelector} from 'react-redux';
import AnimatedSuccessCheckmark from '../../../../components/AnimatedSuccessCheckmark';
import {useButtonHeight} from '../../../../hooks/useButtonHeight';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import AppButton from '../../../../components/AppButton';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useAppTheme} from '../../../../theme/app';
import {createRegistrationContext, linkRegisteredIdentity} from '../../../../utils/identityRegistration';
import {captureIdentityLinkContext, discoverLinkableIdentities, linkSelectedIdentities} from '../../../../utils/identityLinking/identityLinking';
import {dispatchRemoveNotification} from '../../../../actions/actions/notifications/dispatchers/notifications';
import {isVerusIdTransportError, verusIdErrorMessage} from './verusIdErrors';

// Space for the picture, two title lines and two message lines.
const CONTENT_HEIGHT = 196;
const FOOTER_GAP = 10;
const FOOTER_BOTTOM = 12;

// Mount on the surface that opened it. One tap starts one session-scoped link.
// A target is retained through closing so its title does not disappear early.
// The sheet keeps one height while linking, when linked and when it failed:
// the footer always keeps room for two buttons. The Home card goes only after
// the sheet has closed, so it does not vanish behind a sheet that says Linking.
export default function LinkVerusIdSheet({target, onClose, onClosed, onDone}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const buttonHeight = useButtonHeight();
  const footerHeight = buttonHeight * 2 + FOOTER_GAP + FOOTER_BOTTOM;
  const session = useSelector(state => `${state.authentication.activeAccount?.accountHash}:${state.authentication.sessionEpoch || 0}`);
  const [retained, setRetained] = useState(target);
  const [state, setState] = useState('busy');
  const [error, setError] = useState(null);
  const running = useRef(false);
  const version = useRef(0);
  const done = useRef(false);
  const openingSession = useRef(session);
  const start = async item => {
    if (!item || running.current) return;
    running.current = true;
    const token = ++version.current;
    setState('busy'); setError(null);
    try {
      if (item.jobId) await linkRegisteredIdentity(item.jobId, createRegistrationContext());
      else {
        const context = captureIdentityLinkContext(item.chain);
        const identities = await discoverLinkableIdentities(context);
        const identity = identities.find(row => row.identityAddress === item.identityAddress);
        if (!identity) throw new Error('This wallet cannot link this VerusID. Check its control address.');
        const result = await linkSelectedIdentities({context, identities: [identity]});
        if (result.failed.length) throw result.failed[0].error;
        if (result.refreshError) throw result.refreshError;
      }
      if (token === version.current) setState('done');
    } catch (failure) {
      if (token === version.current && failure.code !== 'SESSION_CHANGED') {
        setState('failed');
        setError(isVerusIdTransportError(failure) ? 'Could not reach the server. Check your connection.' : verusIdErrorMessage(failure));
      }
    } finally { if (token === version.current) running.current = false; }
  };
  useEffect(() => {
    openingSession.current = session;
    if (target) { setRetained(target); done.current = false; start(target); }
    return () => { ++version.current; running.current = false; };
  }, [target]);
  useEffect(() => {
    if (openingSession.current !== session) {
      ++version.current; running.current = false; done.current = false;
      onClose();
    }
  }, [session]);
  const close = completed => {
    if (running.current) return;
    done.current = completed;
    onClose();
  };
  const name = retained?.name || 'VerusID';
  const handleClosed = () => {
    if (done.current) {
      if (retained?.notificationUid) dispatchRemoveNotification(retained.notificationUid);
      onDone?.(retained);
    }
    setRetained(null);
    onClosed?.();
  };
  return <BottomSheetModal visible={!!target} maxHeight="60%" closeDisabled={state === 'busy'}
    onClose={() => close(state === 'done')} onClosed={handleClosed}>
    <View style={[styles.body, styles.bodyShort, {paddingBottom: 0}]}>
      <View style={{height: CONTENT_HEIGHT, alignItems: 'center', justifyContent: 'center'}}>
        {/* The request result sheets' progress and success pictures. */}
        <View
          accessibilityLabel={state === 'busy' ? `Linking ${name}` : undefined}
          accessibilityRole={state === 'busy' ? 'progressbar' : undefined}
          style={{height: 84, alignItems: 'center', justifyContent: 'center', marginBottom: 8}}>
          {state === 'busy'
            ? <LottieView autoPlay loop source={require('../../../../animations/loading_7bars.json')} style={{width: 96, height: 70}} />
            : state === 'done'
              ? <AnimatedSuccessCheckmark style={{width: 84, height: 84}} />
              : <CircleAlert size={40} strokeWidth={1.8} color={theme.colors.dangerText} />}
        </View>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" numberOfLines={2}
          style={[theme.typography.titleSheet, {color: theme.colors.textPrimary, textAlign: 'center'}]}>
          {state === 'busy' ? `Linking ${name}` : state === 'done' ? `${name} is linked` : `${name} is not linked`}
        </Text>
        <Text numberOfLines={2} style={[theme.typography.bodySm, {color: theme.colors.textSecondary, marginTop: 8, minHeight: 40, textAlign: 'center'}]}>
          {state === 'busy' ? '' : state === 'done' ? 'It is in the VerusID tab.' : error}
        </Text>
      </View>
      <View style={{height: footerHeight, justifyContent: 'flex-end'}}>
        {state !== 'busy' && <SafeBottomActionStack horizontalSpacing={0} bottomSpacing={FOOTER_BOTTOM} includeBottomInset={false} gap={FOOTER_GAP}>
          <AppButton onPress={state === 'done' ? () => close(true) : () => start(retained)}>{state === 'done' ? 'Done' : 'Try again'}</AppButton>
          {state === 'failed' && <AppButton variant="secondary" onPress={() => close(false)}>Not now</AppButton>}
        </SafeBottomActionStack>}
      </View>
    </View>
  </BottomSheetModal>;
}

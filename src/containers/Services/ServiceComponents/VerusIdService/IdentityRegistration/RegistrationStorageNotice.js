import React, {useCallback, useRef, useState} from 'react';
import {Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {CircleAlert} from 'lucide-react-native';
import {
  clearRegistrationJobs,
  publishRegistrationJobs,
} from '../../../../../actions/actions/services/dispatchers/verusid/registration';
import {createAlert, resolveAlert} from '../../../../../actions/actions/alert/dispatchers/alert';
import AppButton from '../../../../../components/AppButton';
import TextAction from '../../../../../components/TextAction';
import {useAppTheme} from '../../../../../theme/app';
import {verusIdErrorMessage} from '../verusIdErrors';
import {useRegistrationStyles} from './RegistrationDesign';
import useRegistrationAction from './useRegistrationAction';

const LOAD_ERROR = 'Saved registrations could not be loaded. Your registration data has not been changed.';

// Wallet start-up skips an unreadable registration store so the wallet still
// opens. The VerusID tab reads it again on focus and says when it fails, so a
// saved (possibly paid) registration never disappears without a message.
export function useRegistrationStorage() {
  const {busy, error, run, running} = useRegistrationAction();
  const [clearing, setClearing] = useState(false);
  const promptOpen = useRef(false);

  const retry = useCallback(() => {
    if (running.current) return undefined;
    return run(async context => {
      try {
        return await publishRegistrationJobs(context);
      } catch (failure) {
        if (failure?.code === 'SESSION_CHANGED') throw failure;
        // The failure can hold protected receipt data; show fixed copy only.
        throw new Error(LOAD_ERROR);
      }
    });
  }, [run, running]);

  useFocusEffect(useCallback(() => { retry(); }, [retry]));

  // Recovery for a store the wallet cannot read: it removes only the saved
  // registrations, never linked VerusIDs. Offered only after a failed read.
  const clear = useCallback(() => {
    if (running.current || !error || promptOpen.current) return;
    promptOpen.current = true;
    const close = () => { promptOpen.current = false; };
    createAlert(
      'Clear all registration data?',
      'Saved registrations in this wallet are deleted, and any fees already paid will not be refunded. This cannot be undone.',
      [
        {text: 'Not now', style: 'cancel', onPress: () => { close(); resolveAlert(false); }},
        {
          text: 'Clear all registration data',
          style: 'destructive',
          onPress: () => {
            close();
            resolveAlert(true);
            if (running.current) return undefined;
            setClearing(true);
            // The storage writer checks the captured account again. The empty
            // state shows only after the reset is saved.
            return run(clearRegistrationJobs).finally(() => setClearing(false));
          },
        },
      ],
      {cancelable: true},
    );
  }, [error, run, running]);

  return {busy, error, clearing, retry, clear};
}

// Shows the storage error with Try again and the reset. Without an error it
// shows its children (the tab's empty state), except while a reset is saved.
export default function RegistrationStorageNotice({storage, children = null}) {
  const theme = useAppTheme();
  const styles = useRegistrationStyles();
  if (!storage.error) return storage.clearing ? null : children;
  return <View style={[styles.job, {marginBottom: 24}]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
    <View style={[styles.row, {gap: 6, alignItems: 'flex-start'}]}>
      <View style={{paddingTop: 3}}><CircleAlert size={14} color={theme.colors.dangerText} /></View>
      <Text style={[theme.typography.bodySm, {color: theme.colors.textPrimary, flexShrink: 1}]}>
        {verusIdErrorMessage(storage.error)}
      </Text>
    </View>
    <View style={[styles.row, {gap: 16, flexWrap: 'wrap', marginTop: 2}]}>
      <AppButton compact height={32} preserveHeightOnSmallWindow variant="secondary" buttonColor={theme.colors.surface}
        labelStyle={theme.typography.labelSm} disabled={storage.busy} onPress={storage.retry}>Try again</AppButton>
      <TextAction size="small" destructive disabled={storage.busy} onPress={storage.clear}>Clear all registration data</TextAction>
    </View>
  </View>;
}

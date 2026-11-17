import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, Keyboard, StyleSheet, View} from 'react-native';
import {useSelector} from 'react-redux';
import {useHeaderHeight} from '@react-navigation/elements';
import {AtSign, CircleAlert} from 'lucide-react-native';
import AppButton from '../../../../../components/AppButton';
import AppSearchField, {APP_SEARCH_MIN_ITEMS} from '../../../../../components/AppSearchField';
import InfoSheet from '../../../../../components/InfoSheet';
import InfoSheetSection, {InfoSheetTopic} from '../../../../../components/InfoSheetSection';
import EmptyState from '../../../../../components/EmptyState';
import KeyboardAvoidingForm from '../../../../../components/KeyboardAvoidingForm';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import SignedOutActionRow from '../../../../../components/SignedOutActionRow';
import SkeletonLoader, {SkeletonBlock} from '../../../../../components/SkeletonLoader';
import {SelectionRow} from '../../../../../components/SelectionSheet';
import {useOnboardingSmallDeviceLayout} from '../../../../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import {identityManagementStyles} from '../../../../../styles';
import Store from '../../../../../store';
import {sessionScopeIsCurrent} from '../../../../../actions/actions/updates/sessionRequests';
import {VRPC} from '../../../../../utils/constants/intervalConstants';
import {captureIdentityLinkContext, discoverLinkableIdentities, linkSelectedIdentities, retryIdentityLinkRefresh} from '../../../../../utils/identityLinking/identityLinking';
import {ActionButton, Body, ManagementInfoButton, SelectionField, useManagementKeyboard, verusIdText} from '../IdentityManagement/ManagementComponents';
import {ErrorMessage} from '../../../../SendWizard/components/WizardUI';

const refreshMessage = 'Your VerusIDs were saved, but the wallet could not refresh. Try refreshing the wallet again.';
const layout = StyleSheet.create({
  screen: {flex: 1},
  list: {flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28},
  header: {gap: 12, paddingBottom: 12},
  skeletonRow: {height: 56, padding: 16, borderRadius: 18, justifyContent: 'center', marginBottom: 4},
  empty: {flex: 1, justifyContent: 'center'},
  footer: {paddingTop: 16},
  footerCompact: {paddingTop: 8},
});

export function LinkIdentitiesPage({ navigation, route }) {
  const coins = useSelector(state => state.coins.activeCoinsForUser || []);
  const account = useSelector(state => state.authentication.activeAccount);
  const isTestnet = Object.keys(account?.testnetOverrides || {}).length > 0;
  const wallets = coins.filter(coin =>
    !!coin.testnet === isTestnet &&
    coin.system_id === coin.currency_id &&
    account?.keys?.[coin.id]?.[VRPC]?.addresses?.length,
  );
  const walletBinding = JSON.stringify(
    wallets.map(coin => [coin.id, account.keys[coin.id][VRPC].addresses]),
  );
  const [chain, setChain] = useState(route.params?.chain || route.params?.coinId);

  // Bind discovery to the selected network and its current wallet addresses.
  const contextState = useMemo(() => {
    try {
      return { context: captureIdentityLinkContext(chain) };
    } catch (error) {
      return { error };
    }
  }, [chain, walletBinding]);
  const { context } = contextState;

  const [rows, setRows] = useState([]);
  const [selection, setSelection] = useState([]);
  const [query, setQuery] = useState('');
  const [aboutVisible, setAboutVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [failures, setFailures] = useState([]);

  const mounted = useRef(true);
  // Discovery results may update the page only while their operation is current.
  const operation = useRef(0);
  // Unlike state, this guard changes immediately to prevent duplicate submissions.
  const linking = useRef(false);
  const refreshPending = useRef(false);
  const list = useRef(null);

  const theme = useOnboardingTheme();
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const keyboardOpen = useManagementKeyboard();
  const headerHeight = useHeaderHeight();
  const current = useCallback(
    () =>
      mounted.current &&
      context &&
      sessionScopeIsCurrent(Store.getState(), context.sessionScope),
    [context],
  );

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      operation.current += 1;
    };
  }, []);

  // Keep the page open until the selected batch has finished saving.
  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (linking.current) {
      event.preventDefault();
    }
  }), [navigation]);

  useEffect(() => {
    navigation.setOptions({gestureEnabled: !busy,
      headerRight: () => <ManagementInfoButton label="About linking VerusIDs" disabled={busy}
        onPress={() => {Keyboard.dismiss(); setAboutVisible(true);}} />,
    });
  }, [navigation, busy]);

  const load = useCallback(async () => {
    if (linking.current) {
      return;
    }

    const request = ++operation.current;

    setLoading(true);
    setError(null);
    setFailures([]);

    // Only rows from the latest discovery may be linked.
    setRows([]);
    setSelection([]);

    if (!context) {
      setLoading(false);
      return;
    }

    try {
      // A saved batch may still need a wallet refresh. Retry that independently
      // of discovery so saved identities are not submitted again.
      if (refreshPending.current) {
        try {
          await retryIdentityLinkRefresh(context);

          if (!current() || request !== operation.current) {
            return;
          }

          refreshPending.current = false;
        } catch (failure) {
          if (
            !current() ||
            request !== operation.current ||
            failure.code === 'SESSION_CHANGED'
          ) {
            return;
          }

          setError(new Error(refreshMessage));
        }
      }

      const identities = await discoverLinkableIdentities(context);

      if (current() && request === operation.current) {
        setRows(identities);
      }
    } catch (failure) {
      if (
        current() &&
        request === operation.current &&
        failure.code !== 'SESSION_CHANGED'
      ) {
        setError(failure);
      }
    } finally {
      if (mounted.current && request === operation.current) {
        setLoading(false);
      }
    }
  }, [context, current]);

  useEffect(() => {
    // A new discovery context starts a new selection. Refreshing the existing
    // context keeps its saved-link message and any pending wallet refresh.
    refreshPending.current = false;
    setNotice('');
    setQuery('');
    load();

    return () => {
      operation.current += 1;
    };
  }, [load]);

  // Preserve the original discovered row objects required by the linking helper.
  const selectedRows = rows.filter(row =>
    !row.linked && selection.includes(row.identityAddress),
  );

  const submit = async () => {
    let closeWhenFinished = false;
    if (linking.current || loading || !current() || !selectedRows.length) {
      return;
    }

    linking.current = true;
    setBusy(true);
    setError(null);
    setFailures([]);
    setNotice('');

    try {
      const result = await linkSelectedIdentities({
        context,
        identities: selectedRows,
      });

      if (!current()) {
        return;
      }

      // Mark successes as linked and leave failed selections checked for retry.
      const linked = new Set(result.linked.map(row => row.identityAddress));

      setRows(previous => previous.map(row =>
        linked.has(row.identityAddress) ? { ...row, linked: true } : row,
      ));
      setSelection(previous => previous.filter(address => !linked.has(address)));
      setFailures(result.failed);

      // Keep an earlier refresh failure pending if this retry saved no new links.
      if (linked.size) {
        refreshPending.current = !!result.refreshError;
      }

      if (linked.size) {
        setNotice(
          `${linked.size} ${linked.size === 1 ? 'identity linked' : 'identities linked'} to your wallet.`,
        );
      }

      if (refreshPending.current) {
        setError(new Error(refreshMessage));
      } else if (result.failed.length) {
        setError(new Error(
          'Some identities could not be linked. Your remaining selections are ready to retry.',
        ));
      }

      setQuery('');
      closeWhenFinished = !result.failed.length && !refreshPending.current;
      list.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (failure) {
      if (current() && failure.code !== 'SESSION_CHANGED') {
        setError(failure);
      }
    } finally {
      linking.current = false;

      if (mounted.current) {
        setBusy(false);
      }
    }
    if (closeWhenFinished && current()) navigation.goBack();
  };

  // Search changes visibility, not selection; hidden checked rows still submit.
  const showSearch = !loading && rows.length >= APP_SEARCH_MIN_ITEMS;
  useEffect(() => {if (!showSearch) setQuery('');}, [showSearch]);
  const failedAddresses = new Set(failures.map(item => item.identity.identityAddress));
  const visible = rows.filter(row =>
    `${row.displayName} ${row.identityAddress}`
      .toLowerCase()
      .includes(showSearch ? query.trim().toLowerCase() : ''),
  ).sort((left, right) => Number(failedAddresses.has(right.identityAddress)) - Number(failedAddresses.has(left.identityAddress)));
  const pageError = contextState.error || error;
  const done = !!notice && !selectedRows.length && !failures.length;

  const toggle = row => {
    if (busy || loading || row.linked) {
      return;
    }

    setSelection(previous =>
      previous.includes(row.identityAddress)
        ? previous.filter(address => address !== row.identityAddress)
        : [...previous, row.identityAddress],
    );
  };

  const manual = () => navigation.navigate('Identity', {manualLinkChain: context?.chain || chain});
  return <KeyboardAvoidingForm style={[layout.screen, {backgroundColor: theme.colors.background}]} keyboardVerticalOffset={headerHeight}>
    <FlatList ref={list} data={visible} keyExtractor={row => row.identityAddress}
      contentContainerStyle={layout.list} keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never" refreshing={false} onRefresh={busy || loading ? undefined : load}
      ListHeaderComponent={<View style={layout.header}>
        {wallets.length > 1 && <SelectionField label="Network" disabled={busy}
          value={context ? `${context.networkName}${context.isTestnet ? ' · Testnet' : ''}` : chain || 'Your wallet network'}
          options={wallets.map(coin => ({value: coin.id, label: `${coin.display_ticker || coin.id}${coin.testnet ? ' · Testnet' : ''}`, selected: coin.id === context?.chain}))}
          onSelect={setChain} />}
        {!!notice && !done && <Body>{verusIdText(notice)}</Body>}
        {!!pageError && !!rows.length && <ErrorMessage>{verusIdText(pageError.message)}</ErrorMessage>}
        {showSearch && <AppSearchField accessibilityLabel="Search identities" placeholder="Search VerusIDs" value={query}
          onChangeText={setQuery} disabled={busy} resultCount={visible.length} />}
      </View>}
      ListEmptyComponent={loading ? <SkeletonLoader accessibilityLabel="Finding your VerusIDs">
        {['46%', '64%', '52%', '72%', '48%', '56%', '68%', '40%'].map((width, index) =>
          <View key={index} style={[layout.skeletonRow, {backgroundColor: theme.colors.surfaceMuted}]}>
            <SkeletonBlock width={width} height={14} />
          </View>)}
      </SkeletonLoader> : <View style={layout.empty}><EmptyState icon={pageError ? CircleAlert : AtSign}
        title={pageError ? 'Unable to find VerusIDs' : query.trim() ? 'No matching VerusIDs' : 'No VerusIDs found'}
        message={pageError ? verusIdText(pageError.message) : query.trim() ? 'Try another name or VerusID address.'
          : 'No VerusIDs this wallet can spend from were found on this network. Locked, revoked, and VerusIDs that need other signers are left out. Pull down to check again.'}
        actionLabel={pageError && context ? 'Try again' : undefined} onAction={load} /></View>}
      renderItem={({item: row}) => <View>
        <SelectionRow title={row.displayName} selected={row.linked || selection.includes(row.identityAddress)}
          accessibilityRole="checkbox" accessibilityLabel={`${row.displayName}${row.linked ? '. Already linked' : ''}`}
          readOnly={row.linked} value={row.linked ? 'Linked' : undefined} quietValue
          showChevron={false} disabled={busy || row.linked} onPress={() => toggle(row)} />
        {failedAddresses.has(row.identityAddress) && <ErrorMessage>{verusIdText(failures.find(item => item.identity.identityAddress === row.identityAddress)?.error.message)}</ErrorMessage>}
      </View>} />
    <SafeBottomActionStack horizontalSpacing={20} bottomSpacing={keyboardOpen ? 12 : smallDevice ? 30 : 48}
      includeBottomInset={!keyboardOpen} gap={10} style={[layout.footer, smallDevice && layout.footerCompact]}>
      {refreshPending.current && <ActionButton secondary disabled={busy || loading} onPress={load}>Refresh wallet</ActionButton>}
      {!loading && !!pageError && !rows.length && <SignedOutActionRow label="Enter VerusID manually" onPress={manual} />}
      {(loading || rows.length > 0) && <AppButton loading={busy} disabled={busy || loading || (!done && !selectedRows.length)}
        onPress={done ? () => navigation.goBack() : submit}>
        {done ? 'Done' : selectedRows.length ? `Link ${selectedRows.length} ${selectedRows.length === 1 ? 'VerusID' : 'VerusIDs'}` : 'Link VerusIDs'}
      </AppButton>}
    </SafeBottomActionStack>
    <InfoSheet title="About linking VerusIDs" visible={aboutVisible} onClose={() => setAboutVisible(false)}>
      <InfoSheetTopic title="Linking">Choose from VerusIDs this wallet can spend from. Linking adds a VerusID to your wallet. It does not change its ownership or cost a network fee.</InfoSheetTopic>
      {!!context && <InfoSheetTopic title="Network">{`${context.networkName}${context.isTestnet ? ' · Testnet' : ''}`}</InfoSheetTopic>}
      {!!context?.walletAddresses?.length && <InfoSheetSection title={context.walletAddresses.length === 1 ? 'Wallet address' : 'Wallet addresses'}
        rows={context.walletAddresses.map((address, index) => ({label: `Address ${index + 1}`, value: address, copy: true, valueStyle: identityManagementStyles.identifier}))} />}
    </InfoSheet>
  </KeyboardAvoidingForm>;
}

export default function LinkIdentities(props) {
  // Remount the page when its wallet changes, discarding old selections and
  // invalidating pending results from the previous account, keys, or networks.
  const walletKey = useSelector(state => {
    const account = state.authentication.activeAccount;

    return JSON.stringify([
      account?.accountHash,
      state.authentication.sessionEpoch || 0,
      account?.testnetOverrides,
      Object.entries(account?.keys || {}).map(([coin, keys]) => [
        coin,
        keys?.[VRPC]?.addresses,
      ]),
      (state.coins.activeCoinsForUser || [])
        .filter(coin => coin.currency_id === coin.system_id)
        .map(coin => [coin.id, coin.system_id]),
    ]);
  });

  return <LinkIdentitiesPage key={walletKey} {...props} />;
}

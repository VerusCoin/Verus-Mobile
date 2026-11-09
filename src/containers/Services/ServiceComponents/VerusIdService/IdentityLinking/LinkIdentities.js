import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../../../../globals/colors';
import Store from '../../../../../store';
import { sessionScopeIsCurrent } from '../../../../../actions/actions/updates/sessionRequests';
import { VRPC } from '../../../../../utils/constants/intervalConstants';
import {
  captureIdentityLinkContext,
  discoverLinkableIdentities,
  linkSelectedIdentities,
  retryIdentityLinkRefresh,
} from '../../../../../utils/identityLinking/identityLinking';
import {
  ActionButton,
  Disclosure,
  SelectionField,
  registrationStyles as styles,
} from '../IdentityRegistration/RegistrationComponents';

const rowStatus = row => row.linked ? 'Already linked' : '';
const refreshMessage =
  'Your identities were saved, but the wallet could not refresh. Try refreshing the wallet again.';

const layout = StyleSheet.create({
  list: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 24,
  },
  header: { gap: 20, paddingBottom: 16 },
  item: {
    minHeight: 64,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e3e7ed',
  },
  empty: { paddingVertical: 32, gap: 12, alignItems: 'center' },
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

  const insets = useSafeAreaInsets();
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
    navigation.setOptions({ gestureEnabled: !busy });
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
  };

  // Search changes visibility, not selection; hidden checked rows still submit.
  const visible = rows.filter(row =>
    `${row.displayName} ${row.identityAddress}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
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

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <FlatList
        ref={list}
        data={visible}
        keyExtractor={row => row.identityAddress}
        contentContainerStyle={layout.list}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        refreshing={loading}
        onRefresh={busy ? undefined : load}
        ListHeaderComponent={
          <View style={layout.header}>
            <View style={styles.section}>
              <Text style={styles.title}>Link your identities</Text>
              <Text style={styles.body}>
                Choose from identities this wallet can spend from.
              </Text>
              <Text style={styles.muted}>
                Linking adds an identity to your wallet. It does not change its
                ownership or cost a network fee.
              </Text>
            </View>

            <View style={styles.card}>
              <SelectionField
                label="Network"
                disabled={busy || wallets.length < 2}
                value={
                  context
                    ? `${context.networkName}${context.isTestnet ? ' · Testnet' : ''}`
                    : chain || 'Your wallet network'
                }
                options={wallets.map(coin => ({
                  value: coin.id,
                  label: `${coin.display_ticker || coin.id}${coin.testnet ? ' · Testnet' : ''}`,
                  selected: coin.id === context?.chain,
                }))}
                onSelect={setChain}
              />

              {!!context?.walletAddresses?.length && (
                <Disclosure
                  title={
                    context.walletAddresses.length === 1
                      ? 'Wallet address'
                      : 'Wallet addresses'
                  }
                >
                  {context.walletAddresses.map(address => (
                    <Text key={address} selectable style={styles.muted}>
                      {address}
                    </Text>
                  ))}
                </Disclosure>
              )}
            </View>

            {!!notice && (
              <View
                style={styles.notice}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <Text style={styles.body}>{notice}</Text>
              </View>
            )}

            {!!pageError && (
              <View
                style={[styles.notice, styles.error]}
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                <Text style={styles.body}>{pageError.message}</Text>

                {failures.map(({ identity, error: failure }) => (
                  <Text key={identity.identityAddress} style={styles.muted}>
                    {identity.displayName}: {failure.message}
                  </Text>
                ))}

                {refreshPending.current && (
                  <ActionButton secondary disabled={busy || loading} onPress={load}>
                    Refresh wallet
                  </ActionButton>
                )}

                {!refreshPending.current && !rows.length && !loading && !!context && (
                  <ActionButton secondary onPress={load}>
                    Try again
                  </ActionButton>
                )}
              </View>
            )}

            {!!rows.length && (
              <TextInput
                mode="outlined"
                label="Search identities"
                accessibilityLabel="Search identities"
                value={query}
                onChangeText={setQuery}
                disabled={busy}
                autoCapitalize="none"
                autoCorrect={false}
                outlineColor="#b9c3d3"
                activeOutlineColor={Colors.primaryColor}
                style={{ backgroundColor: '#fff' }}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={layout.empty}>
            {loading ? (
              <>
                <ActivityIndicator color={Colors.primaryColor} />
                <Text style={styles.muted}>Finding your identities…</Text>
              </>
            ) : !pageError && (
              <>
                <Icon
                  name="account-search-outline"
                  size={36}
                  color={Colors.primaryColor}
                  accessible={false}
                />
                <Text style={styles.subtitle}>
                  {query.trim() ? 'No matching identities' : 'No identities found'}
                </Text>
                <Text style={[styles.muted, { textAlign: 'center' }]}>
                  {query.trim()
                    ? 'Try another name or identity address.'
                    : 'No identities this wallet can spend from were found on this network. Pull down to check again.'}
                </Text>
              </>
            )}
          </View>
        }
        renderItem={({ item: row }) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`${row.displayName}${rowStatus(row) ? `. ${rowStatus(row)}` : ''}`}
            accessibilityState={{
              checked: row.linked || selection.includes(row.identityAddress),
              disabled: busy || row.linked,
            }}
            disabled={busy || row.linked}
            onPress={() => toggle(row)}
            style={({ pressed }) => [
              styles.row,
              layout.item,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Icon
              name={
                row.linked || selection.includes(row.identityAddress)
                  ? 'checkbox-marked-circle'
                  : 'checkbox-blank-circle-outline'
              }
              size={26}
              color={row.linked ? '#596579' : Colors.primaryColor}
              accessible={false}
            />
            <View style={styles.flexible}>
              <Text style={styles.subtitle}>{row.displayName}</Text>
              <Text style={styles.muted}>{row.identityAddress}</Text>

              {!!rowStatus(row) && (
                <Text style={[styles.muted, { fontWeight: '600' }]}>
                  {rowStatus(row)}
                </Text>
              )}
            </View>
          </Pressable>
        )}
      />

      <View style={styles.footer} testID="identity-link-footer">
        <View style={[styles.footerContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text
            style={[styles.muted, { textAlign: 'center' }]}
            accessibilityLiveRegion="polite"
          >
            {busy
              ? 'Linking your selected identities…'
              : selectedRows.length
                ? `${selectedRows.length} selected`
                : done
                  ? 'Your linked identities are ready to use.'
                  : 'Select identities to link'}
          </Text>
          <ActionButton
            busy={busy}
            disabled={loading || (!done && !selectedRows.length)}
            onPress={done ? () => navigation.goBack() : submit}
          >
            {done ? 'Done' : 'Link identities'}
          </ActionButton>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
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

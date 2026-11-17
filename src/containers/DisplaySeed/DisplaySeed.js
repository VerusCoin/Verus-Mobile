import {INCORRECT_PASSWORD_MESSAGE} from '../../utils/constants/errors';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {CommonActions} from '@react-navigation/native';
import {Text} from 'react-native-paper';
import {validateMnemonic} from 'bip39';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../components/AppButton';
import CopyAction from '../../components/CopyAction';
import PasswordCheck from '../../components/PasswordCheck';
import RecoverySecretsPrivacyGuard from '../../components/RecoverySecretsPrivacyGuard';
import ServiceManagerHeader from '../../components/ServiceManagerHeader';
import RecoverySecretQrSheet, {
  canShowSecretQr,
  SecretQrAction,
} from './RecoverySecretQrSheet';
import {fontStyle} from '../../globals/fonts';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {
  accountMatchesNetwork,
  getAccountNetworkKey,
  getWalletNetworkLabel,
  WALLET_NETWORKS,
} from '../../utils/account/accountNetwork';
import {
  getAddresses as getDlightAddresses,
} from '../../utils/api/channels/dlight/requests/getAddresses';
import {isBiometricPromptOpen} from '../../utils/keychain/biometricPrompt';
import {coinsList} from '../../utils/CoinData/CoinsList';
import {
  DLIGHT_PRIVATE,
  ELECTRUM,
  ETH,
  WYRE_SERVICE,
} from '../../utils/constants/intervalConstants';
import {
  deriveKeyPair,
  dlightSeedToBytes,
  isDlightSpendingKey,
} from '../../utils/keys';
import {
  SettingsActionFooter,
  SettingsNotice,
  SettingsProfileSummary,
  SettingsScreen,
  SettingsSection,
} from '../Settings/components/SettingsScaffold';

const MONOSPACE_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const SECRET_NAMES = {
  [DLIGHT_PRIVATE]: 'Secondary (Z-address)',
  [ELECTRUM]: 'Primary',
  [WYRE_SERVICE]: 'Wyre account',
};

const normalizeSecrets = secrets =>
  Object.fromEntries(
    Object.entries(secrets || {}).filter(
      ([key, value]) =>
        SECRET_NAMES[key] != null &&
        typeof value === 'string' &&
        value.length > 0,
    ),
  );

const getAuthenticationError = error =>
  error?.message === 'Incorrect password'
    ? INCORRECT_PASSWORD_MESSAGE
    : 'Unable to access this wallet. Try again.';

const DisplaySeed = ({navigation, route}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const params = route?.params || {};
  const data = params.data || {};
  const showSignedOutHeader = params.showSignedOutHeader === true;
  const accountHash = params.accountHash;
  const requiresAuthentication = typeof accountHash === 'string';
  const protectedAccount = useMemo(
    () =>
      requiresAuthentication
        ? (accounts || []).find(account => account.accountHash === accountHash)
        : null,
    [accountHash, accounts, requiresAuthentication],
  );
  const account = protectedAccount || activeAccount;
  const expectedNetworkKey = params.networkKey;
  const accountIsAllowed =
    !requiresAuthentication ||
    (protectedAccount != null &&
      accountMatchesNetwork(protectedAccount, expectedNetworkKey));
  const networkKey =
    expectedNetworkKey || (account ? getAccountNetworkKey(account) : null);
  const networkLabel = networkKey
    ? getWalletNetworkLabel(networkKey)
    : 'Wallet';
  const [secrets, setSecrets] = useState(() =>
    requiresAuthentication ? {} : normalizeSecrets(data.seeds),
  );
  const [revealedSecrets, setRevealedSecrets] = useState({});
  const [derivedKeys, setDerivedKeys] = useState({});
  const [revealedDerivedKeys, setRevealedDerivedKeys] = useState({});
  const [fetchingDerivedKey, setFetchingDerivedKey] = useState(null);
  const [derivedKeyError, setDerivedKeyError] = useState(null);
  const [authenticationError, setAuthenticationError] = useState(null);
  const [authenticationVisible, setAuthenticationVisible] = useState(
    requiresAuthentication && accountIsAllowed,
  );
  const [captureBlocked, setCaptureBlocked] = useState(false);
  const [qrSecret, setQrSecret] = useState(null);
  const [qrVisible, setQrVisible] = useState(false);
  const sensitiveDataLoadedRef = useRef(Object.keys(secrets).length > 0);
  const reauthenticateOnActiveRef = useRef(false);
  const captureBlockedRef = useRef(false);
  const sensitiveSessionRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
      sensitiveSessionRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    sensitiveDataLoadedRef.current = Object.keys(secrets).length > 0;
  }, [secrets]);

  useEffect(() => {
    captureBlockedRef.current = captureBlocked;
  }, [captureBlocked]);

  const hideSensitiveValues = useCallback(() => {
    sensitiveSessionRef.current += 1;
    setQrVisible(false);
    setQrSecret(null);
    setRevealedSecrets({});
    setDerivedKeys({});
    setRevealedDerivedKeys({});
    setFetchingDerivedKey(null);
    setDerivedKeyError(null);

    if (requiresAuthentication) {
      setSecrets({});
      sensitiveDataLoadedRef.current = false;
    }
  }, [requiresAuthentication]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      // iOS makes the app inactive while the unlock's own Face ID or Touch ID
      // sheet is open. Locking then would drop that result and ask again.
      if (nextState === 'inactive' && isBiometricPromptOpen()) return;

      if (nextState !== 'active') {
        if (requiresAuthentication) {
          reauthenticateOnActiveRef.current = true;
          hideSensitiveValues();
          setAuthenticationVisible(false);
        } else if (sensitiveDataLoadedRef.current) {
          hideSensitiveValues();
        }
      } else if (
        reauthenticateOnActiveRef.current &&
        !captureBlockedRef.current &&
        accountIsAllowed
      ) {
        reauthenticateOnActiveRef.current = false;
        setAuthenticationVisible(true);
      }
    });

    return () => subscription.remove();
  }, [accountIsAllowed, hideSensitiveValues, requiresAuthentication]);

  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      hideSensitiveValues();
      setAuthenticationVisible(false);
    });

    return unsubscribeBlur;
  }, [hideSensitiveValues, navigation]);

  const handleCaptureChange = useCallback(
    captured => {
      captureBlockedRef.current = captured;
      setCaptureBlocked(captured);

      if (captured) {
        reauthenticateOnActiveRef.current = requiresAuthentication;
        hideSensitiveValues();
        setAuthenticationVisible(false);
      } else if (requiresAuthentication && accountIsAllowed) {
        reauthenticateOnActiveRef.current = false;
        setAuthenticationVisible(true);
      }
    },
    [accountIsAllowed, hideSensitiveValues, requiresAuthentication],
  );

  const handleAuthentication = async result => {
    if (!mountedRef.current) return;

    if (result.attemptToken !== sensitiveSessionRef.current) return;

    if (!result.valid) {
      setAuthenticationError(getAuthenticationError(result.error));
      return;
    }

    // The Face ID result can arrive before iOS reports "active" again.
    if (captureBlockedRef.current || AppState.currentState === 'background') {
      setAuthenticationVisible(false);
      return;
    }

    sensitiveSessionRef.current += 1;
    setSecrets(normalizeSecrets(result.seeds));
    setAuthenticationError(null);
    setAuthenticationVisible(false);
  };

  const back = () => navigation.goBack();

  const signedOutStatusBar = showSignedOutHeader ? (
    <StatusBar
      backgroundColor={theme.colors.background}
      barStyle={theme.isDark ? 'light-content' : 'dark-content'}
    />
  ) : null;
  const signedOutSafeAreaEdges = showSignedOutHeader
    ? ['top', 'left', 'right']
    : undefined;
  const renderSignedOutHeader = showSignedOutHeader
    ? ({showDivider}) => (
        <ServiceManagerHeader
          onBack={back}
          showDivider={showDivider}
          title="Recovery secrets"
        />
      )
    : undefined;

  const resetToScreen = () => {
    const destination = data.fromDeleteAccount ? 'DeleteProfile' : 'Home';
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [{name: destination}],
    });

    if (navigation.closeDrawer) navigation.closeDrawer();
    navigation.dispatch(resetAction);
  };

  const showSecretQr = secret => {
    setQrSecret(secret);
    setQrVisible(true);
  };

  const toggleSecret = key => {
    setRevealedSecrets(current => ({...current, [key]: !current[key]}));
  };

  const derivedKeyOptions = useMemo(() => {
    const options = [];

    if (secrets[ELECTRUM]) {
      ['VRSC', 'BTC', 'ETH'].forEach(mainnetCoinId => {
        const coinId =
          networkKey === WALLET_NETWORKS.TESTNET
            ? account?.testnetOverrides?.[mainnetCoinId]
            : mainnetCoinId;
        const coin = coinsList[coinId];

        if (coin) {
          options.push({
            coin,
            id: mainnetCoinId.toLowerCase(),
            label: coin.display_ticker,
          });
        }
      });
    }

    if (
      secrets[DLIGHT_PRIVATE] &&
      !isDlightSpendingKey(secrets[DLIGHT_PRIVATE])
    ) {
      options.push({
        coin:
          networkKey === WALLET_NETWORKS.TESTNET
            ? coinsList.VRSCTEST
            : coinsList.VRSC,
        id: 'z-address',
        label: 'Z-address spending key',
      });
    }

    return options;
  }, [account, networkKey, secrets]);

  const derivePrivateKeyDetails = async option => {
    if (option.id === 'z-address') {
      const addressResponse = await getDlightAddresses(
        '',
        secrets[DLIGHT_PRIVATE],
        option.coin.id,
      );

      return {
        address: addressResponse?.result || null,
        privateKey: await dlightSeedToBytes(secrets[DLIGHT_PRIVATE]),
      };
    }

    const channel = option.id === 'eth' ? ETH : ELECTRUM;
    const keyPair = await deriveKeyPair(
      secrets[ELECTRUM],
      option.coin,
      channel,
      data.keyDerivationVersion,
    );

    return {
      address: keyPair.addresses?.[0] || null,
      privateKey: keyPair.privKey,
    };
  };

  const toggleDerivedKey = async option => {
    if (derivedKeys[option.id]) {
      setRevealedDerivedKeys(current => ({
        ...current,
        [option.id]: !current[option.id],
      }));
      return;
    }

    const session = sensitiveSessionRef.current;

    try {
      setDerivedKeyError(null);
      setFetchingDerivedKey(option.id);
      const value = await derivePrivateKeyDetails(option);

      if (
        !mountedRef.current ||
        session !== sensitiveSessionRef.current ||
        !sensitiveDataLoadedRef.current
      ) {
        return;
      }

      setDerivedKeys(current => ({...current, [option.id]: value}));
      setRevealedDerivedKeys(current => ({...current, [option.id]: true}));
    } catch {
      if (mountedRef.current && session === sensitiveSessionRef.current) {
        const keyDescription =
          option.id === 'z-address'
            ? option.label
            : `${option.label} private key`;

        setDerivedKeyError({
          id: option.id,
          message: `Could not derive the ${keyDescription.toLowerCase()}. Try again.`,
        });
      }
    } finally {
      if (mountedRef.current) setFetchingDerivedKey(null);
    }
  };

  let footer = null;
  if (data.completeOnBack) {
    footer = <SettingsActionFooter primaryLabel="Done" primaryOnPress={back} />;
  } else if (data.fromDeleteAccount) {
    footer = (
      <SettingsActionFooter
        primaryLabel="Continue"
        primaryOnPress={resetToScreen}
        secondaryLabel="Back"
        secondaryOnPress={back}
      />
    );
  }

  if (!accountIsAllowed) {
    return (
      <>
        {signedOutStatusBar}
        <SettingsScreen
          renderHeader={renderSignedOutHeader}
          safeAreaEdges={signedOutSafeAreaEdges}
          showScrollCue={false}
          footer={
            <SettingsActionFooter primaryLabel="Done" primaryOnPress={back} />
          }>
          <SettingsNotice
            danger
            body="This wallet is not available on the selected network. Return and choose another wallet."
            icon="shield-alert-outline"
            title="Wallet unavailable"
          />
        </SettingsScreen>
      </>
    );
  }

  const secretEntries = Object.entries(secrets);

  return (
    <>
      <RecoverySecretsPrivacyGuard onCaptureChange={handleCaptureChange} />
      {signedOutStatusBar}
      <SettingsScreen
        footer={footer}
        renderHeader={renderSignedOutHeader}
        safeAreaEdges={signedOutSafeAreaEdges}
        testID="settings.displaySeed">
        {captureBlocked ? (
          <SettingsNotice
            danger
            body="Stop screen recording, sharing, or mirroring before viewing recovery information."
            icon="monitor-off"
            title="Screen sharing detected"
          />
        ) : (
          <>
            {account ? (
              <SettingsProfileSummary
                name={account.id}
                walletAvatar={account.walletAvatar}
              />
            ) : null}
            <SettingsNotice
              danger
              body="Anyone who sees these values can control the associated funds. Keep this screen private and store backups offline."
              icon="eye-off-outline"
              title="Private recovery information"
            />
            {secretEntries.length > 0 ? (
              <View style={styles.recoverySecretsSection}>
                <SettingsSection>
                  {secretEntries.map(([key, value]) => (
                    <SecretCard
                      key={key}
                      name={SECRET_NAMES[key]}
                      onShowQr={() =>
                        showSecretQr({
                          title: `${SECRET_NAMES[key]} recovery secret`,
                          value,
                        })
                      }
                      onToggle={() => toggleSecret(key)}
                      revealed={revealedSecrets[key] === true}
                      styles={styles}
                      theme={theme}
                      value={value}
                    />
                  ))}
                </SettingsSection>
              </View>
            ) : requiresAuthentication ? (
              <SettingsNotice
                body="Authenticate to load this wallet's recovery information."
                icon="lock-outline"
                title="Secrets are locked"
              />
            ) : (
              <SettingsNotice
                body="This wallet does not contain stored recovery secrets."
                icon="information-outline"
                title="No recovery secrets"
              />
            )}
            {data.showDerivedKeys && derivedKeyOptions.length > 0 ? (
              <SettingsSection title="Advanced private keys">
                <Text style={styles.advancedDescription}>
                  Derived private keys are usually not needed for wallet
                  recovery.
                </Text>
                {derivedKeyOptions.map(option => (
                  <DerivedKeyRow
                    key={option.id}
                    error={
                      derivedKeyError?.id === option.id &&
                      fetchingDerivedKey == null
                        ? derivedKeyError.message
                        : null
                    }
                    fetching={fetchingDerivedKey === option.id}
                    name={option.label}
                    onShowQr={privateKey =>
                      showSecretQr({
                        title:
                          option.id === 'z-address'
                            ? option.label
                            : `${option.label} private key`,
                        value: privateKey,
                      })
                    }
                    onToggle={() => toggleDerivedKey(option)}
                    revealed={revealedDerivedKeys[option.id] === true}
                    styles={styles}
                    theme={theme}
                    value={derivedKeys[option.id]}
                    valueLabel={
                      option.id === 'z-address'
                        ? 'Spending key'
                        : 'Private key'
                    }
                  />
                ))}
              </SettingsSection>
            ) : null}
          </>
        )}
      </SettingsScreen>
      <RecoverySecretQrSheet
        onClose={() => setQrVisible(false)}
        onClosed={() => setQrSecret(null)}
        secret={qrSecret}
        visible={qrVisible && qrSecret != null}
      />
      {requiresAuthentication && account ? (
        <PasswordCheck
          account={account}
          allowBiometry
          body="Confirm access to this wallet. Recovery secrets stay concealed until you reveal them."
          cancel={back}
          centeredLoadingMessage="Accessing recovery secrets"
          createAttemptToken={() => sensitiveSessionRef.current}
          errorMessage={authenticationError}
          networkLabel={`${networkLabel} wallet`}
          onInputChange={() => setAuthenticationError(null)}
          preferBiometry
          redesigned
          returnSecrets
          showCenteredLoadingMessage={false}
          submit={handleAuthentication}
          submitLabel="Unlock"
          suppressSystemAlerts
          title="View recovery secrets"
          userName={account.id}
          visible={authenticationVisible}
        />
      ) : null}
    </>
  );
};

const SecretCard = ({
  name,
  onShowQr,
  onToggle,
  revealed,
  styles,
  theme,
  value,
}) => {
  const words = revealed && validateMnemonic(value) ? value.split(/\s+/) : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{name}</Text>
        {revealed ? (
          <View style={styles.cardActions}>
            {canShowSecretQr(value) ? (
              <SecretQrAction
                accessibilityLabel={`Show ${name} recovery secret as a QR code`}
                onPress={onShowQr}
              />
            ) : null}
            <CopyAction
              accessibilityLabel={`Copy ${name} recovery secret`}
              copiedAccessibilityLabel={`${name} recovery secret copied`}
              iconSize={18}
              value={value}
            />
          </View>
        ) : null}
      </View>
      {revealed ? (
        words ? (
          <View style={styles.wordGrid}>
            {words.map((word, index) => (
              <View key={`${index}-${word}`} style={styles.wordCell}>
                <Text style={styles.wordNumber}>{index + 1}</Text>
                <Text style={styles.word}>{word}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.secret}>{value}</Text>
        )
      ) : (
        <View
          accessibilityLabel={`${name} concealed`}
          style={styles.concealedValue}>
          <View style={[styles.concealedLine, styles.concealedLineLong]} />
          <View style={[styles.concealedLine, styles.concealedLineShort]} />
        </View>
      )}
      <AppButton
        height={44}
        onPress={onToggle}
        textColor={revealed ? theme.colors.textSecondary : undefined}
        variant="secondary">
        {revealed ? 'Hide' : 'Reveal'}
      </AppButton>
    </View>
  );
};

const DerivedKeyRow = ({
  error,
  fetching,
  name,
  onShowQr,
  onToggle,
  revealed,
  styles,
  theme,
  value,
  valueLabel,
}) => (
  <View style={styles.derivedRow}>
    <View style={styles.derivedHeader}>
      <Text style={styles.derivedTitle}>{name}</Text>
      <TouchableOpacity
        accessibilityLabel={revealed ? `Hide ${name}` : `Reveal ${name}`}
        accessibilityRole="button"
        accessibilityState={{expanded: revealed, busy: fetching}}
        activeOpacity={0.72}
        disabled={fetching}
        hitSlop={8}
        onPress={onToggle}
        style={styles.derivedAction}>
        {fetching ? (
          <ActivityIndicator
            color={theme.colors.textSubtle}
            size="small"
          />
        ) : (
          <MaterialCommunityIcons
            color={theme.colors.textSubtle}
            name={revealed ? 'eye-off-outline' : 'eye-outline'}
            size={20}
          />
        )}
      </TouchableOpacity>
    </View>
    {revealed && value ? (
      <View style={styles.derivedDetails}>
        {value.address ? (
          <TechnicalValueRow
            copyAccessibilityLabel={`Copy address for ${name}`}
            copiedAccessibilityLabel={`Address for ${name} copied`}
            label="Associated address"
            styles={styles}
            value={value.address}
          />
        ) : null}
        {value.privateKey ? (
          <TechnicalValueRow
            copyAccessibilityLabel={`Copy ${name}`}
            copiedAccessibilityLabel={`${name} copied`}
            label={valueLabel}
            onShowQr={
              canShowSecretQr(value.privateKey)
                ? () => onShowQr(value.privateKey)
                : undefined
            }
            qrAccessibilityLabel={`Show ${name} ${valueLabel.toLowerCase()} as a QR code`}
            styles={styles}
            value={value.privateKey}
          />
        ) : null}
      </View>
    ) : null}
    {error ? (
      <Text accessibilityLiveRegion="polite" style={styles.error}>
        {error}
      </Text>
    ) : null}
  </View>
);

const TechnicalValueRow = ({
  copyAccessibilityLabel,
  copiedAccessibilityLabel,
  label,
  onShowQr,
  qrAccessibilityLabel,
  styles,
  value,
}) => (
  <View style={styles.technicalValueBlock}>
    <Text style={styles.technicalValueLabel}>{label}</Text>
    <View style={styles.technicalValueRow}>
      <Text selectable style={styles.technicalValue}>
        {value}
      </Text>
      {onShowQr ? (
        <View style={styles.technicalValueCopy}>
          <SecretQrAction
            accessibilityLabel={qrAccessibilityLabel}
            onPress={onShowQr}
          />
        </View>
      ) : null}
      <CopyAction
        accessibilityLabel={copyAccessibilityLabel}
        copiedAccessibilityLabel={copiedAccessibilityLabel}
        iconSize={18}
        style={styles.technicalValueCopy}
        value={value}
      />
    </View>
  </View>
);

const createStyles = theme =>
  StyleSheet.create({
    recoverySecretsSection: {
      marginTop: theme.spacing.md,
    },
    card: {
      marginBottom: 12,
      padding: 16,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.rounded.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      ...fontStyle('semiBold'),
    },
    concealedValue: {
      minHeight: 58,
      justifyContent: 'center',
      marginBottom: 12,
    },
    concealedLine: {
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.borderStrong,
    },
    concealedLineLong: {
      width: '92%',
    },
    concealedLineShort: {
      width: '68%',
      marginTop: 10,
    },
    secret: {
      marginBottom: 14,
      color: theme.colors.textPrimary,
      fontFamily: MONOSPACE_FONT,
      fontSize: 14,
      lineHeight: 22,
    },
    wordGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    wordCell: {
      width: '31%',
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.rounded.sm,
    },
    wordNumber: {
      width: 20,
      color: theme.colors.textSubtle,
      fontSize: 11,
      ...fontStyle('regular'),
    },
    word: {
      minWidth: 0,
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 13,
      ...fontStyle('semiBold'),
    },
    advancedDescription: {
      marginBottom: 8,
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    derivedRow: {
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    derivedHeader: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    derivedTitle: {
      minWidth: 0,
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 19,
      ...fontStyle('semiBold'),
    },
    derivedAction: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
    derivedDetails: {
      gap: 12,
      paddingTop: 4,
      paddingBottom: 8,
    },
    technicalValueBlock: {
      minWidth: 0,
    },
    technicalValueLabel: {
      marginBottom: 4,
      color: theme.colors.textSubtle,
      fontSize: 11,
      lineHeight: 15,
      ...fontStyle('semiBold'),
    },
    technicalValueRow: {
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    technicalValue: {
      minWidth: 0,
      flex: 1,
      color: theme.colors.textPrimary,
      fontFamily: MONOSPACE_FONT,
      fontSize: 12,
      lineHeight: 18,
    },
    technicalValueCopy: {
      marginTop: -7,
    },
    error: {
      marginTop: 8,
      color: theme.colors.danger,
      fontSize: 12,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
  });

export default DisplaySeed;

/*
  This component's purpose is to present the user with the option
  to log into their accounts, and will only be shown if at least on account
  exists on the mobile device. It uses the user-entered username and password
  to find and decrypt the wallet seed in asyncStorage. When mounted, it clears
  any detecting app update heartbeats located from before, and upon successfull
  login, creates a new update heartbeat interval.
*/

import React, {useEffect, useMemo, useState} from 'react';
import {
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {fontStyle} from '../../globals/fonts';
import {VerusLogo} from '../../images/customIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import BiometricAffordanceIcon from '../../components/BiometricAffordanceIcon';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import WelcomeBackgroundVideo from '../../components/WelcomeBackgroundVideo';
import WalletAvatar from '../../components/WalletAvatar';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import ChooseWalletSheet from './components/ChooseWalletSheet';
import OtherOptionsSheet from './components/OtherOptionsSheet';
import SignedOutNetworkSelector from '../../components/SignedOutNetworkSelector';
import {
  formatLastOpenedLabel,
  normalizeLastOpenedAccountTimestamps,
  sortAccountsByLoginPriority,
} from '../../utils/account/accountActivity';
import {
  filterAccountsForNetwork,
  getWalletNetworkKey,
  getWalletNetworkLabel,
  resolveLegacyWalletPriorityHash,
} from '../../utils/account/accountNetwork';
import UnlockWalletSheet from './components/UnlockWalletSheet';
import {normalizeWalletAvatar} from '../../utils/walletAvatar';
import OnboardingStartSheet from '../Onboard/Welcome/OnboardingStartSheet';
import {
  IMPORT_METHODS,
  normalizeSetupSelection,
  SETUP_PATHS,
} from '../Onboard/onboardingSetupFlow';
import {readDeeplinkFromNfc} from '../../actions/actionDispatchers';
import {useOnboardingTheme} from '../../theme/onboarding';
import {getSupportedBiometryType} from '../../utils/keychain/keychain';
import {
  getTestnetEnvironment,
  TESTNET_ENVIRONMENT_PRIVATE,
} from '../../utils/testnetEnvironment';

const LOGO_ASPECT_RATIO = 2084 / 7305;
const LOGO_TOP_MARGIN = 22;
const WALLET_PREVIEW_LIMIT = 3;
const WALLET_CARD_MIN_HEIGHT = 74;
const WALLET_CARD_SPACING = 10;

const getRecoverySecretCount = account =>
  Object.values(account?.encryptedKeys || {}).filter(value => value != null)
    .length;

const getRecoverySecretCountLabel = account => {
  const count = getRecoverySecretCount(account);
  return `${count} recovery ${count === 1 ? 'secret' : 'secrets'}`;
};

const Login = props => {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const generalWalletSettings = useObjectSelector(
    state => state.settings.generalWalletSettings,
  );
  const [addWalletVisible, setAddWalletVisible] = useState(false);
  const [chooseWalletVisible, setChooseWalletVisible] = useState(false);
  const [otherOptionsVisible, setOtherOptionsVisible] = useState(false);
  const [recoveryWalletsVisible, setRecoveryWalletsVisible] = useState(false);
  const [unlockAccount, setUnlockAccount] = useState(null);
  const [pendingUnlockAccount, setPendingUnlockAccount] = useState(null);
  const [pendingRecoveryAccount, setPendingRecoveryAccount] = useState(null);
  const [supportedBiometryType, setSupportedBiometryType] = useState(null);
  const logoVariant = theme.isDark ? 'monochrome' : 'default';
  const resumePendingDeeplinkId =
    props.route?.params?.resumePendingDeeplinkId || null;
  const claimRequestIsTestnet = props.route?.params?.claimRequestIsTestnet;
  const openSetupSheet = props.route?.params?.openSetupSheet === true;

  const selectedNetworkKey = getWalletNetworkKey(props.testProfile === true);
  const selectedNetworkLabel = getWalletNetworkLabel(selectedNetworkKey);
  const networkAccounts = useMemo(
    () => filterAccountsForNetwork(accounts, selectedNetworkKey),
    [accounts, selectedNetworkKey],
  );
  const lastOpenedAccountTimestamps = useMemo(
    () =>
      normalizeLastOpenedAccountTimestamps(
        generalWalletSettings.lastOpenedAccountTimestamps,
      ),
    [generalWalletSettings.lastOpenedAccountTimestamps],
  );
  const legacyPriorityAccountHash = useMemo(
    () =>
      resolveLegacyWalletPriorityHash(
        networkAccounts,
        generalWalletSettings,
        selectedNetworkKey,
        lastOpenedAccountTimestamps,
      ),
    [
      generalWalletSettings,
      lastOpenedAccountTimestamps,
      networkAccounts,
      selectedNetworkKey,
    ],
  );
  const sortedDisplayNetworkAccounts = useMemo(
    () =>
      sortAccountsByLoginPriority(
        networkAccounts,
        legacyPriorityAccountHash,
        lastOpenedAccountTimestamps,
      ),
    [
      lastOpenedAccountTimestamps,
      legacyPriorityAccountHash,
      networkAccounts,
    ],
  );
  const recoveryAccounts = useMemo(
    () =>
      sortedDisplayNetworkAccounts.filter(
        account => getRecoverySecretCount(account) > 0,
      ),
    [sortedDisplayNetworkAccounts],
  );

  useEffect(() => {
    setAddWalletVisible(false);
    setChooseWalletVisible(false);
    setOtherOptionsVisible(false);
    setRecoveryWalletsVisible(false);
    setUnlockAccount(null);
    setPendingUnlockAccount(null);
    setPendingRecoveryAccount(null);
  }, [selectedNetworkKey]);

  useEffect(() => {
    if (!openSetupSheet) return;

    if (typeof claimRequestIsTestnet === 'boolean') {
      props.setTestProfile(claimRequestIsTestnet);
    }
    setAddWalletVisible(true);
  }, [
    claimRequestIsTestnet,
    openSetupSheet,
    props.setTestProfile,
    selectedNetworkKey,
  ]);

  useEffect(() => {
    let active = true;

    getSupportedBiometryType()
      .then(result => {
        if (active) {
          setSupportedBiometryType(result);
        }
      })
      .catch(() => {
        if (active) {
          setSupportedBiometryType(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSetupSelection = selection =>
    props.navigation.navigate('CreateProfile', {
      ...normalizeSetupSelection(selection),
      resumePendingDeeplinkId,
    });

  const handleRevokeRecover = () => {
    props.navigation.navigate('RevokeRecover', {
      networkKey: selectedNetworkKey,
    });
  };

  const openRecoverySecrets = account => {
    props.navigation.navigate('DisplaySeed', {
      accountHash: account.accountHash,
      networkKey: selectedNetworkKey,
      data: {
        completeOnBack: true,
        keyDerivationVersion: account.keyDerivationVersion,
        showDerivedKeys: true,
      },
    });
  };

  const handleRecoverSeed = () => {
    if (recoveryAccounts.length === 1) {
      openRecoverySecrets(recoveryAccounts[0]);
    } else if (recoveryAccounts.length > 1) {
      setRecoveryWalletsVisible(true);
    }
  };

  const handleProvisioningRequests = () => {
    props.navigation.navigate('ProvisioningDeeplinks');
  };

  // A wallet-backup card leads to the NFC restore instead.
  const handleClaimFromNfc = () =>
    readDeeplinkFromNfc({
      onWalletBackupDetected: () =>
        handleSetupSelection({
          setupPath: SETUP_PATHS.IMPORT,
          importMethod: IMPORT_METHODS.NFC,
        }),
    });

  const handleChooseWalletAccount = account => {
    setChooseWalletVisible(false);
    setPendingUnlockAccount(account);
  };

  const handleChooseWalletClosed = () => {
    if (pendingUnlockAccount != null) {
      setUnlockAccount(pendingUnlockAccount);
      setPendingUnlockAccount(null);
    }
  };

  const handleRecoveryWalletAccount = account => {
    setRecoveryWalletsVisible(false);
    setPendingRecoveryAccount(account);
  };

  const handleRecoveryWalletClosed = () => {
    if (pendingRecoveryAccount != null) {
      openRecoverySecrets(pendingRecoveryAccount);
      setPendingRecoveryAccount(null);
    }
  };

  const logoWidth = width * 0.3;

  const renderWalletContent = () => {
    if (sortedDisplayNetworkAccounts.length > 1) {
      return (
        <LoginWalletList
          accounts={sortedDisplayNetworkAccounts}
          lastOpenedAccountTimestamps={lastOpenedAccountTimestamps}
          supportedBiometryType={supportedBiometryType}
          onSelectAccount={setUnlockAccount}
          onOpenAllWallets={() => setChooseWalletVisible(true)}
          styles={styles}
          theme={theme}
        />
      );
    }

    if (sortedDisplayNetworkAccounts.length === 1) {
      return (
        <LoginWalletCard
          account={sortedDisplayNetworkAccounts[0]}
          lastOpenedAt={
            lastOpenedAccountTimestamps[
              sortedDisplayNetworkAccounts[0].accountHash
            ]
          }
          supportedBiometryType={supportedBiometryType}
          onPress={() => setUnlockAccount(sortedDisplayNetworkAccounts[0])}
          styles={styles}
          theme={theme}
        />
      );
    }

    return (
      <View style={styles.summaryBlock}>
        <Text style={styles.summaryTitle}>
          {`No ${selectedNetworkLabel.toLowerCase()} wallets yet`}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <WelcomeBackgroundVideo paused={unlockAccount != null} />
      <View
        style={[
          styles.logoContainer,
          {
            paddingTop: insets.top + LOGO_TOP_MARGIN,
          },
        ]}>
        <VerusLogo
          width={logoWidth}
          height={logoWidth * LOGO_ASPECT_RATIO}
          variant={logoVariant}
        />
        <SignedOutNetworkSelector
          testProfile={props.testProfile}
          setTestProfile={props.setTestProfile}
          showLabel
          privateTestnet={
            __DEV__ && getTestnetEnvironment() === TESTNET_ENVIRONMENT_PRIVATE
          }
        />
      </View>
      <View style={styles.content}>{renderWalletContent()}</View>
      <SafeBottomActionStack gap={10}>
        <AppButton
          onPress={() => setAddWalletVisible(true)}
          variant={theme.isDark ? 'tonal' : 'secondary'}
          height={56}
          buttonColor={theme.isDark ? undefined : 'rgba(255, 255, 255, 0.72)'}>
          {'Add a new wallet'}
        </AppButton>
        <AppButton
          onPress={() => setOtherOptionsVisible(true)}
          variant="text"
          height={52}
          textColor={
            theme.isDark ? theme.colors.textPrimary : theme.colors.onPrimary
          }>
          {'Other options'}
        </AppButton>
      </SafeBottomActionStack>
      <OnboardingStartSheet
        visible={addWalletVisible}
        onClose={() => setAddWalletVisible(false)}
        onSelectSetup={handleSetupSelection}
      />
      <OtherOptionsSheet
        visible={otherOptionsVisible}
        onClose={() => setOtherOptionsVisible(false)}
        onClaimFromNfc={resumePendingDeeplinkId ? undefined : handleClaimFromNfc}
        onRecoverProfileSeed={handleRecoverSeed}
        onRevokeRecoverVerusId={handleRevokeRecover}
        onProvisioningRequests={handleProvisioningRequests}
        walletCount={recoveryAccounts.length}
      />
      <ChooseWalletSheet
        visible={chooseWalletVisible}
        onClose={() => setChooseWalletVisible(false)}
        onClosed={handleChooseWalletClosed}
        accounts={sortedDisplayNetworkAccounts}
        lastOpenedAccountTimestamps={lastOpenedAccountTimestamps}
        supportedBiometryType={supportedBiometryType}
        onSelectAccount={handleChooseWalletAccount}
      />
      <ChooseWalletSheet
        visible={recoveryWalletsVisible}
        onClose={() => setRecoveryWalletsVisible(false)}
        onClosed={handleRecoveryWalletClosed}
        accounts={recoveryAccounts}
        getAccountMeta={getRecoverySecretCountLabel}
        supportedBiometryType={supportedBiometryType}
        onSelectAccount={handleRecoveryWalletAccount}
        title="Wallet recovery secrets"
      />
      <UnlockWalletSheet
        visible={unlockAccount != null}
        account={unlockAccount}
        onClose={() => setUnlockAccount(null)}
      />
    </View>
  );
};

const LoginWalletList = ({
  accounts,
  lastOpenedAccountTimestamps,
  supportedBiometryType,
  onSelectAccount,
  onOpenAllWallets,
  styles,
  theme,
}) => {
  const previewAccounts = accounts.slice(0, WALLET_PREVIEW_LIMIT);
  const hiddenWalletCount = Math.max(
    0,
    accounts.length - previewAccounts.length,
  );

  return (
    <View style={styles.walletPreviewList}>
      {previewAccounts.map((account, index) => {
        const isLastPreviewCard =
          hiddenWalletCount === 0 && index === previewAccounts.length - 1;

        return (
          <LoginWalletCard
            key={account.accountHash || account.id}
            account={account}
            lastOpenedAt={lastOpenedAccountTimestamps[account.accountHash]}
            supportedBiometryType={supportedBiometryType}
            onPress={() => onSelectAccount(account)}
            style={isLastPreviewCard && styles.walletCardLast}
            styles={styles}
            theme={theme}
          />
        );
      })}
      {hiddenWalletCount > 0 && (
        <ViewAllWalletsButton
          walletCount={accounts.length}
          onPress={onOpenAllWallets}
          styles={styles}
        />
      )}
    </View>
  );
};

const ViewAllWalletsButton = ({walletCount, onPress, styles}) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={0.78}
    onPress={onPress}
    style={styles.viewAllWalletsButton}>
    <Text numberOfLines={1} style={styles.viewAllWalletsText}>
      {`View all ${walletCount === 1 ? 'wallet' : 'wallets'} (${walletCount})`}
    </Text>
  </TouchableOpacity>
);

const LoginWalletCard = ({
  account,
  lastOpenedAt,
  supportedBiometryType,
  onPress,
  style,
  styles,
  theme,
}) => {
  const walletAvatar = normalizeWalletAvatar(account.walletAvatar);
  const lastOpenedLabel = formatLastOpenedLabel(lastOpenedAt);
  const showBiometryAffordance =
    account.biometry &&
    supportedBiometryType != null &&
    supportedBiometryType.biometry;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.walletCard, style]}>
      <View style={styles.walletCardIcon}>
        {walletAvatar ? (
          <WalletAvatar
            walletAvatar={walletAvatar}
            size={36}
            emojiSize={19}
          />
        ) : (
          <MaterialCommunityIcons
            name="wallet-outline"
            size={26}
            color={theme.colors.textSubtle}
          />
        )}
      </View>
      <View style={styles.walletCardText}>
        <Text numberOfLines={1} style={styles.walletCardName}>
          {account.id}
        </Text>
        <Text numberOfLines={1} style={styles.walletCardMeta}>
          {lastOpenedLabel}
        </Text>
      </View>
      {showBiometryAffordance ? (
        <BiometricAffordanceIcon
          supportedBiometryType={supportedBiometryType}
          color={theme.colors.textSecondary}
          size={22}
        />
      ) : null}
    </TouchableOpacity>
  );
};

const createStyles = theme => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundVideo,
  },
  logoContainer: {
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    minHeight: 0,
  },
  walletPreviewList: {
    width: '100%',
  },
  walletCard: {
    minHeight: WALLET_CARD_MIN_HEIGHT,
    borderRadius: 18,
    backgroundColor: theme.colors.walletCard,
    borderWidth: theme.isDark ? StyleSheet.hairlineWidth : 0,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: WALLET_CARD_SPACING,
  },
  walletCardLast: {
    marginBottom: 0,
  },
  walletCardIcon: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  walletCardText: {
    flex: 1,
    paddingRight: 10,
  },
  walletCardName: {
    color: theme.colors.textPrimary,
    fontSize: 19,
    ...fontStyle('semiBold'),
  },
  walletCardMeta: {
    marginTop: 3,
    color: theme.colors.textSubtle,
    fontSize: 12,
    ...fontStyle('regular'),
  },
  viewAllWalletsButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  viewAllWalletsText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    ...fontStyle('semiBold'),
  },
  summaryBlock: {
    alignItems: 'center',
  },
  summaryTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    textAlign: 'center',
    ...fontStyle('semiBold'),
  },
});

export default Login;

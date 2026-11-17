import React from "react";
import {
  LogBox,
  AppState,
  Platform,
  View,
  Linking
} from "react-native";
import Modal from './components/Modal'
import RootStackScreens from './containers/RootStack/RootStackScreens';
import { 
  fetchUsers, 
  loadServerVersions,
  loadCachedHeaders,
  loadEthTxReceipts,
  initSettings,
  fetchActiveCoins,
  requestSeedData,
  initNotifications,
  initInstanceKey,
  setBalanceVisibility
} from './actions/actionCreators';
import {
  initCache,
  clearCachedVersions,
  updateActiveCoinList,
  checkAndSetVersion,
  purgeUnusedCoins,
  clearCachedVrpcResponses
} from './utils/asyncStore/asyncStore'
import { connect } from 'react-redux';
import { ENABLE_VERUS_IDENTITIES } from '../env/index'
import AlertModal from "./components/Alert";
import { activateKeyboardListener, updateDeeplinkUrl } from "./actions/actionDispatchers";
import { Portal } from 'react-native-paper';
import SendModal from "./components/SendModal/SendModal";
import { NavigationContainer } from "@react-navigation/native";
import LoadingModal from "./components/LoadingModal/LoadingModal";
import WalletSetupOverlay from "./components/WalletSetup/WalletSetupOverlay";
import NfcTapHost from "./components/NfcTap/NfcTapHost";
import { isNfcSessionActive } from "./utils/walletBackup/walletBackupNfc";
import { isBiometricPromptOpen } from "./utils/keychain/biometricPrompt";
import { CoinDirectory } from "./utils/CoinData/CoinDirectory";
import { removeInactiveCurrencyDefinitions } from "./utils/asyncStore/currencyDefinitionStorage";
import { removeInactiveContractDefinitions } from "./utils/asyncStore/contractDefinitionStorage";
import { initInstance } from "./utils/auth/authBox";
import { SecureStorage } from "./utils/keychain/secureStore";
import StartupCover from "./components/StartupCover";
import WalletUnlockCoordinator from "./components/WalletUnlockCoordinator";
import {useOnboardingTheme} from './theme/onboarding';
import {createNavigationTheme} from './theme/app/navigationTheme';
import { recoverPasswordMigration } from "./utils/asyncStore/authDataStorage";
import { readBalanceVisibility } from "./utils/asyncStore/balancePrivacyStorage";

const ThemedNavigationContainer = ({children}) => {
  const theme = useOnboardingTheme();

  return (
    <NavigationContainer theme={createNavigationTheme(theme)}>
      {children}
    </NavigationContainer>
  );
};

export class VerusMobile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      securityCover: false,
      startupError: null
    };
  }

  // TODO: Implement own lifecycle manager to account for 
  // android "inactivity"
  _handleAppStateChange(nextAppState) {
    if (Platform.OS === 'ios') {
      if (nextAppState === "active" && this.state.securityCover == true) {
        this.setSecurityCover(false)
      } else if (nextAppState === "inactive" && this.state.securityCover == false) {
        this.handleInactivity()
      } else if (
        nextAppState === "background" &&
        this.state.securityCover == false &&
        this.props.sendModal.type == null
      ) {
        // Leaving the app while a sheet kept the screen uncovered.
        this.setSecurityCover(true)
      }
    }
  };

  handleInactivity() {
    // The iOS NFC scan sheet and the app's own Face ID or Touch ID sheet make
    // the app inactive. The screen behind them must stay visible, so it is not
    // covered.
    if (
      this.props.sendModal.type == null &&
      !isNfcSessionActive() &&
      !isBiometricPromptOpen()
    ) {
      this.setSecurityCover(true)
    }
    
    // TODO: Add lock on app re-entry
    // if (this.props.signedIn) {
    //   this.props.dispatch(signOut())
    // }
  }

  setSecurityCover(cover) {
    this.setState({
      securityCover: cover
    })
  }

  setLoading(loading) {
    this.setState({
      loading
    })
  }

  async initializeStorage(secureStorageInitialization = SecureStorage.initializeWithKeychain()) {
    try {
      // Load secret credential from keychain to decrypt data storage, and if loaded successfully, 
      // cycle secret credential with a newly generated one
      await secureStorageInitialization;

      // Resolve any reset interrupted between its journaled storage writes
      // before consumers read password-protected records.
      await recoverPasswordMigration();

      // Clear cached electrum versions, TODO: Figure out what should trigger a cache clear on startup of server 
      //versions. (The action that triggers it should indicate a server upgraded it's 
      //version)
      await clearCachedVersions();

      // Initialize app settings
      const settingsAction = await initSettings();
      this.props.dispatch(settingsAction);

      // RootStack stays on LoadingStack until initialization finishes, so the
      // saved privacy choice reaches Redux before signed-in balances mount.
      this.props.dispatch(setBalanceVisibility(await readBalanceVisibility()));

      this.props.dispatch(initInstanceKey(await initInstance()));

      CoinDirectory.setTestnetEnvironment(settingsAction.settings.generalWalletSettings ? settingsAction.settings.generalWalletSettings.testnetEnvironment : null);
      CoinDirectory.setVrpcOverrides(settingsAction.settings.generalWalletSettings ? settingsAction.settings.generalWalletSettings.vrpcOverrides : {});

      await clearCachedVrpcResponses()

      const usedCoins = await purgeUnusedCoins()
      await removeInactiveCurrencyDefinitions(usedCoins)
      await removeInactiveContractDefinitions(usedCoins)

      await CoinDirectory.populateEthereumContractDefinitionsFromStorage()
      await CoinDirectory.populatePbaasCurrencyDefinitionsFromStorage()

      await initCache()

      // Checks and saves current app version to storage
      await checkAndSetVersion()

      // Update coin list to new style introduced in earlier version
      await updateActiveCoinList()

      // Load in users from storage
      this.props.dispatch(await fetchUsers())

      // Load in in-app notification from storage
      this.props.dispatch(await initNotifications())

      // Load in active coins from storage
      this.props.dispatch(await fetchActiveCoins())

      // Load electrum server versions from cache in storage
      await loadServerVersions(this.props.dispatch)

      // Load cached block headers from block header cache
      await loadCachedHeaders(this.props.dispatch)

      // Load cached eth tx receipts from eth tx receipt cache
      await loadEthTxReceipts(this.props.dispatch)

      this.setLoading(false)
    } catch (err) {
      console.error(err)

      // StartupCover shows the error.
      this.setState({
        startupError: err.message || 'Startup failed'
      })

      this.setLoading(false)
    }
  }

  componentDidMount() {
    LogBox.ignoreLogs(['EventEmitter']);

    activateKeyboardListener()

    AppState.addEventListener("change", (nextAppState) => this._handleAppStateChange(nextAppState));

    const secureStorageInitialization = SecureStorage.initializeWithKeychain();
    this.initializeStorage(secureStorageInitialization);

    // Handle deeplinks
    this.linkingSubscription = Linking.addEventListener("url", async ({ url }) => {
      try {
        await secureStorageInitialization;
      } catch (e) {
        return;
      }

      updateDeeplinkUrl(url)
    })

    const updateUrlState = async () => {
      try {
        await secureStorageInitialization;
      } catch (e) {
        return;
      }

      const url = await Linking.getInitialURL()

      updateDeeplinkUrl(url)
    }

    updateUrlState()

    if (ENABLE_VERUS_IDENTITIES) {
      this.props.dispatch(requestSeedData());
    }
  }

  componentWillUnmount() {
    // A remount (for example a development reload) must not add a second
    // link listener, or each link opens twice.
    this.linkingSubscription?.remove();
  }

  render() {    
    return (
      <View style={{ flex: 1 }}>
        <Portal.Host>
          <AlertModal />
          {this.props.sendModal.type != null && <SendModal />}
          {this.props.loadingModal.visible && <LoadingModal />}
          <NfcTapHost />
          <WalletUnlockCoordinator />
          <ThemedNavigationContainer>
            <RootStackScreens
              hasAccount={this.props.accountsLength > 0}
              loading={this.state.loading}
              signedIn={this.props.signedIn}
            />
          </ThemedNavigationContainer>
          <WalletSetupOverlay />
        </Portal.Host>
        <Modal
          animationType={this.state.loading ? "fade" : "none"}
          transparent={false}
          visible={
            this.state.securityCover ||
            this.state.loading ||
            this.state.startupError != null
          }
        >
          <StartupCover
            loading={this.state.loading}
            securityCover={this.state.securityCover}
            startupError={this.state.startupError}
          />
        </Modal>
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    accountsLength: state.authentication.accounts.length,
    signedIn: state.authentication.signedIn,
    sendModal: state.sendModal,
    loadingModal: state.loadingModal
  }
};

export default connect(mapStateToProps)(VerusMobile);

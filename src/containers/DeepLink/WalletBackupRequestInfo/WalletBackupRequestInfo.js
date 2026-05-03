import React, {useEffect, useMemo, useState} from 'react';
import {
  Keyboard,
  Platform,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {ActivityIndicator, Button, Checkbox, Text, TextInput} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  closeLoadingModal,
  openLoadingModal,
} from '../../../actions/actionDispatchers';
import {canEnableBiometry} from '../../../actions/actions/channels/dlight/dispatchers/AlertManager';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {openAuthenticateUserModal} from '../../../actions/actions/sendModal/dispatchers/sendModal';
import Colors from '../../../globals/colors';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import scorePassword from '../../../utils/auth/scorePassword';
import {requestSeeds} from '../../../utils/auth/authBox';
import {
  MIN_PASS_LENGTH,
  MIN_PASS_SCORE,
  PASS_SCORE_LIMIT,
} from '../../../utils/constants/constants';
import {ELECTRUM} from '../../../utils/constants/intervalConstants';
import {SEND_MODAL_USER_ALLOWLIST} from '../../../utils/constants/sendModal';
import {getKey} from '../../../utils/keyGenerator/keyGenerator';
import {getSupportedBiometryType} from '../../../utils/keychain/keychain';
import {createProfileFromSeed} from '../../../utils/profile/createProfileFromSeed';
import {
  buildWalletBackupOrdinal,
  isValid24WordBip39Mnemonic,
} from '../../../utils/walletBackup/walletBackup';
import {
  getWalletBackupCompletionKey,
  markWalletBackupRequestComplete,
} from '../../../utils/walletBackup/walletBackupCompletionStorage';
import {
  beginWalletBackupNfcSession,
  endWalletBackupNfcSession,
  writeWalletBackupToNfc,
} from '../../../utils/walletBackup/walletBackupNfc';

const fieldWidth = 300;

const isTestProfile = account => {
  return Object.keys(account?.testnetOverrides || {}).length > 0;
};

const passwordStrengthDetails = password => {
  if (!password) {
    return {
      score: 0,
      text: 'strength',
      color: Colors.tertiaryColor,
    };
  }

  const score = scorePassword(password, MIN_PASS_LENGTH, PASS_SCORE_LIMIT);

  if (score < MIN_PASS_SCORE) {
    return {score, text: 'weak', color: Colors.warningButtonColor};
  } else if (score < PASS_SCORE_LIMIT - ((PASS_SCORE_LIMIT - MIN_PASS_SCORE) / 2)) {
    return {score, text: 'mediocre', color: Colors.infoButtonColor};
  } else if (score < PASS_SCORE_LIMIT) {
    return {score, text: 'good', color: Colors.primaryColor};
  } else {
    return {score, text: 'excellent', color: Colors.verusGreenColor};
  }
};

const validatePasswordPair = (password, confirmPassword) => {
  const strength = passwordStrengthDetails(password);

  if (!password) {
    return 'Please enter a password.';
  } else if (strength.score < MIN_PASS_SCORE) {
    return 'Please enter a stronger password.';
  } else if (password !== confirmPassword) {
    return 'Password and confirm password do not match.';
  }

  return null;
};

const WalletBackupRequestInfo = props => {
  const {
    backupCompletionKey,
    cancel = () => {},
    detailIndex,
    next = async () => {},
    profileBackup = false,
    request,
    response,
  } = props;

  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const bottomNavigationInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 24 : 0,
  );
  const footerBottomOffset = 24 + bottomNavigationInset;
  const signedIn = useSelector(state => state.authentication.signedIn);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);

  const activeAccountIsTestnet = activeAccount ? isTestProfile(activeAccount) : false;
  const requestIsTestnet = profileBackup
    ? activeAccountIsTestnet
    : request != null && request.isTestnet();
  const activeAccountMatchesRequest =
    profileBackup
      ? signedIn && activeAccount != null
      : signedIn &&
        activeAccount &&
        activeAccountIsTestnet === requestIsTestnet;

  const matchingAccounts = useMemo(() => {
    return accounts.filter(account => isTestProfile(account) === requestIsTestnet);
  }, [accounts, requestIsTestnet]);

  const [profileName, setProfileName] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState('');
  const [showCreateProfile, setShowCreateProfile] = useState(matchingAccounts.length === 0);
  const [useBiometrics, setUseBiometrics] = useState(false);
  const [supportedBiometryType, setSupportedBiometryType] = useState(null);

  const [encryptBackup, setEncryptBackup] = useState(true);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [nfcStatus, setNfcStatus] = useState(null);

  const profilePasswordDetails = passwordStrengthDetails(profilePassword);
  const backupPasswordDetails = passwordStrengthDetails(backupPassword);

  useEffect(() => {
    let mounted = true;

    getSupportedBiometryType()
      .then(biometryType => {
        if (mounted) setSupportedBiometryType(biometryType);
      })
      .catch(e => {
        console.warn(e);
        if (mounted) {
          setSupportedBiometryType({
            display_name: 'None',
            biometry: false,
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const openLogin = () => {
    if (matchingAccounts.length === 0) {
      createAlert(
        'No profile found',
        `No ${requestIsTestnet ? 'testnet' : 'mainnet'} profile is available for this request.`,
      );
      return;
    }

    openAuthenticateUserModal({
      [SEND_MODAL_USER_ALLOWLIST]: matchingAccounts,
    });
  };

  const validateProfileForm = () => {
    if (!profileName || profileName.length < 1) {
      return 'Please enter a profile name.';
    } else if (profileName.length > 50) {
      return 'Please enter a profile name shorter than 50 characters.';
    } else if (accounts.find(account => account.id === profileName)) {
      return 'A profile with this name already exists.';
    }

    return validatePasswordPair(profilePassword, profilePasswordConfirm);
  };

  const createProfile = async () => {
    const error = validateProfileForm();

    if (error) {
      createAlert('Error', error);
      return;
    }

    Keyboard.dismiss();
    openLoadingModal('Setting up your new profile...');

    try {
      const seed = await getKey(256);

      await createProfileFromSeed({
        profileName,
        password: profilePassword,
        seed,
        accounts,
        activeCoinList,
        dispatch,
        testProfile: requestIsTestnet,
        includeDlightSeed: true,
        useBiometrics,
      });

      createAlert(
        'Profile created',
        `Your '${profileName}' profile has been created and is ready for wallet backup.`,
      );
    } catch (e) {
      console.error(e);
      createAlert('Error', e.message);
    } finally {
      closeLoadingModal();
    }
  };

  const toggleUseBiometrics = async () => {
    if (useBiometrics) {
      setUseBiometrics(false);
    } else if (await canEnableBiometry()) {
      setUseBiometrics(true);
    }
  };

  const confirmUnencryptedBackup = async () => {
    if (encryptBackup) return true;

    return createAlert(
      'Unencrypted Backup',
      'This will write your wallet seed backup without a backup password. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolveAlert(false),
        },
        {
          text: 'Continue',
          onPress: () => resolveAlert(true),
        },
      ],
      {cancelable: false},
    );
  };

  const writeBackup = async () => {
    Keyboard.dismiss();

    if (!activeAccountMatchesRequest) {
      createAlert('Error', 'Please login to a matching profile before continuing.');
      return;
    }

    if (encryptBackup) {
      const passwordError = validatePasswordPair(
        backupPassword,
        backupPasswordConfirm,
      );

      if (passwordError) {
        createAlert('Error', passwordError);
        return;
      }
    }

    if (!(await confirmUnencryptedBackup())) return;

    setLoading(true);
    setNfcStatus('Preparing secure backup. Do not tap the card yet.');
    let nfcSessionPreRegistered = false;
    let nfcWriterStarted = false;

    try {
      nfcSessionPreRegistered = await beginWalletBackupNfcSession({
        onStatus: setNfcStatus,
      });

      setNfcStatus('Preparing secure backup. Keep the card nearby, but wait for the tap prompt.');

      const seeds = await requestSeeds();
      const mnemonic = seeds[ELECTRUM];

      if (!isValid24WordBip39Mnemonic(mnemonic)) {
        throw new Error('The active profile primary seed is not a valid 24 word BIP39 mnemonic.');
      }

      const walletBackup = await buildWalletBackupOrdinal({
        mnemonic,
        password: encryptBackup ? backupPassword : null,
      });

      nfcWriterStarted = true;
      await writeWalletBackupToNfc(walletBackup, {
        onStatus: setNfcStatus,
        sessionPreRegistered: nfcSessionPreRegistered,
      });

      const completionKey =
        backupCompletionKey ||
        getWalletBackupCompletionKey(
          request,
          detailIndex,
          activeAccount.accountHash,
        );

      await markWalletBackupRequestComplete(completionKey);
      await next(response, [detailIndex]);
    } catch (e) {
      console.error(e);
      createAlert(
        'Backup Failed',
        `${e.message || 'Unable to write wallet backup to NFC card.'}\n\nYour seed was not backed up by this request. You can back up your seed later from the app settings.`,
      );
    } finally {
      if (nfcSessionPreRegistered && !nfcWriterStarted) {
        await endWalletBackupNfcSession();
      }

      setNfcStatus(null);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: Colors.secondaryColor}}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}>
          <MaterialCommunityIcons
            name="credit-card-wireless"
            size={64}
            color={Colors.primaryColor}
            style={{marginBottom: 24}}
          />
          <ActivityIndicator
            animating
            color={Colors.primaryColor}
            size="large"
            style={{marginVertical: 8}}
          />
          {nfcStatus && (
            <Text
              style={{
                color: Colors.verusDarkGray,
                fontSize: 24,
                fontWeight: 'bold',
                lineHeight: 32,
                marginTop: 24,
                textAlign: 'center',
              }}>
              {nfcStatus}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={{flex: 1, backgroundColor: Colors.secondaryColor}}>
        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={{
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingTop: 32,
            paddingBottom: 120,
          }}>
          <View style={{alignItems: 'center', marginBottom: 24}}>
            <MaterialCommunityIcons
              name="credit-card-wireless"
              size={48}
              color={Colors.primaryColor}
            />
            <Text
              style={{
                color: Colors.primaryColor,
                fontSize: 26,
                fontWeight: 'bold',
                marginTop: 12,
                textAlign: 'center',
              }}>
              {!activeAccountMatchesRequest && showCreateProfile
                ? 'Create & Backup Wallet'
                : 'Backup Wallet'}
            </Text>
            <Text
              style={{
                color: Colors.verusDarkGray,
                fontSize: 14,
                marginTop: 8,
                textAlign: 'center',
                width: fieldWidth,
              }}>
              {requestIsTestnet
                ? profileBackup
                  ? 'This will create a testnet wallet backup for the current profile on an NFC card.'
                  : 'This request will create a testnet wallet backup on an NFC card.'
                : profileBackup
                ? 'This will create a wallet backup for the current profile on an NFC card.'
                : 'This request will create a wallet backup on an NFC card.'}
            </Text>
          </View>

          {!activeAccountMatchesRequest ? (
            <View style={{width: fieldWidth}}>
              {matchingAccounts.length > 0 && (
                <Button
                  mode="contained"
                  onPress={openLogin}
                  style={{marginBottom: 12}}
                  labelStyle={{fontWeight: 'bold'}}>
                  Login to Profile
                </Button>
              )}

              {matchingAccounts.length > 0 && (
                <Button
                  mode="text"
                  onPress={() => setShowCreateProfile(!showCreateProfile)}
                  textColor={Colors.primaryColor}
                  style={{marginBottom: 12}}>
                  {showCreateProfile ? 'Hide New Profile' : 'Create New Profile'}
                </Button>
              )}

              {showCreateProfile && (
                <View>
                  <TextInput
                    returnKeyType="done"
                    label="Profile name"
                    value={profileName}
                    mode="outlined"
                    dense
                    style={{marginBottom: 8}}
                    onChangeText={setProfileName}
                  />
                  <TextInput
                    returnKeyType="done"
                    label="Profile password"
                    value={profilePassword}
                    mode="outlined"
                    dense
                    style={{marginBottom: 8}}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setProfilePassword}
                    right={
                      <TextInput.Affix
                        text={profilePasswordDetails.text}
                        textStyle={{color: profilePasswordDetails.color}}
                      />
                    }
                  />
                  <TextInput
                    returnKeyType="done"
                    label="Confirm profile password"
                    value={profilePasswordConfirm}
                    mode="outlined"
                    dense
                    style={{marginBottom: 12}}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setProfilePasswordConfirm}
                  />
                  {supportedBiometryType && supportedBiometryType.biometry && (
                    <Checkbox.Item
                      color={Colors.primaryColor}
                      label={`Enable ${supportedBiometryType.display_name} login`}
                      labelStyle={{fontSize: 14}}
                      status={useBiometrics ? 'checked' : 'unchecked'}
                      onPress={toggleUseBiometrics}
                      mode="android"
                      position="leading"
                      style={{paddingLeft: 0}}
                    />
                  )}
                  <Button
                    mode="contained"
                    onPress={createProfile}
                    labelStyle={{fontWeight: 'bold'}}
                    disabled={
                      !profileName ||
                      !profilePassword ||
                      !profilePasswordConfirm
                    }>
                    Create Profile
                  </Button>
                </View>
              )}
            </View>
          ) : (
            <View style={{width: fieldWidth}}>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: Colors.lightGrey,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                }}>
                <Text style={{fontWeight: 'bold', color: Colors.verusDarkGray}}>
                  {activeAccount.id}
                </Text>
                <Text style={{color: Colors.verusDarkGray, marginTop: 4}}>
                  {requestIsTestnet ? 'Testnet profile' : 'Mainnet profile'}
                </Text>
              </View>

              <Checkbox.Item
                color={Colors.primaryColor}
                label="Encrypt backup with password"
                labelStyle={{fontSize: 14}}
                status={encryptBackup ? 'checked' : 'unchecked'}
                onPress={() => setEncryptBackup(!encryptBackup)}
                mode="android"
                position="leading"
                style={{paddingLeft: 0}}
              />

              {encryptBackup && (
                <View>
                  <TextInput
                    returnKeyType="done"
                    label="Backup password"
                    value={backupPassword}
                    mode="outlined"
                    dense
                    style={{marginBottom: 8}}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setBackupPassword}
                    right={
                      <TextInput.Affix
                        text={backupPasswordDetails.text}
                        textStyle={{color: backupPasswordDetails.color}}
                      />
                    }
                  />
                  <TextInput
                    returnKeyType="done"
                    label="Confirm backup password"
                    value={backupPasswordConfirm}
                    mode="outlined"
                    dense
                    style={{marginBottom: 12}}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setBackupPasswordConfirm}
                  />
                </View>
              )}

              <Button
                mode="contained"
                onPress={writeBackup}
                labelStyle={{fontWeight: 'bold'}}
                disabled={
                  encryptBackup && (!backupPassword || !backupPasswordConfirm)
                }>
                Write NFC Backup
              </Button>
            </View>
          )}
        </ScrollView>

        <View
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: footerBottomOffset,
            flexDirection: 'row',
            justifyContent: 'center',
          }}>
          <TouchableOpacity onPress={cancel} style={{padding: 12}}>
            <Text style={{color: Colors.warningButtonColor, fontWeight: 'bold'}}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default WalletBackupRequestInfo;

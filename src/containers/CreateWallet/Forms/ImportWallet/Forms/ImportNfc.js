import React, {useState} from 'react';
import {
  Keyboard,
  SafeAreaView,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {ActivityIndicator, Button, Text, TextInput} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {createAlert} from '../../../../../actions/actions/alert/dispatchers/alert';
import Colors from '../../../../../globals/colors';
import {
  isValid24WordBip39Mnemonic,
  walletBackupOrdinalToMnemonic,
  walletBackupRequiresPassword,
} from '../../../../../utils/walletBackup/walletBackup';
import {
  beginWalletBackupNfcSession,
  endWalletBackupNfcSession,
  readWalletBackupFromNfc,
} from '../../../../../utils/walletBackup/walletBackupNfc';
import {
  activateKeepAwake,
  deactivateKeepAwake,
} from '../../../../../utils/keepAwake/keepAwake';

const fieldWidth = 300;

export default function ImportNfc({
  navigation,
  setImportedSeed,
  onComplete,
}) {
  const [loading, setLoading] = useState(false);
  const [nfcStatus, setNfcStatus] = useState(null);
  const [walletBackupOrdinal, setWalletBackupOrdinal] = useState(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

  const waitForSpinnerFrame = () => {
    return new Promise(resolve => setTimeout(resolve, 0));
  };

  const finishImport = mnemonic => {
    setImportedSeed(mnemonic);
    onComplete(mnemonic, {
      useSeedAsZ: isValid24WordBip39Mnemonic(mnemonic),
    });
  };

  const importWalletBackup = async (
    backupOrdinal,
    password,
    showDecrypting = false,
  ) => {
    if (showDecrypting) {
      setDecrypting(true);
      await waitForSpinnerFrame();
    }

    let didFinishImport = false;
    let keepAwakeActive = false;

    try {
      activateKeepAwake();
      keepAwakeActive = true;

      await waitForSpinnerFrame();

      const mnemonic = walletBackupOrdinalToMnemonic({
        walletBackupOrdinal: backupOrdinal,
        password,
      });

      if (showDecrypting) {
        setDecrypting(false);
      }

      didFinishImport = true;
      finishImport(mnemonic);
    } catch (e) {
      createAlert('Error', e.message || 'Unable to import NFC wallet backup.');
    } finally {
      if (keepAwakeActive) {
        deactivateKeepAwake();
      }

      if (showDecrypting && !didFinishImport) {
        setDecrypting(false);
      }
    }
  };

  const scanCard = async () => {
    Keyboard.dismiss();
    setLoading(true);
    setNfcStatus('Preparing NFC scanner. Do not tap the card yet.');

    let nfcSessionPreRegistered = false;
    let nfcReaderStarted = false;
    let scannedBackupOrdinal = null;

    try {
      nfcSessionPreRegistered = await beginWalletBackupNfcSession({
        onStatus: setNfcStatus,
      });

      nfcReaderStarted = true;
      scannedBackupOrdinal = await readWalletBackupFromNfc({
        onStatus: setNfcStatus,
        sessionPreRegistered: nfcSessionPreRegistered,
      });
    } catch (e) {
      console.error(e);
      createAlert(
        'NFC Import Failed',
        e.message || 'Unable to read wallet backup from NFC card.',
      );
    } finally {
      if (nfcSessionPreRegistered && !nfcReaderStarted) {
        await endWalletBackupNfcSession();
      }

      setNfcStatus(null);
      setLoading(false);
    }

    if (scannedBackupOrdinal == null) return;

    if (walletBackupRequiresPassword(scannedBackupOrdinal)) {
      setWalletBackupOrdinal(scannedBackupOrdinal);
      setBackupPassword('');
      return;
    }

    await importWalletBackup(scannedBackupOrdinal, null);
  };

  const importEncryptedBackup = async () => {
    Keyboard.dismiss();
    await importWalletBackup(walletBackupOrdinal, backupPassword, true);
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
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}>
          <MaterialCommunityIcons
            name="credit-card-wireless"
            size={56}
            color={Colors.primaryColor}
            style={{marginBottom: 16}}
          />
          <Text
            style={{
              color: Colors.primaryColor,
              fontSize: 28,
              fontWeight: 'bold',
              marginBottom: 24,
              textAlign: 'center',
            }}>
            {'Import using NFC'}
          </Text>

          {walletBackupOrdinal != null ? (
            <View style={{width: fieldWidth}}>
              <Text
                style={{
                  color: Colors.verusDarkGray,
                  fontSize: 15,
                  lineHeight: 22,
                  marginBottom: 16,
                  textAlign: 'center',
                }}>
                {'This NFC wallet backup is encrypted.'}
              </Text>
              <TextInput
                returnKeyType="done"
                label="Backup password"
                value={backupPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                disabled={decrypting}
                onChangeText={setBackupPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={{marginBottom: 12}}
              />
              <Button
                mode="contained"
                onPress={importEncryptedBackup}
                loading={decrypting}
                disabled={decrypting || backupPassword.length === 0}
                labelStyle={{fontWeight: 'bold'}}
                style={{marginBottom: 8}}>
                {'Decrypt and Import'}
              </Button>
              <Button
                mode="text"
                textColor={Colors.primaryColor}
                disabled={decrypting}
                onPress={() => {
                  setWalletBackupOrdinal(null);
                  setBackupPassword('');
                }}>
                {'Scan Different Card'}
              </Button>
            </View>
          ) : (
            <View style={{width: fieldWidth}}>
              <Text
                style={{
                  color: Colors.verusDarkGray,
                  fontSize: 15,
                  lineHeight: 22,
                  marginBottom: 24,
                  textAlign: 'center',
                }}>
                {'Scan a Verus NFC wallet backup card to import its 24-word seed.'}
              </Text>
              <Button
                mode="contained"
                onPress={scanCard}
                icon="credit-card-wireless"
                labelStyle={{fontWeight: 'bold'}}
                contentStyle={{height: 48}}>
                {'Scan NFC Backup'}
              </Button>
            </View>
          )}
        </View>

        <View
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 32,
            flexDirection: 'row',
            justifyContent: 'center',
          }}>
          <Button
            mode="text"
            textColor={Colors.primaryColor}
            disabled={decrypting}
            onPress={() => navigation.goBack()}>
            {'Back'}
          </Button>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

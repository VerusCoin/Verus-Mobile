import React, {useState} from 'react';
import {
  View,
  Dimensions,
  TouchableWithoutFeedback,
  TextInput as NativeTextInput,
  Platform,
  Keyboard,
} from 'react-native';
import {Text, Button, Paragraph, TextInput} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { createAlert } from '../../../../../actions/actions/alert/dispatchers/alert';
import TallButton from '../../../../../components/LargerButton';
import ScanSeed from '../../../../../components/ScanSeed';
import Colors from '../../../../../globals/colors';

export default function ImportText({
  qr,
  setImportedSeed,
  importedSeed,
  onComplete
}) {
  const {height} = Dimensions.get('window');

  const isKeyboardActive = useSelector(state => state.keyboard.active);

  const [showSeed, setShowSeed] = useState(false);
  const [scanQr, setScanQr] = useState(qr === true);

  const handleScan = (codes) => {
    setScanQr(false)
    setImportedSeed(codes[0])
  }

  const handleImport = () => {
    if (!importedSeed || importedSeed.length < 1) {
      createAlert("Error", "Please enter a seed, WIF key or spending key.");
    } else onComplete()
  }

  return scanQr ? (
    <ScanSeed
      cancel={() => setScanQr(false)}
      onScan={(codes) => handleScan(codes)}
    />
  ) : (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          alignItems: 'center',
          backgroundColor: Colors.secondaryColor,
        }}>
        <View
          style={{
            alignItems: 'center',
            position: 'absolute',
            top: height / 2 - 250,
          }}>
          <Text
            style={{
              textAlign: 'center',
              color: Colors.primaryColor,
              fontSize: 28,
              fontWeight: 'bold',
            }}>
            {'Import Seed/Key'}
          </Text>
          <Paragraph
            style={{
              textAlign: 'center',
              width: '75%',
              marginTop: 24,
              width: 280,
            }}>
            {
              "Enter your key or mnemonic seed into the text box below, then press 'import'."
            }
          </Paragraph>
          <View style={Styles.wideCenterBlock}>
            <TextInput
              onChangeText={text => setImportedSeed(text)}
              label={'Seed/Key'}
              underlineColor={Colors.primaryColor}
              selectionColor={Colors.primaryColor}
              value={importedSeed}
              mode="outlined"
              multiline={!showSeed || Platform.OS === 'ios' ? false : true}
              render={props => (
                <NativeTextInput
                  secureTextEntry={!showSeed}
                  autoCapitalize={'none'}
                  autoCorrect={false}
                  autoComplete="off"
                  {...props}
                />
              )}
            />
          </View>
          <Button
            textColor={Colors.primaryColor}
            onPress={() => setShowSeed(!showSeed)}
            disabled={importedSeed == null || importedSeed.length == 0}>{`${
            showSeed ? 'Hide' : 'Show'
          } Seed`}</Button>
          <Button
            textColor={Colors.primaryColor}
            style={{marginTop: 8}}
            onPress={() => setScanQr(true)}>
            {'Scan QR'}
          </Button>
        </View>
        {!isKeyboardActive && <TallButton
          onPress={handleImport}
          mode="contained"
          labelStyle={{fontWeight: 'bold'}}
          disabled={importedSeed == null || importedSeed.length == 0}
          style={{
            position: 'absolute',
            bottom: 80,
            width: 280,
          }}>
          {'Import'}
        </TallButton>}
      </View>
    </TouchableWithoutFeedback>
  );
}

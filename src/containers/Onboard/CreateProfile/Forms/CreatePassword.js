import React, {useState} from 'react';
import {
  View,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import {Text, Paragraph, Button, TextInput} from 'react-native-paper';
import {useSelector} from 'react-redux';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';
import TallButton from '../../../../components/LargerButton';
import Colors from '../../../../globals/colors';
import { getSupportedBiometryType } from '../../../../utils/keychain/keychain';

export default function CreatePassword({password, setPassword, navigation}) {
  const {height} = Dimensions.get('window');

  const [firstBox, setFirstBox] = useState('');
  const [secondBox, setSecondBox] = useState('');
  
  const isKeyboardActive = useSelector(state => state.keyboard.active);
  const darkMode = useSelector(state=>state.settings.darkModeState)

  const validate = () => {
    const res = {valid: false, message: ''};

    if (!firstBox || firstBox.length < 1) {
      res.message = 'Please enter a password.';
      return res;
    } else if (firstBox.length < 5) {
      res.message = 'Please enter a password longer than 5 characters.';
      return res;
    } else if (firstBox !== secondBox) {
      res.message = 'Password and confirm password do not match.';
      return res;
    }

    res.valid = true;
    return res;
  };

  const next = async () => {
    const {valid, message} = validate();

    if (!valid) {
      createAlert('Error', message);
    } else {
      setPassword(firstBox);

      if ((await getSupportedBiometryType()).biometry) {
        navigation.navigate('UseBiometrics');
      } else {
        navigation.navigate('CreateWallet');
      }
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          alignItems: 'center',
          backgroundColor: darkMode?Colors.darkModeColor:Colors.secondaryColor
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
            {'Create Password'}
          </Text>
          <Paragraph
            style={{
              textAlign: 'center',
              width: '75%',
              marginTop: 24,
              width: 280,
              color:darkMode?Colors.secondaryColor:'black'
            }}>
            {
              'Create a secure password for your profile. Your password will be used to encrypt your wallet.'
            }
          </Paragraph>
          <TextInput
            returnKeyType="done"
            label="Create password"
            value={firstBox}
            mode={'outlined'}
            theme={{
              colors: {
                text: darkMode
                  ? Colors.secondaryColor
                  : Colors.ultraLightGrey,
                placeholder: darkMode
                  ? Colors.primaryColor
                  : Colors.verusDarkGray,
              },
            }}
            style={{
              width: '75%',
              marginTop: 24,
              width: 280,
              backgroundColor:darkMode
              ? Colors.verusDarkModeForm
              : Colors.tertiaryColor,
            }}
            placeholder="Enter password"
            dense={true}
            onChangeText={text => setFirstBox(text)}
            autoCapitalize={'none'}
            autoCorrect={false}
            secureTextEntry={true}
          />
          <TextInput
            returnKeyType="done"
            label="Confirm password"
            value={secondBox}
            mode={'outlined'}
            theme={{
              colors: {
                text: darkMode
                  ? Colors.secondaryColor
                  : Colors.ultraLightGrey,
                placeholder: darkMode
                  ? Colors.primaryColor
                  : Colors.verusDarkGray,
              },
            }}
            style={{
              width: '75%',
              marginTop: 8,
              width: 280,
              backgroundColor:darkMode
              ? Colors.verusDarkModeForm
              : Colors.tertiaryColor,
            }}
            placeholder="Enter password"
            dense={true}
            onChangeText={text => setSecondBox(text)}
            autoCapitalize={'none'}
            autoCorrect={false}
            secureTextEntry={true}
          />
        </View>
        {!isKeyboardActive && (
          <TallButton
            onPress={next}
            mode="contained"
            labelStyle={{fontWeight: 'bold'}}
            disabled={firstBox.length == 0 || secondBox.length == 0}
            style={{
              position: 'absolute',
              bottom: 80,
              width: 280,
            }}>
            {'Next'}
          </TallButton>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

import React, {useEffect, useState} from 'react';
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
import scorePassword from '../../../../utils/auth/scorePassword';
import { MIN_PASS_LENGTH, MIN_PASS_SCORE, PASS_SCORE_LIMIT, SMALL_DEVICE_HEGHT } from '../../../../utils/constants/constants';

export default function CreatePassword({password, setPassword, navigation}) {
  const {height} = Dimensions.get('window');

  const [firstBox, setFirstBox] = useState('');
  const [secondBox, setSecondBox] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [passwordAffixDetails, setPasswordAffixDetails] = useState({
    text: "strength",
    color: Colors.tertiaryColor
  });
  
  const isKeyboardActive = useSelector(state => state.keyboard.active);

  useEffect(() => {
    calculatePasswordAffix()
  }, [firstBox])

  const calculatePasswordAffix = () => {
    if (!firstBox) {
      setPasswordAffixDetails({
        text: "strength",
        color: Colors.tertiaryColor
      })
    } else {
      const passScore = scorePassword(firstBox, MIN_PASS_LENGTH, PASS_SCORE_LIMIT);
      setPasswordStrength(passScore);

      if (passScore < MIN_PASS_SCORE) {
        setPasswordAffixDetails({
          text: "weak",
          color: Colors.warningButtonColor
        })
      } else if (passScore < PASS_SCORE_LIMIT - ((PASS_SCORE_LIMIT - MIN_PASS_SCORE) / 2)) {
        setPasswordAffixDetails({
          text: "mediocre",
          color: Colors.infoButtonColor
        })
      } else if (passScore < PASS_SCORE_LIMIT) {
        setPasswordAffixDetails({
          text: "good",
          color: Colors.primaryColor
        })
      } else {
        setPasswordAffixDetails({
          text: "excellent",
          color: Colors.verusGreenColor
        })
      }
    }
  }

  const validate = () => {
    const res = {valid: false, message: ''};

    if (!firstBox || firstBox.length < 1) {
      res.message = 'Please enter a password.';
      return res;
    } else if (passwordStrength < MIN_PASS_SCORE) {
      res.message = 'Please enter a stronger password.';
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
          backgroundColor: Colors.secondaryColor,
        }}>
        <View
          style={{
            alignItems: 'center',
            position: 'absolute',
            top: height < SMALL_DEVICE_HEGHT ? 60 : height / 2 - 250,
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
            style={{
              width: '75%',
              marginTop: 24,
              width: 280,
            }}
            placeholder="Enter password"
            dense={true}
            onChangeText={text => setFirstBox(text)}
            autoCapitalize={'none'}
            autoCorrect={false}
            secureTextEntry={true}
            right={<TextInput.Affix text={passwordAffixDetails.text} textStyle={{color: passwordAffixDetails.color}}/>}
          />
          <TextInput
            returnKeyType="done"
            label="Confirm password"
            value={secondBox}
            mode={'outlined'}
            style={{
              width: '75%',
              marginTop: 8,
              width: 280,
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

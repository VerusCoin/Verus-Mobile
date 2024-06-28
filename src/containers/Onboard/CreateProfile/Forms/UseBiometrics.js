import React from 'react';
import {View, Dimensions, TouchableWithoutFeedback, Keyboard} from 'react-native';
import {Text, Paragraph, Button, TextInput} from 'react-native-paper';
import Colors from '../../../../globals/colors';
import { canEnableBiometry } from '../../../../actions/actions/channels/dlight/dispatchers/AlertManager';
import { Biometrics } from '../../../../images/customIcons';
import TallButton from '../../../../components/LargerButton';
import { SMALL_DEVICE_HEGHT } from '../../../../utils/constants/constants';

export default function UseBiometrics({ setUseBiometrics, navigation }) {
  const {height} = Dimensions.get('window');

  const next = async (useBiometrics) => {
    if (useBiometrics && await canEnableBiometry()) {
      setUseBiometrics(useBiometrics)
      navigation.navigate("CreateWallet")
    } else if (!useBiometrics) {
      setUseBiometrics(useBiometrics)
      navigation.navigate("CreateWallet")
    }
  }

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        flex: 1,
        alignItems: 'center',
        backgroundColor: Colors.secondaryColor
      }}>
      {height >= SMALL_DEVICE_HEGHT && <Biometrics
        width={180}
        style={{ top: height / 2 - 260, position: 'absolute' }}
      />}
      <View
        style={{
          alignItems: 'center',
          position: 'absolute',
          top: height / 2 - 130,
        }}>
        <Text
          style={{
            textAlign: 'center',
            color: Colors.primaryColor,
            fontSize: 28,
            fontWeight: 'bold',
          }}>
          {"Biometric Authentication"}
        </Text>
        <Paragraph
          style={{
            textAlign: 'center',
            width: '60%',
            marginTop: 24
          }}>
          {"Sign into your profile with biometric authentication. You can always change this later."}
        </Paragraph>
      </View>
      <TallButton
        onPress={() => next(true)}
        mode="contained"
        labelStyle={{fontWeight: "bold"}}
        style={{
          position: "absolute",
          bottom: 96,
          width: 280
        }}>
        {"Enable"}
      </TallButton>
      <TallButton
        onPress={() => next(false)}
        mode="text"
        labelStyle={{fontWeight: "bold", color: Colors.primaryColor}}
        style={{
          position: "absolute",
          bottom: 40,
          width: 280
        }}>
        {"Skip"}
      </TallButton>
    </View>
  );
}

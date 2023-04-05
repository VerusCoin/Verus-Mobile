import React from 'react';
import {View, Dimensions} from 'react-native';
import {Text, Paragraph} from 'react-native-paper';
import TallButton from '../../../components/LargerButton';
import Colors from '../../../globals/colors';
import {VerusLogo} from '../../../images/customIcons';
import styles from '../../../styles';

export default function LandingScreen(props) {
  const { height } = Dimensions.get('window');

  return (
    <View
      style={{
        backgroundColor: Colors.secondaryColor,
        ...styles.focalCenter,
      }}>
      <VerusLogo width={180} height={'15%'} style={{ top: 100, position: 'absolute' }}/>
      <View style={{alignItems: 'center', position: "absolute", top: height / 2 - 40}}>
        <Text
          style={{
            textAlign: 'center',
            color: Colors.primaryColor,
            fontSize: 28,
            fontWeight: 'bold',
          }}>
          {'Welcome to Verus'}
        </Text>
        <Text
          style={{
            textAlign: 'center',
            color: Colors.primaryColor,
            fontSize: 20
          }}>
          {'Truth and Privacy for All'}
        </Text>
        <Paragraph
          style={{
            textAlign: 'center',
            width: "60%",
            marginTop: 24
          }}>
          {'The mobile wallet for Verus and its ecosystem.\nHere you can easily and securely send, receive and store VRSC, BTC, ETH and more.'}
        </Paragraph>
      </View>
      <TallButton
        onPress={() => props.navigation.navigate("WelcomeSlider")}
        mode="contained"
        labelStyle={{fontWeight: "bold"}}
        style={{
          position: "absolute",
          bottom: 80,
          width: 280
        }}>
        {"Get Started"}
      </TallButton>
    </View>
  );
}

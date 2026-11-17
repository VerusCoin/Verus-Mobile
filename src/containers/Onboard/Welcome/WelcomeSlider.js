import React from 'react';
import {View, Dimensions} from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import {Text, Paragraph, Button} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import TallButton from '../../../components/LargerButton';
import Colors from '../../../globals/colors';
import {
  EncryptLocally,
  MyProfile,
  MyWalletLight,
  VerusLogo,
} from '../../../images/customIcons';
import { useState } from 'react';
import { useEffect } from 'react';
import { SMALL_DEVICE_HEGHT } from '../../../utils/constants/constants';

export default function WelcomeSlider(props) {
  const {height} = Dimensions.get('window');

  const [showIcons, setShowIcons] = useState(height > SMALL_DEVICE_HEGHT ? true : false);

  useEffect(() => {
    if (height > SMALL_DEVICE_HEGHT) {
      setShowIcons(true);
    } else {
      setShowIcons(false);
    }
  })

  const renderSlide = (key, Graphic, text, title) => {
    return (
      <View
        style={{
          backgroundColor: Colors.primaryColor,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          alignItems: 'center',
        }}
        key={key}>
        <Graphic
          width={128}
          style={{top: height / 2 - 260, position: 'absolute'}}
        />
        <View
          style={{
            alignItems: 'center',
            position: 'absolute',
            top: height / 2 - 110,
          }}>
          <Text
            style={{
              textAlign: 'center',
              color: Colors.secondaryColor,
              fontSize: 28,
              fontWeight: 'bold',
            }}>
            {title}
          </Text>
          <Paragraph
            style={{
              textAlign: 'center',
              width: '75%',
              marginTop: 24,
              width: 280,
              color: Colors.secondaryColor,
            }}>
            {text}
          </Paragraph>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={{
        backgroundColor: Colors.primaryColor,
        flex: 1,
      }}>
      <View
        style={{
          backgroundColor: Colors.secondaryColor,
          position: "absolute",
          top: 0,
          width: "100%",
          height: "50%",
          zIndex: -100
        }}
      />
      {showIcons ? <View
        style={{
          height: 90,
          backgroundColor: Colors.secondaryColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <VerusLogo width={180} height={'50%'} style={{}} />
      </View> : null}
      <AppIntroSlider
        showSkipButton={true}
        renderItem={({item, index}) =>
          renderSlide(index, item.graphic, item.text, item.title)
        }
        bottomButton={true}
        onDone={() => props.navigation.navigate('CreateProfile')}
        data={[
          {
            key: 0,
            graphic: showIcons ? MyProfile : () => null,
            title: 'My Profile',
            text: 'Lets start with the creation of a personal, locally stored profile.',
          },
          {
            key: 1,
            graphic: showIcons ? EncryptLocally : () => null,
            title: 'Encrypt Locally',
            text: 'Your profile stores and encrypts your wallet addresses locally.',
          },
          {
            key: 2,
            graphic: showIcons ? MyWalletLight : () => null,
            title: 'My Wallet',
            text: 'Every profile is linked to a wallet. You can have multiple profiles containing different wallets.',
          },
        ]}
        renderNextButton={() => {
          return (
            <TallButton
              mode="text"
              labelStyle={{fontWeight: 'bold', color: Colors.primaryColor}}
              style={{
                alignSelf: 'center',
                width: 280,
                backgroundColor: Colors.secondaryColor,
              }}>
              {'Next'}
            </TallButton>
          );
        }}
        renderDoneButton={() => {
          return (
            <TallButton
              mode="text"
              labelStyle={{fontWeight: 'bold', color: Colors.primaryColor}}
              style={{
                alignSelf: 'center',
                width: 280,
                backgroundColor: Colors.secondaryColor,
              }}>
              {'Create my profile'}
            </TallButton>
          );
        }}
        renderSkipButton={() => {
          return (
            <TallButton
              mode="text"
              labelStyle={{fontWeight: 'bold', color: Colors.secondaryColor}}
              style={{
                alignSelf: 'center',
                width: 280,
              }}>
              {'Skip'}
            </TallButton>
          );
        }}
      />
    </SafeAreaView>
  );
}

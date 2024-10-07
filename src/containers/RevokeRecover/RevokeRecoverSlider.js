import React from 'react';
import {View, Dimensions} from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import {Text, Paragraph, Button} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import TallButton from '../../components/LargerButton';
import Colors from '../../globals/colors';
import {
  VerusIdLogo
} from '../../images/customIcons';
import { useState } from 'react';
import { useEffect } from 'react';
import { SMALL_DEVICE_HEGHT } from '../../utils/constants/constants';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NavigationActions } from '@react-navigation/compat';

export default function RevokeRecoverSlider({ navigation, setIsRecovery }) {
  const {height} = Dimensions.get('window');

  const [showIcons, setShowIcons] = useState(height > SMALL_DEVICE_HEGHT ? true : false);

  useEffect(() => {
    if (height > SMALL_DEVICE_HEGHT) {
      setShowIcons(true);
    } else {
      setShowIcons(false);
    }
  })

  const goToImportWallet = (recovery = false) => {
    setIsRecovery(recovery);
    navigation.navigate('ImportWallet');
  }

  const renderSlide = (key, icon, text, title) => {
    return (
      <View
        style={{
          backgroundColor: Colors.secondaryColor,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          alignItems: 'center',
        }}
        key={key}>
        {height >= SMALL_DEVICE_HEGHT && <VerusIdLogo width={'55%'} height={'10%'} style={{top: height / 2 - 260, position: 'absolute'}} />}
        <View
          style={{
            alignItems: 'center',
            position: 'absolute',
            top: height / 2 - 110,
          }}>
          <Text
            style={{
              textAlign: 'center',
              color: Colors.quaternaryColor,
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
              color: Colors.quaternaryColor,
            }}>
            {text}
          </Paragraph>
          {key === 1 && 
            <View style={{ flexDirection: "row", width: "70%", marginTop: 24, justifyContent: "space-between" }}>
              <Button
                mode="text"
                onPress={() => goToImportWallet(false)}
                labelStyle={{ fontWeight: 'bold', color: Colors.primaryColor }}
                style={{
                  alignSelf: 'center',
                  backgroundColor: Colors.secondaryColor,
                }}>
                {'Revoke'}
              </Button>
              <Button
                mode="text"
                onPress={() => goToImportWallet(true)}
                labelStyle={{ fontWeight: 'bold', color: Colors.primaryColor }}
                style={{
                  alignSelf: 'center',
                  backgroundColor: Colors.secondaryColor,
                }}>
                {'Recover'}
              </Button>
            </View>
          }
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={{
        backgroundColor: Colors.secondaryColor,
        flex: 1,
      }}>
      <AppIntroSlider
        showSkipButton={true}
        showPrevButton={false}
        showDoneButton={false}
        renderItem={({item, index}) =>
          renderSlide(index, item.icon, item.text, item.title)
        }
        bottomButton={true}
        onSkip={() => navigation.dispatch(NavigationActions.back())}
        data={[
          {
            key: 0,
            title: 'Revocation/Recovery',
            text: 'Here you can revoke access to a lost or compromised VerusID, or recover a revoked VerusID with a new set of keys.',
          },
          {
            key: 2,
            title: '',
            text: 'To revoke, you will need access to the seed of your revocation VerusID. To recover, you will need access to the seed of your recovery VerusID.',
          },
        ]}
        renderNextButton={() => {
          return (
            <TallButton
              mode="outlined"
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
        renderSkipButton={() => {
          return (
            <TallButton
              mode="text"
              labelStyle={{fontWeight: 'bold', color: Colors.warningButtonColor}}
              style={{
                alignSelf: 'center',
                width: 280,
              }}>
              {'Cancel'}
            </TallButton>
          );
        }}
      />
    </SafeAreaView>
  );
}

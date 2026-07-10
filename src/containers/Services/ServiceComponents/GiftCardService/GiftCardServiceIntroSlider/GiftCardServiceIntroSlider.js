import React from 'react';
import {Alert, KeyboardAvoidingView, ScrollView} from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import {Button, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../../../../globals/colors';

const GiftCardServiceIntroSlider = ({onDone}) => {
  const finishIntro = () => {
    Alert.alert(
      'Treat Gift Cards as Secrets',
      'Gift cards are spendable secrets. Anyone with access to one can redeem its funds now, and can also redeem funds added to it later.',
      [
        {
          text: 'I Understand',
          onPress: onDone,
        },
      ],
    );
  };

  const renderSlide = ({item}) => (
    <ScrollView
      contentContainerStyle={{
        alignItems: 'center',
        backgroundColor: Colors.primaryColor,
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
      }}
      style={{
        backgroundColor: Colors.primaryColor,
        flex: 1,
      }}>
      <MaterialCommunityIcons
        name={item.icon}
        size={76}
        color={Colors.secondaryColor}
        style={{marginBottom: 24}}
      />
      <Text
        style={{
          color: Colors.secondaryColor,
          fontSize: 22,
          fontWeight: 'bold',
          marginBottom: 12,
          textAlign: 'center',
        }}>
        {item.title}
      </Text>
      <Text
        style={{
          color: Colors.secondaryColor,
          fontSize: 15,
          lineHeight: 22,
          textAlign: 'center',
        }}>
        {item.body}
      </Text>
      {item.action && (
        <Button
          mode="contained"
          buttonColor={Colors.secondaryColor}
          textColor={Colors.primaryColor}
          style={{marginTop: 24}}
          onPress={finishIntro}>
          Open Gift Cards
        </Button>
      )}
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView style={{flex: 1}} behavior="height">
      <AppIntroSlider
        showSkipButton
        renderItem={renderSlide}
        onSkip={finishIntro}
        onDone={finishIntro}
        data={[
          {
            key: 'share',
            icon: 'gift-outline',
            title: 'Gift Cards',
            body:
              'Create a spendable key that can hold funds and VerusIDs for another wallet to redeem.',
          },
          {
            key: 'secure',
            icon: 'shield-key-outline',
            title: 'Share Carefully',
            body:
              'The gift card link is spendable. Add a claim password when you want a second secret before redemption.',
          },
          {
            key: 'start',
            icon: 'qrcode-scan',
            title: 'Ready to Create',
            body:
              'Fund a card from your wallet, show it as a QR code, copy the link, or write it to an NFC card.',
            action: true,
          },
        ]}
      />
    </KeyboardAvoidingView>
  );
};

export default GiftCardServiceIntroSlider;

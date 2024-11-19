import React, { useState } from 'react';
import {View, Dimensions, TouchableOpacity} from 'react-native';
import {Text, Paragraph, Button, IconButton} from 'react-native-paper';
import { createAlert, resolveAlert } from '../../../actions/actions/alert/dispatchers/alert';
import TallButton from '../../../components/LargerButton';
import Colors from '../../../globals/colors';
import { MyWallet } from '../../../images/customIcons';
import { getKey } from '../../../utils/keyGenerator/keyGenerator';
import { SMALL_DEVICE_HEGHT } from '../../../utils/constants/constants';

export default function WalletIntro({ navigation, setNewSeed, setTestProfile, testProfile }) {
  const {height} = Dimensions.get('window');

  const [loading, setLoading] = useState(false)
  const [iconPressCount, setIconPressCount] = useState(0);

  const canEnableTestmode = () => {
    return createAlert(
      "Make this a test profile?",
      "Creating a test profile will set this profile to use testnet currencies.\n\nALL TESTNET COINS/CURRENCIES HAVE NO VALUE AND WILL DISAPPEAR WHENEVER THEIR NETWORK IS RESET.\n\nAre you sure you would like to create this profile as a test profile?",
      [
        {
          text: "No",
          onPress: () => resolveAlert(false),
          style: "cancel",
        },
        { text: "Yes", onPress: () => resolveAlert(true) },
      ],
      {
        cancelable: false,
      }
    )
  }

  const tryEnableTest = async () => {
    if (await canEnableTestmode()) {
      setTestProfile(true);
      createAlert(
        'Testnet profile set',
        'This profile will be created as a test profile, and will use testnet currencies.',
      );
    }
  }

  const disableTest = () => {
    setTestProfile(false);
    createAlert(
      'Mainnet profile set',
      'This profile will be created as a mainnet profile, and will use mainnet currencies.',
    );
  };

  const handleIconPress = () => {
    const newCount = iconPressCount + 1;
    setIconPressCount(newCount);

    if (newCount === 7 && !testProfile) {
      setIconPressCount(0);
      tryEnableTest()
    }
  };

  const createNewWallet = async function(cb = () => {}) {
    try {
      const newSeed = await getKey(256);

      setNewSeed(newSeed)
      navigation.navigate("CreateSeed")
      cb()
    } catch(e) {
      createAlert("Error", "Error generating seed words.")
      console.warn(e)
      cb()
    }
  }

  const createNewWalletSync = function() {
    setLoading(true)
    createNewWallet(() => setLoading(false))
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
      <TouchableOpacity
        onPress={testProfile ? disableTest : tryEnableTest}
        style={{
          alignItems: 'center',
          position: 'absolute',
          top: 20,
          right: 20
        }}
      >
        <IconButton icon={testProfile ? "test-tube-off" : "test-tube"} iconColor={Colors.verusDarkGray} />
      </TouchableOpacity>
      {height >= SMALL_DEVICE_HEGHT && <MyWallet
        width={180}
        onPress={handleIconPress}
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
          {testProfile ? "Create My Test Wallet" : "Create My Wallet"}
        </Text>
        <Paragraph
          style={{
            textAlign: 'center',
            width: '60%',
            marginTop: 24
          }}>
          {"Create a wallet, or import a seed or private key you already control."}
        </Paragraph>
      </View>
      <TallButton
        onPress={() => createNewWalletSync()}
        mode="contained"
        labelStyle={{fontWeight: "bold"}}
        disabled={loading}
        style={{
          position: "absolute",
          bottom: 96,
          width: 280
        }}>
        {"New Wallet"}
      </TallButton>
      <TallButton
        onPress={() => navigation.navigate("ImportWallet")}
        mode="text"
        labelStyle={{fontWeight: "bold", color: Colors.primaryColor}}
        disabled={loading}
        style={{
          position: "absolute",
          bottom: 40,
          width: 280
        }}>
        {"Import Wallet"}
      </TallButton>
    </View>
  );
}

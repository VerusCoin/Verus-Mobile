import React, { useState } from 'react';
import {View, Dimensions} from 'react-native';
import {Text, Paragraph, Button} from 'react-native-paper';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import TallButton from '../../../components/LargerButton';
import Colors from '../../../globals/colors';
import { MyWallet } from '../../../images/customIcons';
import { getKey } from '../../../utils/keyGenerator/keyGenerator';

export default function WalletIntro({ navigation, setNewSeed }) {
  const {height} = Dimensions.get('window');

  const [loading, setLoading] = useState(false)

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
      <MyWallet
        width={180}
        style={{top: height / 2 - 260, position: 'absolute'}}
      />
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
          {"Create My Wallet"}
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

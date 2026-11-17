import React, {useState} from 'react';
import {View, Dimensions} from 'react-native';
import {Text, Paragraph} from 'react-native-paper';
import TallButton from '../../../components/LargerButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import Colors from '../../../globals/colors';
import { MyWallet } from '../../../images/customIcons';
import { SMALL_DEVICE_HEGHT } from '../../../utils/constants/constants';

export default function WalletIntro({navigation, ensureNewSeed, testProfile}) {
  const {height} = Dimensions.get('window');

  const [loading, setLoading] = useState(false)

  const createNewWallet = async function() {
    setLoading(true);

    const seed = await ensureNewSeed();

    setLoading(false);

    if (seed) {
      navigation.navigate("CreateSeed", {seed})
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
      {height >= SMALL_DEVICE_HEGHT && <MyWallet
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
          {testProfile ? "Create My Test Wallet" : "Create My Wallet"}
        </Text>
        <Paragraph
          style={{
            textAlign: 'center',
            width: '60%',
            marginTop: 24
          }}>
          {
            "Create a wallet, or import a Secret Recovery Phrase or private key you already control."
          }
        </Paragraph>
      </View>
      <SafeBottomActionStack
        bottomSpacing={40}
        gap={6}
        horizontalSpacing={0}
        style={{
          position: 'absolute',
          bottom: 0,
          alignItems: 'center',
        }}>
        <TallButton
          onPress={createNewWallet}
          mode="contained"
          labelStyle={{fontWeight: "bold"}}
          disabled={loading}
          style={{
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
            width: 280
          }}>
          {"Import Wallet"}
        </TallButton>
      </SafeBottomActionStack>
    </View>
  );
}

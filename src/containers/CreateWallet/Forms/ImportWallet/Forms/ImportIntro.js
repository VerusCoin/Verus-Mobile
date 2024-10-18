import React from 'react';
import {View, Dimensions} from 'react-native';
import {Text, Button} from 'react-native-paper';
import {TwentyFourWordIcon, ScanQrIcon, EnterKeyIcon} from '../../../../../images/customIcons';
import Colors from '../../../../../globals/colors';

export default function ImportIntro({navigation, label}) {
  const {height} = Dimensions.get('window');

  return (
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
          top: height / 2 - 220
        }}>
        <Text
          style={{
            textAlign: 'center',
            color: Colors.primaryColor,
            fontSize: 28,
            fontWeight: 'bold',
            marginBottom: 48,
            maxWidth: "90%"
          }}>
          {label ? label : 'Import Wallet'}
        </Text>
        <Button
          icon={({ size, color }) => (
            <TwentyFourWordIcon
              width={size + 10}
              height={size + 10}
            />
          )}
          labelStyle={{
            fontSize: 16,
            fontWeight: "bold"
          }}
          contentStyle={{
            height: 80,
            width: 300,
            justifyContent: "flex-start",
            paddingLeft: 16,
          }}
          style={{
            borderColor: Colors.primaryColor,
            marginTop: 8
          }}
          mode="outlined"
          onPress={() => navigation.navigate("ImportSeed")}>
          {"Import 24-word seed"}
        </Button>
        <Button
          icon={({ size, color }) => (
            <ScanQrIcon
              width={size + 10}
              height={size + 10}
            />
          )}
          labelStyle={{
            fontSize: 16,
            fontWeight: "bold"
          }}
          contentStyle={{
            height: 80,
            width: 300,
            justifyContent: "flex-start",
            paddingLeft: 16,
          }}
          style={{
            borderColor: Colors.primaryColor,
            marginTop: 8
          }}
          mode="outlined"
          onPress={() => navigation.navigate("ScanQr")}>
          {"Scan QR-Code"}
        </Button>
        <Button
          icon={({ size, color }) => (
            <EnterKeyIcon
              width={size + 10}
              height={size + 10}
            />
          )}
          labelStyle={{
            fontSize: 16,
            fontWeight: "bold"
          }}
          contentStyle={{
            height: 80,
            width: 300,
            justifyContent: "flex-start",
            paddingLeft: 16,
          }}
          style={{
            borderColor: Colors.primaryColor,
            marginTop: 8
          }}
          mode="outlined"
          onPress={() => navigation.navigate("ImportText")}>
          {"Enter Key/Seed"}
        </Button>
      </View>
    </View>
  );
}

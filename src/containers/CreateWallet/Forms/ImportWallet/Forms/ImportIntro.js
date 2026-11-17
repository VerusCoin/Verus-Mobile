import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text, Button} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {TwentyFourWordIcon, ScanQrIcon, EnterKeyIcon} from '../../../../../images/customIcons';
import Colors from '../../../../../globals/colors';
import {fontStyle} from '../../../../../globals/fonts';

export default function ImportIntro({navigation, label, onSelectMethod}) {
  const routeByMethod = {
    seed: 'ImportSeed',
    qr: 'ScanQr',
    nfc: 'ImportNfc',
    text: 'ImportText',
  };

  const selectMethod = method => {
    if (onSelectMethod) {
      onSelectMethod(method);
    } else {
      navigation.navigate(routeByMethod[method]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>
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
          onPress={() => selectMethod('seed')}>
          {"Import Secret Recovery Phrase"}
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
          onPress={() => selectMethod('qr')}>
          {"Scan QR-Code"}
        </Button>
        <Button
          icon={({size, color}) => (
            <MaterialCommunityIcons
              name="credit-card-wireless"
              size={size + 10}
              color={color}
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
          onPress={() => selectMethod('nfc')}>
          {"Import using NFC"}
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
          onPress={() => selectMethod('text')}>
          {"Enter custom seed or private key"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.secondaryColor,
    paddingHorizontal: 32,
  },
  form: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  title: {
    marginBottom: 40,
    maxWidth: '90%',
    textAlign: 'center',
    color: Colors.primaryColor,
    fontSize: 28,
    lineHeight: 35,
    letterSpacing: -0.7,
    ...fontStyle('semiBold'),
  },
});

import React from 'react';
import { View, Text, Switch } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';

// This is temp solution until we get real data from QR code
const awesomeLink = 'http://awesome.link.qr';
const qrCodeSize = 245;

const switchTrackColor = () => ({
  false: '#767577',
  true: Colors.linkButtonColor,
});

const AttestationDetails = (props) => {
  const { attestation, actions: { toggleAttestationPin } } = props;

  const toggleSwitch = (value) => {
    toggleAttestationPin(value);
  };

  return (
    <View style={Styles.root}>
      <View style={Styles.fullWidthAlignCenter}>
        <View style={Styles.buttonWithSuccessColor}>
          <Text style={Styles.textButton}>{attestation.get('claimName', '')}</Text>
        </View>
        <View style={Styles.marginVertical}>
          <QRCode
            value={awesomeLink}
            size={qrCodeSize}
          />
        </View>
        <View style={Styles.alignItemsCenter}>
          <Text style={Styles.textWithHorizontalPadding}>Pin attestation</Text>
          <Switch
            trackColor={switchTrackColor}
            onValueChange={toggleSwitch}
            value={attestation.get('showOnHomeScreen', false)}
          />
        </View>
      </View>
    </View>
  );
};

export default AttestationDetails;

import React from 'react';
import {
  View, Text, Switch, Modal, TouchableOpacity, SafeAreaView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import StandardButton from '../../../../components/StandardButton';
// This is temp solution until we get real data from QR code
const awesomeLink = 'http://awesome.link.qr';
const qrCodeSize = 245;

const switchTrackColor = () => ({
  false: '#767577',
  true: Colors.linkButtonColor,
});


const AttestationDetails = (props) => {
  const {
    attestation, visible, attestedClaimName, actions: { toggleAttestationPin, setAttestationModalVisibility },
  } = props;

  const cancelHandler = () => {
    setAttestationModalVisibility(false);
  };

  const toggleSwitch = (value) => {
    toggleAttestationPin(value);
  };

  return (

    <View>
      { visible && (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
      >
        <View
          style={Styles.root}
        >
          <View style={Styles.headerContainer}>
            <Text style={Styles.centralHeader}>
              {attestedClaimName}
            </Text>
          </View>
          <View style={Styles.alignItemsCenterColumn}>
            {/* <View style={Styles.buttonWithSuccessColor}>
              <Text style={Styles.textButton}>{attestation.get('claimName', '')}</Text>
            </View> */}
            <View>
              <StandardButton
                color={Colors.successButtonColor}
                title="Pin to home"
                onPress={cancelHandler}
              />
            </View>
            <View style={Styles.marginVertical}>
              <QRCode
                value={awesomeLink}
                size={qrCodeSize}
              />
            </View>
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
        <View style={Styles.footerContainer}>
          <View style={Styles.alignItemsCenter}>
            <StandardButton
              color={Colors.warningButtonColor}
              title="CLOSE"
              onPress={cancelHandler}
            />
          </View>
        </View>
      </Modal>
      )}
    </View>
  );
};

export default AttestationDetails;

import React from 'react';
import {
  View, Text, Modal,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { PricingCard } from 'react-native-elements';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import StandardButton from '../../../../components/StandardButton';
// This is temp solution until we get real data from QR code
const awesomeLink = 'http://awesome.link.qr';
const qrCodeSize = 245;


const AttestationDetails = (props) => {
  const {
    attestation, visible, attestedClaimName, identityAttested,
    actions: { toggleAttestationPin, setAttestationModalVisibility },
  } = props;

  const cancelHandler = () => {
    setAttestationModalVisibility(false);
  };


  const pinToHome = () => {
    toggleAttestationPin();
    setAttestationModalVisibility(false);
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
          style={Styles.defaultRoot}
        >
          <View style={Styles.headerContainer}>
            <Text style={Styles.centralHeader}>
              {attestedClaimName}
            </Text>
          </View>
          <View style={Styles.alignItemsCenterColumn}>
            <View>
              <PricingCard
                color={Colors.successButtonColor}
                title={attestation.get('claimName', '')}
                info={[identityAttested]}
                button={attestation.get('showOnHomeScreen', false) ? { title: 'Unpin from home' } : { title: 'Pin to home' }}
                onButtonPress={pinToHome}
              />
            </View>
            <View style={Styles.marginVertical}>
              <QRCode
                value={awesomeLink}
                size={qrCodeSize}
              />
            </View>
          </View>
        </View>
        <View style={Styles.footerContainer}>
          <View style={[Styles.alignItemsCenter, Styles.paddingTop]}>
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

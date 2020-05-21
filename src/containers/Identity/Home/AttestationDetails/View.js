import React from 'react';
import {
  View, Text, Modal,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from 'react-native-elements';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import StandardButton from '../../../../components/StandardButton';
// This is temp solution until we get real data from QR code
const awesomeLink = 'http://awesome.link.qr';
const qrCodeSize = 245;

const AttestationDetails = (props) => {
  const {
    attestation,
    visible,
    identityAttested,
    actions: {
      toggleAttestationPin,
      setAttestationModalVisibility,
    },
  } = props;

  const cancelHandler = () => {
    setAttestationModalVisibility(false);
  };
  const pinToHome = () => {
    toggleAttestationPin();
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
              {identityAttested}
            </Text>
          </View>
          <View style={Styles.alignItemsCenterColumn}>
            <View style={[Styles.marginVertical, Styles.paddedBorderedBox]}>
              <Text style={Styles.centralSuccessHeader}>{attestation.get('claimId', '')}</Text>
              <View>
                <Text style={[Styles.boldText, Styles.centeredText]}>{attestation.get('data', '')}</Text>
                <Text style={Styles.centeredText}>{attestation.get('date', '')}</Text>
              </View>
              <QRCode value={awesomeLink} size={qrCodeSize} />
              <Text style={[Styles.boldText, Styles.centeredText]}>From: {attestation.get('identityAttested', '')}</Text>
              <Text style={[Styles.boldText, Styles.noVerticalPadding, Styles.centeredText]}>To: {attestation.get('identity', '')}</Text>
            </View>
            <Button
              onPress={pinToHome}
              color={Colors.secondaryColor}
              buttonStyle={Styles.greenButton}
              title={attestation.get('showOnHomeScreen', false) ? 'Unpin from home' : 'Pin to home'}
            />
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

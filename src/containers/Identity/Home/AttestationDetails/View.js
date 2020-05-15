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
import { truncateString } from '../../PersonalInfo/ClaimManager/utils/truncateString';

const getClaimData = (name) => {
  if (name.length > 20) return `${truncateString(name, 20)}...`;
  return name;
};

const AttestationDetails = (props) => {
  const {
    attestation,
    visible,
    childClaimData,
    identityAttested,
    claimData,
    actions: {
      toggleAttestationPin,
      setAttestationModalVisibility,
    },
  } = props;

  console.log(identityAttested)

  const cancelHandler = () => {
    setAttestationModalVisibility(false);
  };
  const pinToHome = () => {
    toggleAttestationPin();
  };

  const getChildClaimData = () => `${childClaimData.claimName}: ${childClaimData.claimData}`;

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
            <View>
              <PricingCard
                color={Colors.successButtonColor}
                title={attestation.get('id', '')}
                info={[getClaimData(claimData), getChildClaimData()]}
                button={attestation.get('showOnHomeScreen', false) ? { title: 'Unpin from home' } : { title: 'Pin to home' }}
                onButtonPress={pinToHome}
                titleStyle={Styles.mediumFont}
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

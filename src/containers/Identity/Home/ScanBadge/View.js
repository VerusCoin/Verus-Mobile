import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import Styles from '../../../../styles/index';
import ScannedInformation from '../ScannedInformation';

const ScanBadge = (props) => {
  const {
    navigation,
    scanInfoModalVisibility,
    actions: { setScanInfoModalVisibility }
  } = props;

  const onSuccess = (e) => {
    navigation.navigate('ScannedInformation');
  };

  const nextHandler = () => {
    setScanInfoModalVisibility(true);
  };
  return (
    <View style={Styles.blackRoot}>
      {/* <QRCodeScanner
        onRead={onSuccess}
        showMarker
        captureAudio={false}
        cameraStyle={Styles.fullHeight}
      /> */}
      <TouchableOpacity
        style={{ ...Styles.footerContainer, ...Styles.blackRoot }}
        onPress={nextHandler}
      >
        <Text style={Styles.whiteTextWithPadding}>Next</Text>
      </TouchableOpacity>
      <ScannedInformation
        visible={scanInfoModalVisibility}
      />
    </View>
  );
};

export default ScanBadge;

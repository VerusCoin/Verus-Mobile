import React, { useEffect, useState } from "react"
import {
  Linking,
  SafeAreaView,
  View
} from 'react-native';
import Colors from '../../globals/colors';
import SemiModal from "../SemiModal";
import { Button, Text, Divider } from "react-native-paper";
import Styles from "../../styles";
import AnimatedActivityIndicatorBox from "../AnimatedActivityIndicatorBox";
import VerusIdObjectData from "../VerusIdObjectData";
import { createAlert } from "../../actions/actions/alert/dispatchers/alert";

export default function VerusIdDetailsModal(props) {
  const { loadVerusId, visible, animationType, cancel, loadFriendlyNames, ListFooterComponent } = props

  const [verusId, setVerusId] = useState(null);
  const [friendlyNames, setFriendlyNames] = useState(null);

  openIdDetails = () => {
    let url = `https://verus.io/verusid-lookup/${verusId.identity.name}@`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log("Don't know how to open URI: " + url);
      }
    });
  };

  useEffect(async () => {
    if (visible) {
      try {
        setVerusId(await loadVerusId());
        setFriendlyNames(await loadFriendlyNames());
      } catch (e) {
        createAlert('Error Loading VerusID', e.message);
        cancel()
      }
    }
  }, [visible]);

  return (
    <SemiModal
      animationType={animationType}
      transparent={true}
      visible={visible}
      onRequestClose={cancel}
      flexHeight={4}>
      {friendlyNames == null || verusId == null ? (
        <AnimatedActivityIndicatorBox />
      ) : (
        <SafeAreaView style={Styles.centerContainer}>
          <View style={{...Styles.headerContainer, minHeight: 48}}>
            <View style={Styles.semiModalHeaderContainer}>
              <Button onPress={cancel} color={Colors.primaryColor}>
                {'Close'}
              </Button>
              <Text
                style={{
                  ...Styles.centralHeader,
                  ...Styles.smallMediumFont,
                }}>
                {`${verusId.identity.name}@`}
              </Text>
              <Button
                onPresscolor={Colors.primaryColor}
                disabled={verusId == null}
                onPress={openIdDetails}>
                {'Details'}
              </Button>
            </View>
          </View>
          <VerusIdObjectData
            verusId={verusId}
            friendlyNames={friendlyNames}
            ListFooterComponent={ListFooterComponent}
          />
        </SafeAreaView>
      )}
    </SemiModal>
  );
}
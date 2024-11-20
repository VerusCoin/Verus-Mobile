import React, {useEffect, useState} from 'react';
import {Linking, SafeAreaView, View} from 'react-native';
import Colors from '../../globals/colors';
import SemiModal from '../SemiModal';
import {Button, Text, Divider} from 'react-native-paper';
import Styles from '../../styles';
import AnimatedActivityIndicatorBox from '../AnimatedActivityIndicatorBox';
import VerusIdObjectData from '../VerusIdObjectData';
import {createAlert} from '../../actions/actions/alert/dispatchers/alert';
import MissingInfoRedirect from '../MissingInfoRedirect/MissingInfoRedirect';
import { convertFqnToDisplayFormat } from '../../utils/fullyqualifiedname';
import { openUrl } from '../../utils/linking';

export default function VerusIdDetailsModal(props) {
  const {
    loadVerusId,
    visible,
    animationType,
    cancel,
    loadFriendlyNames,
    StickyFooterComponent,
  } = props;
  const DEFAULT_FAIL_MESSAGE = 'Failed to load VerusID';

  const [verusId, setVerusId] = useState(null);
  const [friendlyNames, setFriendlyNames] = useState(null);
  const [failedToLoad, setFailedToLoad] = useState(false);
  const [failedMessage, setFailedMessage] = useState(DEFAULT_FAIL_MESSAGE);

  function getVerusIdTitle() {
    if (verusId) {
      const fullTitle = convertFqnToDisplayFormat(verusId.fullyqualifiedname);

      return fullTitle.length < 12 ? fullTitle : "VerusID"
    } else return ""
  }

  const [verusIdTitle, setVerusIdTitle] = useState(getVerusIdTitle());

  async function onVisibleUpdate() {
    if (visible) {
      try {
        setVerusId(await loadVerusId());
        setFriendlyNames(await loadFriendlyNames());
      } catch (e) {
        setFailedToLoad(true);

        if (e.message) {
          setFailedMessage(e.message);
        }
      }
    }
  }

  openIdDetails = () => {
    let url = `https://verus.io/verusid-lookup/${verusId.fullyqualifiedname}`;

    openUrl(url)
  };

  useEffect(() => {
    onVisibleUpdate();
  }, [visible]);

  useEffect(() => {
    if (verusId) {
      setVerusIdTitle(getVerusIdTitle());
    }
  }, [verusId])

  return (
    <SemiModal
      animationType={animationType}
      transparent={true}
      visible={visible}
      onRequestClose={cancel}
      flexHeight={4}>
      {(friendlyNames == null || verusId == null) && !failedToLoad ? (
        <AnimatedActivityIndicatorBox />
      ) : (
        <SafeAreaView style={Styles.centerContainer}>
          <View style={{...Styles.headerContainer, minHeight: 48}}>
            <View style={Styles.semiModalHeaderContainer}>
              <Button onPress={cancel} textColor={Colors.primaryColor}>
                {'Close'}
              </Button>
              <Text
                style={{
                  ...Styles.centralHeader,
                  ...Styles.smallMediumFont,
                }}>
                {failedToLoad ? "Error" : verusIdTitle}
              </Text>
              <Button
                textColor={Colors.primaryColor}
                disabled={verusId == null || failedToLoad}
                onPress={openIdDetails}>
                {'Details'}
              </Button>
            </View>
          </View>
          {failedToLoad ? (
            <View style={{flex: 1, ...Styles.fullWidth}}>
              <MissingInfoRedirect
                icon={'alert-circle-outline'}
                label={failedMessage}
              />
              {StickyFooterComponent != null ? StickyFooterComponent : null}
            </View>
          ) : (
            <VerusIdObjectData
              verusId={verusId}
              friendlyNames={friendlyNames}
              StickyFooterComponent={StickyFooterComponent}
              flex={true}
            />
          )}
        </SafeAreaView>
      )}
    </SemiModal>
  );
}

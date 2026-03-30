/*
  VerusIdDetailsModal
  - 2026-02-02: Use SemiModal standardized header (title + top-right X)
    and remove legacy Close/Details buttons.
*/
import React, {useEffect, useState} from 'react';
import {SafeAreaView, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../globals/colors';
import SemiModal from '../SemiModal';
import Styles from '../../styles';
import AnimatedActivityIndicatorBox from '../AnimatedActivityIndicatorBox';
import VerusIdObjectData from '../VerusIdObjectData';
import MissingInfoRedirect from '../MissingInfoRedirect/MissingInfoRedirect';
import { convertFqnToDisplayFormat } from '../../utils/fullyqualifiedname';
import { getSystemNameFromSystemId } from '../../utils/CoinData/CoinData';
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory';
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

  const openIdDetails = () => {
    if (!verusId || !verusId.fullyqualifiedname) return;

    const url = `https://verus.io/verusid-lookup/${verusId.fullyqualifiedname}`;
    openUrl(url);
  };

  const isTestnetSystem = () => {
    if (!verusId || !verusId.identity || !verusId.identity.systemid) return false;

    try {
      const systemName = getSystemNameFromSystemId(verusId.identity.systemid);
      const coinObj = CoinDirectory.getBasicCoinObj(systemName);
      return !!coinObj.testnet;
    } catch (e) {
      return false;
    }
  };

  const showDetailsButton = !isTestnetSystem();

  useEffect(() => {
    onVisibleUpdate();
  }, [visible]);

  useEffect(() => {
    if (verusId) {
      setVerusIdTitle(getVerusIdTitle());
    }
  }, [verusId])

  const modalTitle = failedToLoad ? 'Error' : (verusIdTitle || 'VerusID');
  const canOpenDetails = verusId != null && !failedToLoad && showDetailsButton;
  const headerLeft = canOpenDetails ? (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Open details in browser"
      onPress={openIdDetails}
      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
      style={{minWidth: 34, minHeight: 34, justifyContent: 'center', alignItems: 'center'}}>
      <MaterialCommunityIcons name="open-in-new" size={20} color={Colors.primaryColor} />
    </TouchableOpacity>
  ) : null;

  return (
    <SemiModal
      animationType={animationType}
      transparent={true}
      visible={visible}
      onRequestClose={cancel}
      title={modalTitle}
      headerLeft={headerLeft}
      flexHeight={4}>
      {(friendlyNames == null || verusId == null) && !failedToLoad ? (
        <AnimatedActivityIndicatorBox />
      ) : (
        <SafeAreaView style={Styles.centerContainer}>
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

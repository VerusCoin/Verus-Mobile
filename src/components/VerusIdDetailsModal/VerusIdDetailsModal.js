/*
  VerusIdDetailsModal
  - 2026-02-02: Use SemiModal standardized header (title + top-right X)
    and remove legacy Close/Details buttons.
*/
import React, {useEffect, useState} from 'react';
import {SafeAreaView, View} from 'react-native';
import SemiModal from '../SemiModal';
import Styles from '../../styles';
import AnimatedActivityIndicatorBox from '../AnimatedActivityIndicatorBox';
import VerusIdObjectData from '../VerusIdObjectData';
import MissingInfoRedirect from '../MissingInfoRedirect/MissingInfoRedirect';
import { convertFqnToDisplayFormat } from '../../utils/fullyqualifiedname';

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

  useEffect(() => {
    onVisibleUpdate();
  }, [visible]);

  useEffect(() => {
    if (verusId) {
      setVerusIdTitle(getVerusIdTitle());
    }
  }, [verusId])

  const modalTitle = failedToLoad ? 'Error' : (verusIdTitle || 'VerusID');

  return (
    <SemiModal
      animationType={animationType}
      transparent={true}
      visible={visible}
      onRequestClose={cancel}
      title={modalTitle}
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

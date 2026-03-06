/*
  ContentStep (Step 2)
  - 2026-02-05: Created. Full-screen content changes review using VerusIdObjectData
    with badges. Gives the changes list full vertical space without being squeezed
    inside an accordion on the overview screen.
  - 2026-02-06: Filter displayUpdates to only pass CMM and private-info groups.
    Authority/status changes are already shown in the High Risk step.
  - 2026-03-06: Updated content-removal framing  so the step focuses on current
    identity publication state instead of permanent deletion.
*/
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import VerusIdObjectData from '../../../../components/VerusIdObjectData';
import { VERUSID_CMM_INFO, VERUSID_PRIVATE_INFO } from '../../../../utils/constants/verusidObjectData';

const CONTENT_ONLY_KEYS = new Set([VERUSID_CMM_INFO.key, VERUSID_PRIVATE_INFO.key]);

const ContentStep = ({
  subjectIdentity,
  friendlyNames,
  displayUpdates,
  chainInfo,
  coinObj,
  cmmDataKeys,
  styles,
}) => {
  // Only pass content-level groups (CMM + privacy) to VerusIdObjectData.
  // Authority and base-info changes are handled by the High Risk step.
  const contentOnlyUpdates = useMemo(() => {
    const filtered = {};
    for (const groupKey in displayUpdates) {
      if (CONTENT_ONLY_KEYS.has(groupKey)) {
        filtered[groupKey] = displayUpdates[groupKey];
      }
    }
    return filtered;
  }, [displayUpdates]);

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: 16, paddingTop: 16 }]}>
        <Text style={styles.mainTitle}>Review content changes</Text>
        <Text style={styles.subtitle}>Review changes to the current content published by your identity</Text>
      </View>

      {/* Full-screen VerusIdObjectData with native scrolling */}
      <VerusIdObjectData
        verusId={subjectIdentity}
        friendlyNames={friendlyNames}
        updates={contentOnlyUpdates}
        hideUnchanged={true}
        scrollDisabled={false}
        containerStyle={{ width: '100%', flex: 1 }}
        chainInfo={chainInfo}
        coinObj={coinObj}
        cmmDataKeys={cmmDataKeys}
        showChangeBadges={true}
        flex={true}
      />
    </View>
  );
};

export default ContentStep;

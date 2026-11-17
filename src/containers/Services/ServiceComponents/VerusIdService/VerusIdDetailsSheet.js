/*
  VerusIdDetailsSheet
  - The technical facts of a VerusID that the page does not show: i-address,
    parent, primary and private addresses, and the block of the last change.
  - Information sheet pattern (InfoSheet + InfoSheetRow), as Transaction
    details. "View in explorer" shows only where an explorer exists.
*/
import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {ExternalLink} from 'lucide-react-native';
import InfoSheet from '../../../../components/InfoSheet';
import {InfoSheetRow} from '../../../../components/InfoSheetSection';
import SignedOutActionRow from '../../../../components/SignedOutActionRow';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {openUrl} from '../../../../utils/linking';

const MONOSPACE_FONT = Platform.select({ios: 'Menlo', default: 'monospace'});

const VerusIdDetailsSheet = ({
  explorerUrl,
  friendlyNames,
  identity,
  onClose,
  onClosed,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const details = identity?.identity || {};
  const primaryAddresses = Array.isArray(details.primaryaddresses)
    ? details.primaryaddresses
    : [];
  const parent = details.parent
    ? friendlyNames?.[details.parent] || details.parent
    : null;

  return (
    <InfoSheet
      onClose={onClose}
      onClosed={onClosed}
      title="Details"
      visible={visible}>
      <View style={[styles.rows, {borderTopColor: theme.colors.border}]}>
        <InfoSheetRow
          copy
          label="i-address"
          value={details.identityaddress || null}
          valueStyle={styles.identifier}
        />
        <InfoSheetRow label="Parent" value={parent} />
        {primaryAddresses.length ? (
          <InfoSheetRow
            copy={primaryAddresses.length === 1}
            label={
              primaryAddresses.length === 1
                ? 'Primary address'
                : 'Primary addresses'
            }
            value={primaryAddresses.join('\n')}
            valueStyle={styles.identifier}
          />
        ) : null}
        {details.privateaddress ? (
          <InfoSheetRow
            copy
            ellipsizeMode="middle"
            label="Private address"
            numberOfLines={1}
            selectable={false}
            value={details.privateaddress}
            valueStyle={styles.identifier}
          />
        ) : null}
        {identity?.blockheight != null ? (
          <InfoSheetRow
            label="Last change"
            value={`Block ${identity.blockheight}`}
          />
        ) : null}
      </View>
      {explorerUrl ? (
        <SignedOutActionRow
          IconComponent={ExternalLink}
          label="View in explorer"
          onPress={() => openUrl(explorerUrl)}
        />
      ) : null}
    </InfoSheet>
  );
};

const styles = StyleSheet.create({
  rows: {borderTopWidth: StyleSheet.hairlineWidth},
  identifier: {fontFamily: MONOSPACE_FONT, fontSize: 12, lineHeight: 17},
});

export default VerusIdDetailsSheet;

/*
  BridgedOriginSheet
  - Opened from the "Bridged from …" line on the asset screen. It names the
    original on Ethereum and, for an ERC-20 original, its contract.
  - Information sheet pattern (InfoSheet + InfoSheetRow), as Transaction
    details. The title names the network, so the rows do not repeat it.
*/
import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {ExternalLink} from 'lucide-react-native';
import InfoSheet from '../../components/InfoSheet';
import {InfoSheetRow} from '../../components/InfoSheetSection';
import SignedOutActionRow from '../../components/SignedOutActionRow';
import {useOnboardingTheme} from '../../theme/onboarding';
import {openUrl} from '../../utils/linking';

const MONOSPACE_FONT = Platform.select({ios: 'Menlo', default: 'monospace'});

const BridgedOriginSheet = ({origin, onClose, onClosed, visible}) => {
  const theme = useOnboardingTheme();

  return (
    <InfoSheet
      onClose={onClose}
      onClosed={onClosed}
      title={origin?.title}
      visible={visible}>
      <View
        style={[styles.rows, {borderTopColor: theme.colors.border}]}
        testID="bridged-origin-sheet">
        <InfoSheetRow label="Original" value={origin?.original || null} />
        {origin?.contractAddress ? (
          <InfoSheetRow
            copy
            label="Contract address"
            value={origin.contractAddress}
            valueStyle={styles.identifier}
          />
        ) : null}
      </View>
      {origin?.explorerUrl ? (
        <SignedOutActionRow
          IconComponent={ExternalLink}
          label="View in explorer"
          onPress={() => openUrl(origin.explorerUrl)}
          testID="bridged-origin-explorer"
        />
      ) : null}
    </InfoSheet>
  );
};

const styles = StyleSheet.create({
  rows: {borderTopWidth: StyleSheet.hairlineWidth},
  identifier: {fontFamily: MONOSPACE_FONT, fontSize: 12, lineHeight: 17},
});

export default BridgedOriginSheet;

import React, {useMemo} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import InfoSheet from '../../../../components/InfoSheet';
import {InfoSheetRow} from '../../../../components/InfoSheetSection';
import StatusBadge, {
  STATUS_BADGE_TONE,
} from '../../../../components/StatusBadge';
import {deepLinkRequestReviewStyles as createDeepLinkRequestReviewStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {
  describeIdentityContent,
  IDENTITY_CONTENT_KIND,
  IDENTITY_CONTENT_SOURCE,
} from '../../../../utils/verusid/describeIdentityContent';

const MONOSPACE_FONT = Platform.select({ios: 'Menlo', default: 'monospace'});

// Read-only content of a VerusID, decoded as content v1. Encrypted values are
// never decrypted: each key shows one row with the count and an "Encrypted"
// badge. `identity` is a getidentity result or its inner `identity` object.
export default function VerusIdContentSheet({
  visible,
  onClose,
  onClosed,
  identity,
}) {
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createDeepLinkRequestReviewStyles(theme),
    [theme],
  );
  const entries = useMemo(() => describeIdentityContent(identity), [identity]);

  const renderRow = (entry, row, index) => {
    const key = `${entry.source}-${entry.key}-${index}`;
    const label = row.label ?? entry.label;

    if (row.kind === IDENTITY_CONTENT_KIND.ENCRYPTED) {
      return (
        <InfoSheetRow
          accessory={
            <StatusBadge label="Encrypted" tone={STATUS_BADGE_TONE.NEUTRAL} />
          }
          key={key}
          label={label}
          value={row.value}
        />
      );
    }

    if (entry.source === IDENTITY_CONTENT_SOURCE.CONTENT_MAP) {
      return (
        <InfoSheetRow
          copy
          ellipsizeMode="middle"
          key={key}
          label={label}
          numberOfLines={1}
          selectable={false}
          value={row.value}
          valueStyle={localStyles.identifier}
        />
      );
    }

    if (
      row.kind === IDENTITY_CONTENT_KIND.TEXT ||
      row.kind === IDENTITY_CONTENT_KIND.LINK
    ) {
      return (
        <InfoSheetRow
          copy
          key={key}
          label={label}
          numberOfLines={4}
          value={row.value}
        />
      );
    }

    return <InfoSheetRow key={key} label={label} value={row.value} />;
  };

  return (
    <InfoSheet
      onClose={onClose}
      onClosed={onClosed}
      title="Content"
      visible={visible}>
      {entries.length ? (
        <View style={styles.requestInfoRows} testID="verusid-content-sheet">
          {entries.map(entry =>
            entry.rows.map((row, index) => renderRow(entry, row, index)),
          )}
        </View>
      ) : null}
    </InfoSheet>
  );
}

const localStyles = StyleSheet.create({
  // The transaction ID size: a raw hash in 12/17 monospace.
  identifier: {fontFamily: MONOSPACE_FONT, fontSize: 12, lineHeight: 17},
});

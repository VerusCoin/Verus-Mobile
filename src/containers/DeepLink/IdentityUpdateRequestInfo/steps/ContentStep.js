import React, {useMemo} from 'react';
import {Pressable, View} from 'react-native';
import {Text} from 'react-native-paper';
import {
  VERUSID_CMM_DATA,
  VERUSID_CMM_INFO,
  VERUSID_PRIVATE_ADDRESS,
  VERUSID_PRIVATE_INFO,
} from '../../../../utils/constants/verusidObjectData';
import {buildContentReview} from '../../../../utils/identityUpdate/contentReview';
import styles from '../../../../styles/deeplink/identityContentReview.styles';

const Field = ({label, value, secondary = false}) => (
  <View style={styles.field}>
    <Text allowFontScaling style={styles.fieldLabel}>{label}</Text>
    <Text allowFontScaling selectable style={secondary ? styles.secondaryValue : styles.fieldValue}>{value}</Text>
  </View>
);

const Notice = ({children}) => (
  <View style={styles.notice}>
    <Text allowFontScaling style={styles.noticeText}>{children}</Text>
  </View>
);

// Review content is deliberately expanded. The inspector is an optional tool,
// never the only place to find the data the user is being asked to publish.
const ContentValue = ({value, isUpload = false, label, showTitle = false}) => {
  const review = useMemo(() => buildContentReview(value, {isUpload, label}), [value, isUpload, label]);
  const fieldTitle = field => {
    const path = field.path ? field.path.split(' › ') : [];
    if (path[0] === label) path.shift();
    return [...path, field.label].join(' › ');
  };
  const isSecondary = field => field.kind === 'encoded' || field.kind === 'metadata';
  const renderField = field => (
    <Field key={field.id} label={fieldTitle(field)} value={field.value} secondary={isSecondary(field)} />
  );

  return (
    <View style={styles.valueGroup}>
      {showTitle && <Text allowFontScaling accessibilityRole="header" style={styles.valueTitle}>{label}</Text>}
      {review.fields.filter(field => !isSecondary(field)).map(renderField)}
      {review.warnings.map((warning, index) => <Notice key={index}>{warning}</Notice>)}
      {review.fields.filter(isSecondary).map(renderField)}
    </View>
  );
};

const Removal = ({entry}) => {
  const {removeMeta, removalUi} = entry;
  const notes = [
    removalUi?.detailBody || entry.data,
    removalUi?.effectNote,
    removalUi?.emptyStateNote,
    removalUi?.metadataNote,
    removalUi?.historyNote || 'Earlier on-chain versions may still be publicly retrievable.',
  ].filter(Boolean);

  return (
    <View>
      {notes.map((note, index) => <Text allowFontScaling key={index} style={styles.body}>{note}</Text>)}
      {removeMeta.action === 4 && <Field label="Removal scope" value="All identity content keys and values" />}
      {removeMeta.valueHash && <Field label="Matching value hash" value={removeMeta.valueHash} secondary />}
      {entry.rawData != null && <ContentValue value={entry.rawData} label="Removal data" showTitle />}
    </View>
  );
};

const ContentChange = ({entry, entryKey, cmmDataKeys}) => {
  const isRemoval = !!entry.removeMeta;
  const isUpload = entry.signData != null;
  const contentKey = entry.removeMeta?.entryKey || entry.contentKey ||
    entryKey.slice(`${VERUSID_CMM_DATA.key}:`.length).split(':')[0];
  const title = entry.displayTitle || cmmDataKeys?.[contentKey]?.label || 'Unrecognized content key';
  const visibility = entry.isEncrypted ? 'Encrypted upload' : entry.isEncryptedKey ? 'Encrypted credential' : 'Public';
  const values = Array.isArray(entry.rawData) ? entry.rawData : [entry.rawData];
  const operation = isRemoval
    ? (entry.removeMeta.action === 4 ? 'Clear current content' : 'Remove content')
    : entry.unrecognizedRemoval ? 'Included data' : 'Add content';

  return (
    <View style={styles.card} testID="identity-content-change">
      <View style={styles.badges}>
        <View style={[styles.badge, isRemoval ? styles.removalBadge : styles.additionBadge]}>
          <Text allowFontScaling style={[styles.badgeText, isRemoval ? styles.removalText : styles.additionText]}>{operation}</Text>
        </View>
        {!isRemoval && <View style={styles.badge}><Text allowFontScaling style={styles.badgeText}>{visibility}</Text></View>}
      </View>
      <Text allowFontScaling accessibilityRole="header" style={styles.cardTitle}>{title}</Text>
      {isRemoval ? <Removal entry={entry} /> : (
        <View>
          {entry.unrecognizedRemoval && (
            <Notice>This data uses the removal key but is not a recognized removal instruction. It will still be recorded in the update transaction.</Notice>
          )}
          {entry.isEncryptedKey && (
            <Text allowFontScaling style={styles.body}>
              This credential will be encrypted before it is added. Review its readable content below.
            </Text>
          )}
          {isUpload
            ? <ContentValue value={entry.signData} isUpload label="Upload content" />
            : values.map((value, index) => (
              <ContentValue
                key={index}
                value={value}
                showTitle={values.length > 1}
                label={values.length > 1 ? `Value ${index + 1} of ${values.length}` : 'Content to add'}
              />
            ))}
        </View>
      )}
      {contentKey && entry.removeMeta?.action !== 4 && (
        <View style={styles.keySection}><Field label={isRemoval ? 'Target content key' : 'Content key'} value={contentKey} secondary /></View>
      )}
      {typeof entry.onPress === 'function' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View technical details for ${title}`}
          accessibilityHint="Opens the data inspector. The requested content is already shown above."
          onPress={entry.onPress}
          style={({pressed}) => [styles.detailsButton, pressed && styles.detailsButtonPressed]}>
          <Text allowFontScaling style={styles.detailsLabel}>View technical details</Text>
        </Pressable>
      )}
    </View>
  );
};

const ContentStep = ({subjectIdentity, displayUpdates = {}, cmmDataKeys}) => {
  const changes = Object.entries(displayUpdates[VERUSID_CMM_INFO.key] || {}).filter(([, entry]) => !!entry);
  const privateAddressChange = displayUpdates[VERUSID_PRIVATE_INFO.key]?.[VERUSID_PRIVATE_ADDRESS.key];
  if (!changes.length && !privateAddressChange) return null;
  const hasMixedChanges = changes.some(([, entry]) => entry.removeMeta) &&
    changes.some(([, entry]) => !entry.removeMeta && !entry.unrecognizedRemoval);
  const currentPrivateAddress = subjectIdentity?.identity?.privateaddress || subjectIdentity?.privateaddress;

  return (
    <View style={styles.section}>
      <Text allowFontScaling accessibilityRole="header" style={styles.sectionTitle}>Content changes</Text>
      {changes.length > 0 && (
        <Text allowFontScaling style={styles.introduction}>
          Review each requested change. On-chain history persists, even after content is removed.
        </Text>
      )}
      {hasMixedChanges && <Notice>This request adds and removes content. A removal can also affect values added in the same update.</Notice>}
      {changes.map(([entryKey, entry]) => (
        <ContentChange key={entryKey} entryKey={entryKey} entry={entry} cmmDataKeys={cmmDataKeys} />
      ))}
      {privateAddressChange && (
        <View style={styles.card} testID="identity-private-address-change">
          <Text allowFontScaling accessibilityRole="header" style={styles.cardTitle}>Change private address</Text>
          <Field label="Current address" value={currentPrivateAddress || 'No private address'} />
          <Field label="Requested address" value={privateAddressChange.rawData ?? privateAddressChange.data} />
        </View>
      )}
    </View>
  );
};

export default ContentStep;

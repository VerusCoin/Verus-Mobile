import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ContentMultiMapRemoveKey} from 'verus-typescript-primitives';
import Colors from '../globals/colors';
import StatusBadge from './StatusBadge';
import {InfoSheetRow} from './InfoSheetSection';
import {verusIdObjectDataStyles as LocalStyles} from '../styles';
import {ONBOARDING_THEMES, useOnboardingTheme} from '../theme/onboarding';
import {VERUSID_CMM_DATA} from '../utils/constants/verusidObjectData';
import {capitalizeString} from '../utils/stringUtils';
import {getVDXFKeyLabel} from '../utils/vdxf/vdxfTypeLabels';
import {escapeContentReviewText, formatContentFieldCount} from '../utils/identityUpdate/contentReview';

const abbreviateKeyId = iAddr =>
  `${iAddr.substring(0, 4)}...${iAddr.substring(iAddr.length - 4)}`;

export const getCmmDataKeyLabel = (iAddr, cmmDataKeys) => {
  const keyLabel = getVDXFKeyLabel(iAddr, true);

  if (keyLabel != null) {
    return capitalizeString(keyLabel);
  }

  if (cmmDataKeys && cmmDataKeys[iAddr]) {
    return cmmDataKeys[iAddr].label;
  }

  if (typeof iAddr === 'string' && iAddr.length > 8) {
    return abbreviateKeyId(iAddr);
  }

  return iAddr || 'Unknown key';
};

// A key with no known name has only its abbreviated i-address as a title.
// The card then names it plainly and shows the full i-address instead.
const isUnnamedKeyTitle = item =>
  typeof item.keyId === 'string' &&
  item.keyId.length > 8 &&
  item.title === abbreviateKeyId(item.keyId);

// Only suppress a decoded key when the card already displays that exact key.
export const getFullContentChangeKey = (item, updateEntry) => {
  const key = item.removeMeta?.entryKey;
  if (!key) return undefined;
  const ui = updateEntry?.removalUi;
  const notes = [ui?.detailBody, ui?.effectNote, ui?.emptyStateNote, ui?.metadataNote, ui?.historyNote];
  return ((isUnnamedKeyTitle(item) || item.removeMeta?.action !== 4) && item.keyId === key) || item.title === key ||
    notes.some(note => typeof note === 'string' && note.includes(key))
    ? key : undefined;
};

export const getCmmDataPreview = (
  data,
  maxItems = 3,
  maxLen = 80,
  maxDepth = 2,
) => {
  const trim = value => {
    if (value == null) return 'null';
    const str = String(value);
    return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
  };

  const formatValue = (value, depth = 0) => {
    if (Array.isArray(value)) {
      if (depth >= maxDepth) return `${value.length} items`;

      const shownItems = value
        .slice(0, maxItems)
        .map(entry => formatValue(entry, depth + 1));
      const shown = shownItems.join(' | ');
      return value.length > maxItems
        ? `${shown} +${value.length - maxItems} more`
        : shown;
    }

    if (typeof value === 'object' && value != null) {
      const keys = Object.keys(value);
      if (depth >= maxDepth) return formatContentFieldCount(keys.length);

      if (keys.length === 1) {
        const key = keys[0];
        const label = getVDXFKeyLabel(key, true) || key;
        return `${label}: ${formatValue(value[key], depth + 1)}`;
      }

      return formatContentFieldCount(keys.length);
    }

    return trim(value);
  };

  return escapeContentReviewText(formatValue(data));
};

export const normalizeCmmDisplayUpdates = cmmUpdates => {
  const normalized = {};

  for (const key in cmmUpdates || {}) {
    const entry = cmmUpdates[key];
    normalized[key] =
      entry && entry.rawData != null
        ? {
            ...entry,
            data: getCmmDataPreview(entry.rawData),
          }
        : entry;
  }

  return normalized;
};

export const isContentMultiMapRemove = rawData => {
  const isRemoveObj = obj => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const keys = Object.keys(obj);
    if (keys.length !== 1) return false;
    return keys[0] === ContentMultiMapRemoveKey.vdxfid;
  };

  if (isRemoveObj(rawData)) return true;
  if (Array.isArray(rawData)) {
    return rawData.length > 0 && rawData.every(isRemoveObj);
  }

  return false;
};

export const getCmmChangeType = (hasExisting, updateEntry) => {
  if (!updateEntry) return null;
  if (updateEntry.unrecognizedRemoval) return 'included';
  if (updateEntry.removeMeta) return 'removed';
  if (!hasExisting) return 'added';
  return 'appended';
};

const getUpdateKeyTarget = updateKey => {
  const prefix = `${VERUSID_CMM_DATA.key}:`;
  if (!updateKey.startsWith(prefix)) return updateKey;

  return updateKey.slice(prefix.length).split(':upload')[0].split(':remove:')[0].split(':unrecognized')[0];
};

const getSameRequestRemoveTargets = cmmUpdates => {
  const targets = new Set();
  let clearsAll = false;

  for (const key in cmmUpdates || {}) {
    const removeMeta = cmmUpdates[key]?.removeMeta;
    if (!removeMeta) continue;

    if (removeMeta.action === 4) {
      clearsAll = true;
    } else if (removeMeta.action === 3) {
      targets.add(getUpdateKeyTarget(key));
    }
  }

  return {clearsAll, targets};
};

const sameRequestRemovesTarget = (targetKey, removeTargets) =>
  removeTargets.clearsAll || removeTargets.targets.has(targetKey);

export const buildVerusIdContentChangeItems = ({
  verusId,
  cmmUpdates,
  getCmmDataKey,
  changedOnly = false,
}) => {
  const contentMultiMapInfo = {};
  const currentContentMultiMap =
    verusId && verusId.identity ? verusId.identity.contentmultimap : null;
  const removeTargets = getSameRequestRemoveTargets(cmmUpdates);

  if (changedOnly) {
    return Object.keys(cmmUpdates || {}).flatMap(key => {
      const updateEntry = cmmUpdates[key];
      if (
        updateEntry?.removeMeta?.action === 4 &&
        currentContentMultiMap &&
        Object.keys(currentContentMultiMap).length > 0
      ) {
        return Object.keys(currentContentMultiMap).map((iAddrKey, index) => {
          const entryLabel = getCmmDataKey(iAddrKey);

          return {
            key: `${key}:active:${iAddrKey}`,
            updateKey: key,
            showOperationDetails: index === 0,
            keyId: iAddrKey,
            title: entryLabel,
            data: getCmmDataPreview(currentContentMultiMap[iAddrKey]),
            hideOldData: false,
            dataInDescription: true,
            changeType: 'removed',
            isEncrypted: Boolean(updateEntry && updateEntry.isEncrypted),
            isEncryptedKey: Boolean(updateEntry && updateEntry.isEncryptedKey),
            updatedData: updateEntry ? updateEntry.data : null,
            removeMeta: updateEntry
              ? {
                  ...updateEntry.removeMeta,
                  entryLabel,
                }
              : null,
          };
        });
      }

      const targetKey = getUpdateKeyTarget(key);
      const isRemoveUpdate = Boolean(updateEntry?.removeMeta);
      const existingData =
        currentContentMultiMap && currentContentMultiMap[targetKey] != null
          ? currentContentMultiMap[targetKey]
          : null;
      const hasExisting = existingData != null;
      const existingClearedByRequest =
        !isRemoveUpdate && sameRequestRemovesTarget(targetKey, removeTargets);
      const hasExistingAfterRequestRemovals =
        hasExisting && !existingClearedByRequest;

      return {
        key,
        keyId: targetKey,
        title:
          updateEntry && updateEntry.displayTitle
            ? updateEntry.displayTitle
            : getCmmDataKey(targetKey),
        data: hasExisting
          ? getCmmDataPreview(existingData)
          : updateEntry
          ? updateEntry.data
          : null,
        hideOldData: !hasExisting || existingClearedByRequest,
        dataInDescription: true,
        changeType: getCmmChangeType(
          hasExistingAfterRequestRemovals,
          updateEntry,
        ),
        isEncrypted: Boolean(updateEntry && updateEntry.isEncrypted),
        isEncryptedKey: Boolean(updateEntry && updateEntry.isEncryptedKey),
        updatedData: updateEntry ? updateEntry.data : null,
        removeMeta: updateEntry ? updateEntry.removeMeta : null,
      };
    });
  }

  if (currentContentMultiMap) {
    for (const iAddrKey in currentContentMultiMap) {
      const updateKey = `${VERUSID_CMM_DATA.key}:${iAddrKey}`;
      const updateEntry = cmmUpdates[updateKey];
      const isRemoveUpdate = Boolean(updateEntry?.removeMeta);
      const existingClearedByRequest =
        !isRemoveUpdate && sameRequestRemovesTarget(iAddrKey, removeTargets);

      contentMultiMapInfo[updateKey] = {
        key: updateKey,
        keyId: iAddrKey,
        title: getCmmDataKey(iAddrKey),
        data: getCmmDataPreview(currentContentMultiMap[iAddrKey]),
        hideOldData: existingClearedByRequest,
        dataInDescription: true,
        changeType: getCmmChangeType(!existingClearedByRequest, updateEntry),
        isEncrypted: Boolean(updateEntry && updateEntry.isEncrypted),
        isEncryptedKey: Boolean(updateEntry && updateEntry.isEncryptedKey),
        updatedData: updateEntry ? updateEntry.data : null,
        removeMeta: updateEntry ? updateEntry.removeMeta : null,
      };
    }
  }

  for (const key in cmmUpdates) {
    if (!contentMultiMapInfo[key]) {
      const updateEntry = cmmUpdates[key];
      const targetKey = getUpdateKeyTarget(key);
      const currentValues = updateEntry?.removeMeta?.action !== 4
        ? currentContentMultiMap?.[updateEntry?.removeMeta?.entryKey]
        : null;
      const hasCurrentValues = currentValues != null &&
        (!Array.isArray(currentValues) || currentValues.length > 0);

      contentMultiMapInfo[key] = {
        key,
        keyId: targetKey,
        title:
          updateEntry && updateEntry.displayTitle
            ? updateEntry.displayTitle
            : getCmmDataKey(targetKey),
        data: hasCurrentValues ? getCmmDataPreview(currentValues) : updateEntry ? updateEntry.data : null,
        hideOldData: !hasCurrentValues,
        dataInDescription: true,
        changeType: getCmmChangeType(false, updateEntry),
        isEncrypted: Boolean(updateEntry && updateEntry.isEncrypted),
        isEncryptedKey: Boolean(updateEntry && updateEntry.isEncryptedKey),
        updatedData: updateEntry ? updateEntry.data : null,
        removeMeta: updateEntry ? updateEntry.removeMeta : null,
      };
    }
  }

  return Object.values(contentMultiMapInfo);
};

export const isPrivateContentChange = item =>
  Boolean(item && (item.isEncrypted || item.isEncryptedKey));

export const contentChangeMatchesFilter = (item, filter) => {
  if (filter === 'all') return true;
  if (filter === 'add') {
    return item.changeType === 'added' || item.changeType === 'appended';
  }
  if (filter === 'remove') return item.changeType === 'removed';
  if (filter === 'protect') return isPrivateContentChange(item);
  return true;
};

// Badge colours that keep readable contrast on the dark card panels.
const DARK_INFO_COLOR = '#8FB1FF';
const DARK_REMOVE_COLOR = ONBOARDING_THEMES.dark.colors.dangerText;

const getChangeBadgeConfig = (changeType, darkMode = false) => {
  switch (changeType) {
    case 'added':
      return {
        icon: 'plus-circle-outline',
        label: 'New key',
        color: Colors.verusGreenColor,
      };
    case 'appended':
      return {
        icon: 'plus-circle-outline',
        label: 'Add value',
        color: Colors.verusGreenColor,
      };
    case 'removed':
      return {
        icon: 'minus-circle-outline',
        label: 'Will remove',
        color: darkMode ? DARK_REMOVE_COLOR : Colors.warningButtonColor,
      };
    default:
      return null;
  }
};

export const getContentChangeBadges = (item, darkMode = false) => {
  const badges = [];
  const baseBadge = getChangeBadgeConfig(item.changeType, darkMode);

  if (baseBadge) {
    badges.push(
      item.changeType === 'removed'
        ? {
            ...baseBadge,
            label: item.removeMeta?.action === 4 ? 'Will clear' : 'Will remove',
          }
        : baseBadge,
    );
  }

  if (isPrivateContentChange(item)) {
    badges.push({
      icon: 'shield-lock-outline',
      label: 'Will encrypt',
      color: darkMode ? DARK_INFO_COLOR : Colors.primaryColor,
    });
  }

  return badges;
};

const truncatePreview = (text, maxLen = 60) => {
  if (text == null) return '';
  const str = String(text);
  return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
};

const renderCmmDescBlock = (
  label,
  value,
  toneColor,
  muted = false,
  darkMode = false,
) => (
  <View style={LocalStyles.cmmCardDescBlock}>
    {label ? (
      <Text style={[LocalStyles.cmmCardDescLabel, {color: toneColor}]}>
        {label}
      </Text>
    ) : null}
    <Text
      style={[
        LocalStyles.cmmCardDescValue,
        darkMode && LocalStyles.cmmCardDescValueDark,
        muted && {
          textDecorationLine: 'line-through',
          color: darkMode ? '#7E8EA6' : '#999',
        },
      ]}
      numberOfLines={2}>
      {truncatePreview(value, 80) || 'Unknown'}
    </Text>
  </View>
);

const getRemoveActionDescription = removeMeta => {
  if (!removeMeta) return null;

  const {action, entryLabel, valueHash} = removeMeta;
  const valueHashText =
    typeof valueHash === 'string' && valueHash.length > 0
      ? ` (hash ${valueHash.substring(0, 10)}...)`
      : '';

  if (action === 4) return 'All active content keys and values';
  if (action === 3) {
    return `All active values under ${entryLabel || 'selected key'}`;
  }
  if (action === 2) {
    return `All active matching values under ${
      entryLabel || 'selected key'
    }${valueHashText}`;
  }
  if (action === 1) {
    return `One active value under ${
      entryLabel || 'selected key'
    }${valueHashText}`;
  }

  return 'Selected content';
};

const renderCmmChangeDescription = (item, updateEntry, darkMode = false, hasContentReview = false) => {
  if (item.changeType === 'included') return null;
  const neutralToneColor = darkMode ? '#7E8EA6' : '#6B7280';
  const updatedPreview = item.isEncrypted && !updateEntry?.signData
    ? 'Encrypted upload (tap to view)'
    : item.updatedData ?? updateEntry?.data ?? item.data;

  if (item.changeType === 'added') {
    if (hasContentReview) return null;
    return renderCmmDescBlock(
      null,
      updatedPreview || 'New value',
      Colors.verusGreenColor,
      false,
      darkMode,
    );
  }

  if (item.changeType === 'removed') {
    if (item.removeMeta) {
      const removeActionDescription = getRemoveActionDescription(item.removeMeta);
      const removesDisplayedActive =
        item.removeMeta.action === 3 || item.removeMeta.action === 4;

      return (
        <>
          {item.data != null &&
            !item.hideOldData &&
            renderCmmDescBlock(
              'Active',
              item.data,
              neutralToneColor,
              removesDisplayedActive,
              darkMode,
            )}
          {!updateEntry?.removalUi && renderCmmDescBlock(
            null,
            removeActionDescription || 'Selected content',
            Colors.warningButtonColor,
            false,
            darkMode,
          )}
        </>
      );
    }

    return renderCmmDescBlock(
      null,
      item.data || 'Unknown value',
      Colors.warningButtonColor,
      true,
      darkMode,
    );
  }

  if (item.changeType === 'appended') {
    return (
      <>
        {item.data != null &&
          renderCmmDescBlock(
            'Existing',
            item.data,
            neutralToneColor,
            false,
            darkMode,
          )}
        {!hasContentReview && renderCmmDescBlock(
          'Add value',
          updatedPreview || 'New value',
          Colors.verusGreenColor,
          false,
          darkMode,
        )}
      </>
    );
  }

  return (
    <Text
      style={{color: darkMode ? '#A9B6CA' : Colors.verusDarkGray}}>
      {item.dataInDescription ? item.data : item.title}
    </Text>
  );
};

const getTonePanelStyle = (item, darkMode = false) => {
  if (item.changeType === 'removed') {
    return darkMode
      ? LocalStyles.cmmCardRemovePanelDark
      : LocalStyles.cmmCardRemovePanel;
  }

  if (isPrivateContentChange(item)) {
    return darkMode
      ? LocalStyles.cmmCardPrivatePanelDark
      : LocalStyles.cmmCardPrivatePanel;
  }

  if (item.changeType === 'added' || item.changeType === 'appended') {
    return darkMode
      ? LocalStyles.cmmCardAddPanelDark
      : LocalStyles.cmmCardAddPanel;
  }

  return null;
};

// The one note for credential data that the wallet encrypts. The Content step
// card and the Confirm step both show it, so it looks the same on both.
export const EncryptedCredentialNote = ({darkMode = false, style}) => (
  <View
    style={[
      LocalStyles.encryptedKeyInfo,
      darkMode && LocalStyles.encryptedKeyInfoDark,
      style,
    ]}>
    <MaterialCommunityIcons
      color={darkMode ? DARK_INFO_COLOR : Colors.primaryColor}
      name="shield-lock-outline"
      size={14}
      style={{marginRight: 6, marginTop: 1}}
    />
    <Text
      style={[
        LocalStyles.encryptedKeyInfoText,
        darkMode && LocalStyles.encryptedKeyInfoTextDark,
      ]}>
      This credential data will be encrypted before it is stored on-chain.
      Neither the credential type nor its contents will be publicly visible.
    </Text>
  </View>
);

const VerusIdContentChangeCard = ({
  children,
  visibilityLabel,
  onPress: onPressProp,
  darkMode: darkModeProp,
  item,
  panelTone = false,
  style,
  updateEntry,
}) => {
  const theme = useOnboardingTheme();
  const darkMode = darkModeProp ?? theme.isDark;
  const badges = getContentChangeBadges(item, darkMode);
  const unnamedKey = isUnnamedKeyTitle(item);
  const showKeyId =
    Boolean(item.keyId) && (unnamedKey || item.removeMeta?.action !== 4);
  const onPress = onPressProp || (
    updateEntry && updateEntry.onPress ? updateEntry.onPress : item.onPress);
  const removalUi = updateEntry?.removalUi;
  // The empty-state note already says this request can add content. Retain
  // the matching-value effects, but show that shared fact only once.
  const removalEffectNote = removalUi?.emptyStateNote
    ? removalUi.effectNote?.replace(/This request may also add[^.]*\./, '').trim()
    : removalUi?.effectNote;

  return (
    <TouchableOpacity
      key={item.key}
      accessibilityRole={onPress ? 'button' : undefined}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      onPress={onPress}
      style={[
        LocalStyles.cmmCard,
        darkMode && LocalStyles.cmmCardDark,
        panelTone && getTonePanelStyle(item, darkMode),
        style,
      ]}>
      <View
        style={[
          LocalStyles.cmmCardHeader,
          showKeyId && LocalStyles.cmmCardHeaderWithKey,
        ]}>
        <View style={LocalStyles.cmmCardTitleBlock}>
          <Text
            style={[
              LocalStyles.cmmCardTitle,
              darkMode && LocalStyles.cmmCardTitleDark,
            ]}>
            {unnamedKey ? 'Unnamed key' : item.title}
          </Text>
        </View>
        {badges.length > 0 && (
          <View style={LocalStyles.cmmCardBadgeRow}>
            {badges.map((badge, idx) => (
              <View
                key={`${badge.label}-${idx}`}
                style={[LocalStyles.badge, {borderColor: badge.color}]}>
                <MaterialCommunityIcons
                  color={badge.color}
                  name={badge.icon}
                  size={12}
                  style={LocalStyles.badgeIcon}
                />
                <Text style={[LocalStyles.badgeText, {color: badge.color}]}>
                  {badge.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {/* The key has its own full-width line, so a 34-character key does
          not wrap beside the badge. */}
      {showKeyId && (
        <Text
          selectable
          style={[
            LocalStyles.cmmCardKeyId,
            LocalStyles.cmmCardKeyIdLine,
            darkMode && LocalStyles.cmmCardKeyIdDark,
          ]}>
          {item.keyId}
        </Text>
      )}

      {visibilityLabel && (
        <View style={{alignItems: 'flex-start', gap: theme.spacing.xs, marginBottom: theme.spacing.xs}}>
          <StatusBadge label={visibilityLabel} tone="neutral" />
        </View>
      )}
      {updateEntry?.unrecognizedRemoval && (
        <>
          <Text style={[theme.typography.bodySm, {color: theme.colors.textSecondary}]}>
            This data uses the removal key but is not a recognized removal instruction. It will still be recorded in the update transaction.
          </Text>
        </>
      )}
      {renderCmmChangeDescription(item, updateEntry, darkMode, children != null)}
      {removalUi && item.showOperationDetails !== false && (
        <View style={{gap: theme.spacing.sm}}>
          {[
            removalUi.detailBody,
            removalEffectNote,
            removalUi.emptyStateNote,
            removalUi.metadataNote,
            removalUi.historyNote,
          ].filter(Boolean).map(note => (
            <Text key={note} selectable style={[theme.typography.bodySm, {color: theme.colors.textSecondary}]}>
              {note}
            </Text>
          ))}
          {item.removeMeta?.valueHash && (
            <InfoSheetRow
              label="Matching value hash"
              value={item.removeMeta.valueHash}
              valueStyle={[LocalStyles.cmmCardKeyId, darkMode && LocalStyles.cmmCardKeyIdDark]}
              copy
            />
          )}
        </View>
      )}
      {children}

      {item.isEncryptedKey && <EncryptedCredentialNote darkMode={darkMode} />}
    </TouchableOpacity>
  );
};

export default VerusIdContentChangeCard;

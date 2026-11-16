/*
  HighRiskStep (Step 2)
  - Shows high-risk VerusID updates as an outcome-first review surface.
*/
import React, {useMemo, useState} from 'react';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {ChevronRight} from 'lucide-react-native';
import {Text} from 'react-native-paper';
import AppButton from '../../../../components/AppButton';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import {
  VERUSID_RECOVERY_AUTH,
  VERUSID_REVOCATION_AUTH,
} from '../../../../utils/constants/verusidObjectData';
import {
  highRiskStepStyles as createHighRiskStepStyles,
} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {withNameBreaks} from '../../../../utils/fullyqualifiedname';
import PrivateAddressChangeValues from '../components/PrivateAddressChangeValues';

const PRIMARY_REVIEW_KEY = 'primary-control';

const AUTHORITY_COPY = {
  recovery: {
    kicker: 'Recovery ID',
    caption: 'Can recover this VerusID',
    detailTitle: 'Recovery VerusID change',
    detailCopy:
      'Review the current and new recovery VerusID before you continue.',
    ackTitle: 'Recovery ID',
    ackCopy: 'The recovery VerusID can change ownership if recovery is used.',
    risk: 'The new recovery VerusID can recover this VerusID if recovery is used.',
  },
  revocation: {
    kicker: 'Revocation ID',
    caption: 'Can revoke this VerusID',
    detailTitle: 'Revocation VerusID change',
    detailCopy:
      'Review the current and new revocation VerusID before you continue.',
    ackTitle: 'Revocation ID',
    ackCopy: 'The revocation VerusID can revoke access to this VerusID.',
    risk: 'The new revocation VerusID can revoke access to this VerusID.',
  },
};

const normalizeAuthority = authority =>
  authority && typeof authority === 'object'
    ? authority
    : {display: authority || null, raw: null};

const displayValue = value => {
  if (value == null) return 'Not available';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const valuesList = values => {
  const filtered = values.filter(Boolean).map(displayValue);
  return filtered.length > 0 ? filtered.join('\n') : 'Not available';
};

const pluralizeCount = (count, singular, plural) =>
  `${count} ${count === 1 ? singular : plural}`;

const getAckRowValue = (rows, label) => {
  const row = rows.find(([rowLabel]) => rowLabel === label);
  return row ? row[1] : null;
};

const contentClearCaption = ackRows => {
  const keyCount = Number(
    getAckRowValue(ackRows, 'Active content keys') ??
      getAckRowValue(ackRows, 'Current keys'),
  );
  const valueCount = Number(
    getAckRowValue(ackRows, 'Active content values') ??
      getAckRowValue(ackRows, 'Current values'),
  );

  if (Number.isFinite(keyCount) && Number.isFinite(valueCount)) {
    return `${pluralizeCount(keyCount, 'key', 'keys')}, ${pluralizeCount(
      valueCount,
      'value',
      'values',
    )}`;
  }

  return 'Active content will be cleared';
};

const contentClearRows = (ackRows, rawValue, clearedKeys) => [
  ...(ackRows.length > 0
    ? ackRows
    : [['Action', 'Clear active VerusID content']]),
  ...(Array.isArray(clearedKeys) && clearedKeys.length > 0
    ? [[clearedKeys.length === 1 ? 'Key that clears' : 'Keys that clear', clearedKeys.join('\n')]]
    : []),
  ['Raw request value', rawValue],
];

const primaryChangeLabel = (addedCount, removedCount) => {
  if (addedCount > 0 && removedCount > 0) return 'Replace primary address';
  if (addedCount > 0) return 'Add primary address';
  if (removedCount > 0) return 'Remove primary address';
  return 'Change primary address';
};

const primaryChangeValue = change => {
  const rawValue = change.rawData || change.data;
  if (change.data && rawValue && change.data !== rawValue) {
    return `${rawValue}\n${change.data}`;
  }

  return rawValue;
};

const primaryInfoValue = item => {
  const rawValue = item.address || item.displayAddress;
  if (item.displayAddress && rawValue && item.displayAddress !== rawValue) {
    return `${rawValue}\n${item.displayAddress}`;
  }

  return rawValue;
};

const primaryAddressRows = (added, removed, primaryInfo, result) => {
  const rows = [['Change', primaryChangeLabel(added.length, removed.length)]];

  if (removed.length > 0) {
    rows.push([
      removed.length === 1
        ? 'Removed primary address'
        : 'Removed primary addresses',
      valuesList(removed.map(primaryChangeValue)),
    ]);
  }

  if (added.length > 0) {
    rows.push([
      added.length === 1 ? 'Added primary address' : 'Added primary addresses',
      valuesList(added.map(primaryChangeValue)),
    ]);
  }

  if (
    primaryInfo != null &&
    Array.isArray(primaryInfo.addresses) &&
    primaryInfo.addresses.length > 0
  ) {
    rows.push([
      'Primary addresses after update',
      valuesList(primaryInfo.addresses.map(primaryInfoValue)),
    ]);
  }

  rows.push(['Result', result]);

  return rows;
};

const primaryAckRows = (added, removed) => [
  removed.length > 0
    ? [
        removed.length === 1
          ? 'Removed primary address'
          : 'Removed primary addresses',
        valuesList(removed.map(primaryChangeValue)),
      ]
    : null,
  added.length > 0
    ? [
        added.length === 1 ? 'Added primary address' : 'Added primary addresses',
        valuesList(added.map(primaryChangeValue)),
      ]
    : null,
].filter(Boolean);

const primaryActionValue = (addedCount, removedCount) => {
  if (addedCount > 0 && removedCount > 0) return 'Replaced';
  if (addedCount > 0) return 'Added';
  if (removedCount > 0) return 'Removed';
  return 'Changed';
};

// Shown on the step itself, so the user sees who controls the VerusID after
// the update without opening the details: every primary address after the
// update, marked by whether this wallet holds it, then the removed ones.
const primaryChangeLines = (added, removed, primaryInfo) => {
  const removedLines = removed.map(change => ({
    label: 'Removed',
    value: change.rawData || change.data,
    mono: true,
  }));

  if (!Array.isArray(primaryInfo?.addresses) || primaryInfo.addresses.length === 0) {
    return [
      ...removedLines,
      ...added.map(change => ({
        label: 'Added',
        value: change.rawData || change.data,
        mono: true,
        emphasis: true,
      })),
    ];
  }

  const addedAddresses = new Set(added.map(change => change.rawData || change.data));
  return [
    ...primaryInfo.addresses.map(item => {
      const address = item.address || item.displayAddress;
      return {
        label: item.inWallet ? 'This wallet' : 'Not in this wallet',
        value: address,
        mono: true,
        emphasis: addedAddresses.has(address),
      };
    }),
    ...removedLines,
  ];
};

// The signature rule in plain words, for the addresses after the update.
const signatureRuleLine = primaryInfo => {
  if (!Array.isArray(primaryInfo?.addresses) || primaryInfo.addresses.length === 0) return null;
  const count = primaryInfo.addresses.length;
  const required = primaryInfo.minimumSignatures ?? 1;

  if (count === 1) return 'This address alone controls this VerusID.';
  if (required <= 1) return `1 of ${count}: each address can control this VerusID alone.`;
  return `${required} of ${count}: ${required} addresses must sign together to control this VerusID.`;
};

// A name, with its i-address on the next line when both are known.
const nameWithAddress = (name, address) =>
  name && address && name !== address ? `${name}\n${address}` : address || name;

const addAuthorityDetailRows = (rows, type, currentAuthority, change) => {
  const label = type === 'recovery' ? 'recovery' : 'revocation';
  const current = normalizeAuthority(currentAuthority);
  const newRaw = change.rawData || change.data;

  if (current.display && current.display !== current.raw) {
    rows.push([`Current ${label} ID`, current.display]);
  }

  if (current.raw || current.display) {
    rows.push(['Current i-address', current.raw || current.display]);
  }

  if (change.data && change.data !== newRaw) {
    rows.push([`New ${label} ID`, change.data]);
  }

  rows.push(['New i-address', newRaw || 'Not available']);
};

const buildPrimaryReviewItem = (primaryChanges, primaryInfo) => {
  if (primaryChanges.length === 0) return null;

  const added = primaryChanges.filter(change => change.type === 'primary-add');
  const removed = primaryChanges.filter(
    change => change.type === 'primary-remove',
  );
  const hasPrimaryInfo =
    primaryInfo != null &&
    Array.isArray(primaryInfo.addresses) &&
    primaryInfo.addresses.length > 0;
  const externalAfterUpdate = hasPrimaryInfo
    ? primaryInfo.addresses.filter(item => !item.inWallet)
    : [];
  const walletLosesControl = hasPrimaryInfo && primaryInfo.walletCount === 0;
  const needsAdditionalSignatures = hasPrimaryInfo &&
    primaryInfo.walletCount < (primaryInfo.minimumSignatures ?? 1);
  // With one required signature, an added address does not share control: it
  // can act alone.
  const oneSignatureEnough = hasPrimaryInfo && (primaryInfo.minimumSignatures ?? 1) <= 1;
  const addsExternalPrimary = added.some(change => change.walletMatch === false);
  const hasExternalPrimaryAfterUpdate = externalAfterUpdate.length > 0;
  const result = walletLosesControl
    ? 'Wallet primary control removed'
    : needsAdditionalSignatures
    ? 'Additional signatures required'
    : addsExternalPrimary
    ? oneSignatureEnough
      ? 'External address can control alone'
      : 'External address can share control'
    : hasExternalPrimaryAfterUpdate
    ? 'External address remains a controller'
    : 'Wallet remains a primary controller';
  const rows = primaryAddressRows(added, removed, primaryInfo, result);
  const lines = primaryChangeLines(added, removed, hasPrimaryInfo ? primaryInfo : null);
  const ruleLine = signatureRuleLine(hasPrimaryInfo ? primaryInfo : null);
  if (hasPrimaryInfo) rows.push(['Required signatures', primaryInfo.minimumSignatures ?? 1]);
  const ackRows = primaryAckRows(added, removed);
  const actionValue = primaryActionValue(added.length, removed.length);

  if (walletLosesControl) {
    return {
      key: PRIMARY_REVIEW_KEY,
      kind: 'primary',
      kicker: 'Primary control',
      value: actionValue,
      lines,
      caption: 'Wallet loses control',
      tone: 'danger',
      losesWalletControl: true,
      addsExternalPrimary,
      detailTitle:
        added.length > 0
          ? 'Primary address replacement'
          : 'Primary address removal',
      detailCopy:
        'Review the exact primary address changes before you continue.',
      ackTitle: 'Primary address',
      ackCopy:
        'This update removes wallet primary-address control from this wallet.',
      rows,
      ackRows,
      risk:
        'After this update, this wallet will no longer have primary-address ' +
        'control of this VerusID.',
    };
  }

  return {
    key: PRIMARY_REVIEW_KEY,
    kind: 'primary',
    kicker: 'Primary control',
    value: actionValue,
    lines,
    caption: needsAdditionalSignatures
      ? 'Your wallet will need additional signatures after this update'
      : ruleLine
      ? ruleLine
      : addsExternalPrimary
      ? 'Gives an external address control'
      : hasExternalPrimaryAfterUpdate
      ? 'External address remains a controller'
      : 'Wallet remains in control',
    tone: addsExternalPrimary ? 'warning' : undefined,
    addsExternalPrimary,
    detailTitle: 'Primary address change',
    detailCopy: 'Review the exact primary address change before you continue.',
    ackTitle: 'Primary address',
    ackCopy: addsExternalPrimary
      ? oneSignatureEnough
        ? 'An external primary address can control this VerusID alone.'
        : 'An external primary address can share control of this VerusID.'
      : removed.length > 0 && added.length === 0
      ? 'A primary address is being removed from this VerusID.'
      : 'The primary addresses that control this VerusID are changing.',
    rows,
    ackRows,
    risk: needsAdditionalSignatures
      ? `After this update, your wallet will have ${primaryInfo.walletCount} primary addresses, but ${primaryInfo.minimumSignatures} signatures will be required to authorize this VerusID.`
      : addsExternalPrimary
      ? oneSignatureEnough
        ? 'This address can spend, sign and update for this VerusID without this wallet.'
        : 'This address can participate in future control decisions for this VerusID.'
      : 'Primary addresses control who can spend and sign for this VerusID.',
  };
};

const buildAuthorityReviewItem = (change, type, currentAuthorities) => {
  if (!change) return null;

  const copy = AUTHORITY_COPY[type];
  const current = normalizeAuthority(currentAuthorities?.[type]);
  const newRaw = change.rawData || change.data;
  const rows = [];
  addAuthorityDetailRows(rows, type, current, change);

  const currentName = current.display || current.raw;
  const label = type === 'recovery' ? 'recovery' : 'revocation';

  return {
    key: type,
    kind: 'authority',
    kicker: copy.kicker,
    value: change.data || displayValue(newRaw),
    lines: [
      currentName ? {label: 'Current', value: currentName} : null,
      {
        label: 'New',
        value: change.data || newRaw || 'Not available',
        emphasis: true,
      },
    ].filter(Boolean),
    caption: copy.caption,
    // Both authorities can take control in their own way; red stays for a
    // change that removes this wallet's control.
    tone: 'warning',
    detailTitle: copy.detailTitle,
    detailCopy: copy.detailCopy,
    ackTitle: copy.ackTitle,
    ackCopy: copy.ackCopy,
    rows,
    risk: copy.risk,
    ackRows: [
      currentName
        ? [`Current ${label} ID`, nameWithAddress(current.display, current.raw)]
        : null,
      [
        `New ${label} ID`,
        nameWithAddress(change.data, newRaw) || 'Not available',
      ],
    ].filter(Boolean),
  };
};

const buildFallbackReviewItem = (change, primaryInfo) => {
  if (change.highRiskType === 'private-address') {
    return {
      key: change.key,
      kind: 'fallback',
      highRiskType: change.highRiskType,
      beforeAddress: change.beforeAddress,
      afterAddress: change.afterAddress,
      kicker: change.title,
      value: !change.afterAddress
        ? 'Removed'
        : change.beforeAddress ? 'Replaced' : 'Added',
      // The only place this change shows before the acknowledgement, so the
      // card states both values, as the authority cards do.
      lines: [
        {
          label: 'Current',
          value: change.beforeAddress || 'No private address',
          mono: !!change.beforeAddress,
        },
        {
          label: 'After update',
          value: change.afterAddress || 'No private address',
          mono: !!change.afterAddress,
          emphasis: true,
        },
      ],
      caption: change.warning,
      detailTitle: change.title,
      detailCopy: change.warning,
      ackTitle: change.title,
      ackCopy: change.warning,
      risk: null,
    };
  }
  const value = change.rawData || change.data;
  const isContentClear = change.highRiskType === 'content-clear';
  // Say each fact once: the threshold is the row value, its use is the
  // caption, and the effect on this wallet is the subtitle.
  if (change.highRiskType === 'signature-threshold' && primaryInfo) {
    const {walletCount, minimumSignatures, externalCount} = primaryInfo;
    const needsMore = walletCount < minimumSignatures;
    const threshold =
      change.data || `${minimumSignatures} of ${primaryInfo.addresses.length}`;
    const use =
      'Spending, signing, and ordinary VerusID updates need these signatures.';
    const outcome = needsMore
      ? 'After this update, your wallet cannot authorize this VerusID alone.'
      : externalCount > 0
      ? 'Your wallet can still authorize this VerusID alone. External addresses can also sign.'
      : 'After this update, all primary addresses are in your wallet.';
    const rows = [
      ['Required signatures', threshold],
      ['Primary addresses in this wallet', walletCount],
      ['Primary addresses after update', valuesList(primaryInfo.addresses.map(primaryInfoValue))],
    ];
    return {
      key: change.key,
      kind: 'fallback',
      highRiskType: change.highRiskType,
      kicker: 'Required signatures',
      value: threshold,
      caption: use,
      detailTitle: 'Change required signatures',
      detailCopy: use,
      ackTitle: `Required signatures: ${threshold}`,
      ackCopy: `${use} ${outcome}`,
      rows,
      ackRows: rows.slice(1),
      risk: outcome,
    };
  }
  if (change.highRiskType === 'identity-state') {
    const rows = [
      ['Current status', change.before.status],
      ['Current flags', change.before.flags],
      ['Current timelock', change.before.timelock],
      ['After update', change.after.status],
      ['Resulting flags', change.after.flags],
      ['Resulting timelock', change.after.timelock],
    ];
    return {
      key: change.key,
      kind: 'fallback',
      highRiskType: change.highRiskType,
      kicker: change.title,
      value: change.after.status,
      caption: `Current status: ${change.before.status}`,
      detailTitle: change.title,
      detailCopy: change.lockExplanation || change.warning,
      ackTitle: change.title,
      ackCopy: change.warning,
      rows,
      ackRows: rows,
      risk: change.warning,
    };
  }
  const ackRows =
    Array.isArray(change.ackRows) && change.ackRows.length > 0
      ? change.ackRows
      : [['Value', displayValue(value)]];

  if (isContentClear) {
    return {
      key: change.key,
      kind: 'fallback',
      highRiskType: change.highRiskType,
      kicker: 'Will clear',
      value: 'All active content',
      caption: `${contentClearCaption(ackRows)}. Apps stop receiving these keys and values. Earlier on-chain versions can still be public.`,
      tone: 'warning',
      detailTitle: 'Technical details',
      detailCopy: 'Request data for the content-clear action.',
      ackTitle: 'Clear active content',
      ackCopy:
        "Confirm that this VerusID's active content should be cleared.",
      rows: contentClearRows(ackRows, value, change.clearedKeys),
      ackRows,
      risk: null,
    };
  }

  return {
    key: change.key,
    kind: 'fallback',
    highRiskType: change.highRiskType,
    kicker: change.title || 'High-risk change',
    value: 'Changed',
    caption: change.warning || 'Review before continuing',
    detailTitle: change.title || 'High-risk change',
    detailCopy: change.warning || 'Review this high-risk change before you continue.',
    ackTitle: change.title || 'High-risk change',
    ackCopy: change.warning || 'This change may affect this VerusID.',
    rows: [
      ['Change', change.title || 'High-risk change'],
      ['Value', displayValue(value)],
    ],
    ackRows,
    risk: change.warning || null,
  };
};

const CONTENT_CLEAR_SUBTITLE =
  "After you confirm, apps that read this VerusID's active content stop receiving these keys and values. " +
  'Earlier on-chain versions may still be publicly retrievable.';

export const buildScreenCopy = reviewItems => {
  const primary = reviewItems.find(item => item.kind === 'primary');
  const fallbackItems = reviewItems.filter(item => item.kind === 'fallback');
  const hasRecovery = reviewItems.some(item => item.key === 'recovery');
  const hasRevocation = reviewItems.some(item => item.key === 'revocation');
  const primaryLosesControl = Boolean(primary?.losesWalletControl);
  const primaryAddsExternal = Boolean(primary?.addsExternalPrimary);
  const contentClearItem = fallbackItems.find(
    item => item.highRiskType === 'content-clear',
  );
  const otherFallbackItem = fallbackItems.find(
    item => item.highRiskType !== 'content-clear',
  );

  if (reviewItems.length === 1) {
    if (contentClearItem) {
      return {
        title: 'Clear active VerusID content',
        subtitle: CONTENT_CLEAR_SUBTITLE,
        note: null,
      };
    }

    if (otherFallbackItem) {
      return {
        title: otherFallbackItem.detailTitle || 'Confirm high-risk change',
        subtitle:
          otherFallbackItem.risk ||
          otherFallbackItem.caption ||
          'Review this high-risk change before you continue.',
        note: 'Review the exact change before continuing.',
      };
    }

    if (primaryLosesControl) {
      return {
        title: 'Confirm loss of control',
        subtitle: 'This update removes wallet primary-address control.',
        note:
          'Only continue if this wallet should lose primary control of this VerusID.',
      };
    }

    if (primaryAddsExternal) {
      return {
        title: 'Confirm shared control',
        subtitle:
          'This update adds an external address as a primary controller.',
        note:
          'Only continue if this address should be able to control this VerusID.',
      };
    }

    if (hasRecovery) {
      return {
        title: 'Confirm recovery change',
        subtitle: 'This update changes the recovery VerusID.',
        note:
          'Only continue if the new recovery VerusID should be able to recover this VerusID.',
      };
    }

    if (hasRevocation) {
      return {
        title: 'Confirm revocation change',
        subtitle: 'This update changes the revocation VerusID.',
        note:
          'Only continue if the new revocation VerusID should be able to revoke this VerusID.',
      };
    }
  }

  if (contentClearItem) {
    const alsoAffectsControlOrAuthority =
      Boolean(primary) || hasRecovery || hasRevocation;
    return {
      title: 'Confirm high-risk changes',
      subtitle: alsoAffectsControlOrAuthority
        ? 'These changes affect active VerusID content and VerusID control or authority.'
        : 'These changes affect active VerusID content and other high-risk VerusID settings.',
      note:
        'Review the content clear and every other high-risk change before continuing.',
    };
  }

  if (!primary && hasRecovery && hasRevocation) {
    return {
      title: 'Confirm authority changes',
      subtitle:
        'This update changes the recovery and revocation VerusIDs.',
      note: 'Review both authority changes before continuing.',
    };
  }

  if (primaryLosesControl && hasRecovery && hasRevocation) {
    return {
      title: 'Confirm high-risk changes',
      subtitle:
        'These changes remove wallet control and change recovery and revocation authority.',
      note: 'Review every authority change before continuing.',
    };
  }

  if (primaryLosesControl && hasRecovery) {
    return {
      title: 'Confirm high-risk changes',
      subtitle:
        'These changes remove wallet control and change recovery authority.',
      note:
        'Review both the primary control change and recovery authority before continuing.',
    };
  }

  if (primaryLosesControl && hasRevocation) {
    return {
      title: 'Confirm high-risk changes',
      subtitle:
        'These changes remove wallet control and change revocation authority.',
      note:
        'Review both the primary control change and revocation authority before continuing.',
    };
  }

  if (primaryAddsExternal && hasRecovery && hasRevocation) {
    return {
      title: 'Confirm high-risk changes',
      subtitle:
        'These changes affect who controls, recovers, and can revoke this VerusID.',
      note: 'Review control, recovery, and revocation changes before continuing.',
    };
  }

  if (primaryAddsExternal && hasRecovery) {
    return {
      title: 'Confirm high-risk changes',
      subtitle:
        'These changes affect who controls and recovers this VerusID.',
      note: 'Review both control and recovery authority before continuing.',
    };
  }

  if (primaryAddsExternal && hasRevocation) {
    return {
      title: 'Confirm high-risk changes',
      subtitle:
        'These changes affect who controls and can revoke this VerusID.',
      note: 'Review both control and revocation authority before continuing.',
    };
  }

  if (!primary && otherFallbackItem) {
    return {
      title: 'Confirm high-risk changes',
      subtitle:
        otherFallbackItem.risk ||
        otherFallbackItem.caption ||
        'Review every high-risk change before continuing.',
      note: 'Review every high-risk change before continuing.',
    };
  }

  return {
    title: 'Confirm high-risk changes',
    subtitle:
      'These changes can affect who controls, recovers, or revokes this VerusID.',
    note: 'Review every high-risk change before continuing.',
  };
};

const HighRiskStep = ({
  requestCard,
  highRiskChanges,
  identityStateChange,
  primaryAddressAfterUpdateInfo,
  ackSheetVisible,
  onCloseAckSheet,
  onUnderstandAck,
  currentAuthorities,
  styles: parentStyles,
}) => {
  const theme = useOnboardingTheme();
  const localStyles = useMemo(
    () => createHighRiskStepStyles(theme),
    [theme],
  );
  const [activeDetailKey, setActiveDetailKey] = useState(null);

  const reviewItems = useMemo(() => {
    const changes = highRiskChanges || [];
    const primaryChanges = changes.filter(change =>
      change.type?.startsWith('primary-'),
    );
    const authorityChanges = {
      recovery: changes.find(change => change.key === VERUSID_RECOVERY_AUTH.key),
      revocation: changes.find(
        change => change.key === VERUSID_REVOCATION_AUTH.key,
      ),
    };
    const usedKeys = new Set([
      ...primaryChanges.map(change => change.key),
      authorityChanges.recovery?.key,
      authorityChanges.revocation?.key,
    ].filter(Boolean));

    return [
      buildPrimaryReviewItem(primaryChanges, primaryAddressAfterUpdateInfo),
      buildAuthorityReviewItem(
        authorityChanges.recovery,
        'recovery',
        currentAuthorities,
      ),
      buildAuthorityReviewItem(
        authorityChanges.revocation,
        'revocation',
        currentAuthorities,
      ),
      ...changes
        .filter(change => !usedKeys.has(change.key))
        .map(change => buildFallbackReviewItem(change, primaryAddressAfterUpdateInfo)),
    ].filter(Boolean);
  }, [currentAuthorities, highRiskChanges, primaryAddressAfterUpdateInfo]);

  const screenCopy = buildScreenCopy(reviewItems);
  const activeDetailItem = reviewItems.find(item => item.key === activeDetailKey);

  return (
    <View style={localStyles.root}>
      <ScrollView
        style={parentStyles.scrollView}
        contentContainerStyle={[parentStyles.scrollContent, {paddingTop: 4}]}
        showsVerticalScrollIndicator={false}>
        {/* A lone change states its case in its own row; the caption sums up several. */}
        {requestCard &&
          React.cloneElement(requestCard, {
            caption: reviewItems.length > 1 ? screenCopy.subtitle : undefined,
          })}

        <View style={localStyles.summaryPanel}>
          <View style={localStyles.changeList}>
            {reviewItems.map((item, index) => {
              const kicker = (
                <Text
                  style={[
                    localStyles.changeKicker,
                    item.tone === 'warning' && localStyles.changeKickerWarning,
                    item.tone === 'danger' && localStyles.changeKickerDanger,
                  ]}>
                  {item.kicker}
                </Text>
              );
              const viewAffordance = (
                <View style={localStyles.changeViewGroup}>
                  <ChevronRight color={theme.colors.textSecondary} size={22} />
                </View>
              );
              const caption = (
                <Text style={localStyles.changeCaption}>{item.caption}</Text>
              );

              return (
                <TouchableOpacity
                  key={item.key}
                  accessibilityLabel={`View ${item.kicker}: ${item.value} details`}
                  accessibilityRole="button"
                  activeOpacity={0.74}
                  onPress={() => setActiveDetailKey(item.key)}
                  style={[
                    localStyles.changeRow,
                    index === 0 && localStyles.changeRowFirst,
                    index === reviewItems.length - 1 &&
                      localStyles.changeRowLast,
                  ]}>
                  {item.lines ? (
                    // Names and addresses get the full row width, so they
                    // show in full instead of a cut middle.
                    <View style={localStyles.changeMain}>
                      <View style={localStyles.changeHeader}>
                        {kicker}
                        {viewAffordance}
                      </View>
                      {item.lines.map((line, lineIndex) => (
                        <View
                          key={`${line.label}-${lineIndex}`}
                          style={localStyles.changeLine}>
                          <Text style={localStyles.changeLineLabel}>
                            {line.label}
                          </Text>
                          <Text
                            style={[
                              localStyles.changeLineValue,
                              line.emphasis &&
                                localStyles.changeLineValueEmphasis,
                              line.mono && localStyles.changeLineValueMono,
                            ]}>
                            {line.mono ? line.value : withNameBreaks(line.value)}
                          </Text>
                        </View>
                      ))}
                      {caption}
                    </View>
                  ) : (
                    <>
                      <View style={localStyles.changeMain}>
                        {kicker}
                        <Text
                          ellipsizeMode="middle"
                          numberOfLines={
                            ['identity-state', 'signature-threshold'].includes(
                              item.highRiskType,
                            )
                              ? undefined
                              : 1
                          }
                          style={localStyles.changeValue}>
                          {item.value}
                        </Text>
                        {caption}
                      </View>
                      {viewAffordance}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {screenCopy.note ? (
          <Text style={localStyles.quietNote}>{screenCopy.note}</Text>
        ) : null}
      </ScrollView>

      <BottomSheetModal
        visible={activeDetailItem != null}
        onClose={() => setActiveDetailKey(null)}
        maxHeight="78%">
        {activeDetailItem != null && (
          <View style={localStyles.sheetContent}>
            <ScrollView
              style={localStyles.sheetScroll}
              contentContainerStyle={localStyles.sheetScrollContent}
              showsVerticalScrollIndicator={false}>
              <Text style={localStyles.sheetTitle}>
                {activeDetailItem.detailTitle}
              </Text>
              <Text style={localStyles.sheetCopy}>
                {activeDetailItem.detailCopy}
              </Text>
              <View style={localStyles.detailRows}>
                {activeDetailItem.highRiskType === 'private-address' ? (
                  <PrivateAddressChangeValues change={activeDetailItem} />
                ) : activeDetailItem.rows.map(([label, value]) => (
                  <View key={label} style={localStyles.detailRow}>
                    <Text style={localStyles.detailLabel}>{label}</Text>
                    <Text selectable style={localStyles.detailValue}>
                      {displayValue(value)}
                    </Text>
                  </View>
                ))}
              </View>
              {activeDetailItem.risk ? (
                <Text style={localStyles.detailRisk}>
                  {activeDetailItem.risk}
                </Text>
              ) : null}
            </ScrollView>
            <AppButton
              height={56}
              onPress={() => setActiveDetailKey(null)}
              style={localStyles.sheetButton}
              themeMode={theme.mode}
              variant="secondary">
              Done
            </AppButton>
          </View>
        )}
      </BottomSheetModal>

      <BottomSheetModal
        visible={ackSheetVisible}
        onClose={onCloseAckSheet}
        maxHeight="70%">
        <View style={localStyles.sheetContent}>
          <ScrollView
            style={localStyles.sheetScroll}
            contentContainerStyle={localStyles.sheetScrollContent}
            showsVerticalScrollIndicator={false}>
            <Text style={localStyles.sheetTitle}>Understand high-risk changes</Text>
            <View style={localStyles.sheetRows}>
              {reviewItems.map(item => (
                <View key={item.key} style={localStyles.sheetRow}>
                  <Text style={localStyles.sheetRowTitle}>{item.ackTitle}</Text>
                  <Text style={localStyles.sheetRowCopy}>{item.ackCopy}</Text>
                  {item.highRiskType === 'private-address' ? (
                    <PrivateAddressChangeValues change={item} compact />
                  ) : Array.isArray(item.ackRows) && item.ackRows.length > 0 ? (
                    <View style={localStyles.sheetAckRows}>
                      {item.ackRows.map(([label, value]) => (
                        <View key={label} style={localStyles.sheetAckRow}>
                          <Text style={localStyles.sheetAckLabel}>{label}</Text>
                          <Text selectable style={localStyles.sheetAckValue}>
                            {displayValue(value)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </ScrollView>
          <AppButton
            height={56}
            onPress={onUnderstandAck}
            style={localStyles.sheetButton}
            themeMode={theme.mode}
            variant="primary">
            I understand
          </AppButton>
        </View>
      </BottomSheetModal>
    </View>
  );
};

export default HighRiskStep;

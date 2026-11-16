import {identityUploadToDisplayJson} from '../../../utils/identityUpdate/uploadDisplay';
import {identityToDisplayJson} from '../../../utils/identityUpdate/identityDisplay';
import {escapeContentReviewText} from '../../../utils/identityUpdate/contentReview';
import {useRequestBackHandler} from '../useRequestNavigation';
/*
  IdentityUpdateRequestInfo
  - 2026-02-02: Complete UI overhaul to match Wallet/Identity/SendWizard patterns.
  - 2026-02-05: Removed the separate Encrypted Uploads section.
    Content-multimap updates now carry encrypted flags for inline badges.
  - 2026-02-05: Refactored into a multi-step stepper that consolidates the entire
    identity update flow into a single screen. Bypasses IdentityUpdatePaymentConfiguration
    and the UpdateIdentity SendModal entirely.
  - 2026-02-05: Split into 4 steps: Overview -> Content Changes -> High-Risk Ack ->
    Confirm+Pay. Content changes got their own dedicated step with full-screen
    VerusIdObjectData. Fund source selection moved to a SemiModal sheet inside
    the Confirm step instead of a separate screen.
  - 2026-02-06: High-risk step shows primary-address deltas (add/remove) and
    flags new addresses not in wallet.
  - 2026-02-06: Fixed wallet address derivation ordering so "in wallet" matching
    is reliable during the High-risk step.
  - 2026-03-06: Clarified current-content removal copy  and added remove-action
    detail content that explains historical on-chain visibility.
  - 2026-06-17: High-risk acknowledgement moved from inline checkbox to a
    bottom sheet, with row-level detail sheets for primary/recovery/revocation.
*/
import React, {useMemo, useState, useEffect, useCallback} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {primitives} from 'verusid-ts-client';
import {Portal, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Info} from 'lucide-react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import CopyAction from '../../../components/CopyAction';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {blocksToTime, unixToDate} from '../../../utils/math';
import {useSelector} from 'react-redux';
import {
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../../actions/actionDispatchers';
import {getSystemNameFromSystemId} from '../../../utils/CoinData/CoinData';
import {
  createAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import ListSelectionModal from '../../../components/ListSelectionModal/ListSelectionModal';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {
  VERUSID_AUTH_INFO,
  VERUSID_BASE_INFO,
  VERUSID_CMM_DATA,
  VERUSID_CMM_INFO,
  VERUSID_PRIMARY_ADDRESS,
  VERUSID_PRIVATE_ADDRESS,
  VERUSID_PRIVATE_INFO,
  VERUSID_RECOVERY_AUTH,
  VERUSID_REVOCATION_AUTH,
} from '../../../utils/constants/verusidObjectData';
import {getCmmDataLabel} from '../../../utils/vdxf/cmmDataLabel';
import {getVDXFKeyLabel} from '../../../utils/vdxf/vdxfTypeLabels';
import {capitalizeString} from '../../../utils/stringUtils';
import {
  ContentMultiMapRemoveKey,
  DATA_TYPE_DEFINEDKEY,
  GenericRequest,
  IDENTITY_CREDENTIAL,
  IdentityUpdateRequestDetails,
  KvMap,
} from 'verus-typescript-primitives';
import AppButton from '../../../components/AppButton';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';

import ReviewStep from './steps/ReviewStep';
import {RequestCard, RequestCardCompact} from '../components/RequestReview';
import ContentStep from './steps/ContentStep';
import HighRiskStep from './steps/HighRiskStep';
import ConfirmPayStep from './steps/ConfirmPayStep';
import {classifyChanges} from './utils/classifyChanges';
import {buildContentMultiMapRemoveUi} from './utils/contentMultiMapRemoveUi';
import {
  identityUpdateRequestInfoStyles as createIdentityUpdateRequestInfoStyles,
} from '../../../styles';
import {
  OnboardingThemeProvider,
  useOnboardingTheme,
} from '../../../theme/onboarding';
import {accountIsTestnet} from '../../../utils/account/accountNetwork';
import {extractContentMultiMapRemoveMeta, splitContentMultiMapUpdates} from './utils/contentMultiMapUpdates';
import {buildIdentityStateChange} from './utils/buildIdentityStateChange';

// Step identifiers
const STEP_REVIEW = 0;
const STEP_CONTENT = 1;
const STEP_HIGH_RISK = 2;
const STEP_CONFIRM_PAY = 3;
const CMM_CLEAR_MAP_SENTINEL = '__CMM_CLEAR__';

// The footer reason row of the authentication and app-encryption reviews.
const walletGateStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  icon: {
    width: 16,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    letterSpacing: 0,
  },
});

const formatRawData = value => {
  if (value == null) return '';
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

const RawDataSheet = ({
  visible,
  title,
  rawData,
  onClose,
  onClosed,
  styles,
  theme,
}) => {
  const rawText = useMemo(
    () => (rawData != null ? formatRawData(rawData) : ''),
    [rawData],
  );
  const displayText = escapeContentReviewText(rawText);

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      maxHeight="70%">
      <View style={styles.rawDataSheetContent}>
        <Text style={styles.rawDataSheetTitle}>{title || 'Raw data'}</Text>
        <View style={styles.rawDataSheetHeader}>
          <Text style={styles.rawDataSheetLabel}>Raw data</Text>
          <CopyAction
            accessibilityLabel="Copy raw data"
            copiedAccessibilityLabel="Raw data copied"
            color={theme.colors.textSubtle}
            copiedColor={theme.colors.success}
            style={styles.rawDataSheetCopyButton}
            value={rawText}
          />
        </View>
        <ScrollView
          style={styles.rawDataSheetScroll}
          contentContainerStyle={styles.rawDataSheetScrollContent}>
          <Text selectable={displayText === rawText} style={styles.rawDataSheetValue}>
            {displayText}
          </Text>
        </ScrollView>
        <AppButton
          height={56}
          onPress={onClose}
          style={styles.rawDataSheetDone}
          themeMode={theme.mode}
          variant="secondary">
          Done
        </AppButton>
      </View>
    </BottomSheetModal>
  );
};

const buildChangeSummaryItems = (highRiskCount, contentCount) => {
  const items = [];

  if (highRiskCount > 0) {
    items.push({
      key: 'high-risk',
      tone: 'danger',
      label: `${highRiskCount} high-risk`,
    });
  }

  if (contentCount > 0) {
    items.push({
      key: 'content',
      tone: 'normal',
      label: `${contentCount} content`,
    });
  }

  return items;
};

const IdentityUpdateRequestInfoContent = props => {
  const {
    detailsBufferString,
    requestBufferString,
    responseBufferString,
    sigtime,
    cancel,
    signerFqn,
    signerSystemID,
    signerSystemName,
    signerIdentityID,
    coinObj,
    chainInfo,
    subjectIdentity,
    subjectIdentityContent,
    identityUpdates,
    friendlyNames,
    cmmDataKeys,
    detailIndex,
    deliverIdentityUpdateResponse,
    identityUpdateDeliveryInfo,
    completeIdentityUpdateWithoutDelivery,
    next,
    subjectIdTxHex,
    identityPreviewPrepared,
    hasEncryptedKeys,
  } = props;
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createIdentityUpdateRequestInfoStyles(theme),
    [theme],
  );

  const {fullyqualifiedname, identity} = subjectIdentity;
  const activeContentMultiMap = useMemo(
    () =>
      subjectIdentityContent && subjectIdentityContent.identity
        ? subjectIdentityContent.identity.contentmultimap || {}
        : {},
    [subjectIdentityContent],
  );
  const activeContentSubjectIdentity = useMemo(
    () => ({
      ...subjectIdentity,
      identity: {
        ...(subjectIdentity.identity || {}),
        contentmultimap: activeContentMultiMap,
      },
    }),
    [activeContentMultiMap, subjectIdentity],
  );

  // --- Core state ---
  const [details, setDetails] = useState(new IdentityUpdateRequestDetails());
  const [stepIndex, setStepIndex] = useState(STEP_REVIEW);
  const [acknowledged, setAcknowledged] = useState(false);
  const [highRiskAckSheetVisible, setHighRiskAckSheetVisible] =
    useState(false);
  const [confirmBroadcasting, setConfirmBroadcasting] = useState(false);

  // --- Modal state ---
  const [rawDataSheet, setRawDataSheet] = useState({
    visible: false,
    title: 'Raw data',
    rawData: null,
  });
  const [isListSelectionModalVisible, setIsListSelectionModalVisible] =
    useState(false);
  const [listData, setListData] = useState([]);
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] =
    useState(null);

  // --- Derived values ---
  const friendlyNameMap = new Map(Object.entries(friendlyNames));
  const chainId =
    signerSystemName ||
    (signerSystemID ? getSystemNameFromSystemId(signerSystemID) : null);
  const canOpenSignerModal = Boolean(chainId && signerIdentityID);

  const request = useMemo(() => {
    if (!requestBufferString) return null;
    const req = new GenericRequest();
    req.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);
    return req;
  }, [requestBufferString]);
  const requestIsTestnet =
    request != null ? request.isTestnet() : !!coinObj?.testnet;

  // --- Helper functions ---
  const getVerusId = async (chain, iAddrOrName) => {
    const id = await getIdentity(
      CoinDirectory.getBasicCoinObj(chain).system_id,
      iAddrOrName,
    );
    if (id.error) throw new Error(id.error.message);
    return id.result;
  };

  const displayIdentityAddress = addr => {
    if (friendlyNameMap.has(addr)) return friendlyNameMap.get(addr);
    return addr;
  };

  const getSignDataLabel = signData => {
    if (!signData) return 'Sign data';
    const trim = (value, maxLen = 60) => {
      if (value == null) return '';
      const str = String(value);
      return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
    };
    const dataJson = identityUploadToDisplayJson(signData);
    if (signData.isVdxfData()) return 'VDXF data';
    if (signData.isMMRData()) return 'MMR data';
    if (dataJson.filename) return `Filename: ${trim(dataJson.filename)}`;
    if (dataJson.message) return `Message: ${trim(dataJson.message)}`;
    if (dataJson.messagehex) return `Hex message: ${trim(dataJson.messagehex)}`;
    if (dataJson.messagebase64)
      return `Base64 message: ${trim(dataJson.messagebase64)}`;
    if (dataJson.datahash) return `Data hash: ${trim(dataJson.datahash)}`;
    return 'Sign data';
  };

  const getSignDataRawValue = signData => {
    if (!signData || typeof signData.toCLIJson !== 'function') {
      return null;
    }

    return identityUploadToDisplayJson(signData);
  };

  const getCmmDataKey = iAddr => {
    const keyLabel = getVDXFKeyLabel(iAddr, true);
    if (keyLabel == null) {
      if (cmmDataKeys && cmmDataKeys[iAddr]) return cmmDataKeys[iAddr].label;
      return iAddr.substring(0, 4) + '...' + iAddr.substring(iAddr.length - 4);
    }
    return capitalizeString(keyLabel);
  };

  const normalizeCmmUpdates = updates => {
    if (Array.isArray(updates)) return updates;
    if (updates == null) return [];
    return [updates];
  };

  const toCmmModalObjects = (updates, fallbackKey = null) => {
    const normalizedUpdates = normalizeCmmUpdates(updates);
    return normalizedUpdates.map((entry, index) => {
      const removeMeta = extractContentMultiMapRemoveMeta(entry, fallbackKey);
      const value = removeMeta && Array.isArray(entry) ? entry[0] : entry;
      if (value != null && typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value);

        if (removeMeta && keys.length > 0) {
          const key = keys[0];
          const detailUi = removeMeta
            ? buildContentMultiMapRemoveUi({
                removeMeta,
                fallbackKey,
                currentContentMultiMap: identity.contentmultimap,
                getKeyLabel: getCmmDataKey,
                definedKeyVdxfId: DATA_TYPE_DEFINEDKEY.vdxfid,
              })
            : null;

          return {
            kind: removeMeta ? 'content-remove' : 'vdxf-value',
            key,
            data: value[key],
            rawData: entry,
            meta: detailUi,
          };
        }

        // A remove-shaped value under an ordinary key is data, not an action.
        // Keep its inspector raw so it cannot show the removal-action modal.
        if (keys.length === 1 && keys[0] !== ContentMultiMapRemoveKey.vdxfid) {
          const key = keys[0];
          return {
            kind: 'vdxf-value',
            key,
            data: value[key],
            rawData: entry,
          };
        }
      }

      return {
        kind: 'raw-value',
        key: `raw:${index + 1}`,
        data: entry,
        rawData: entry,
      };
    });
  };

  const toSignDataInspectorItem = signData => ({
    kind: 'sign-data',
    key: 'sign-data',
    data: signData,
    rawData: getSignDataRawValue(signData),
  });

  // --- Display updates ---
  const getDisplayUpdates = () => {
    // subjectIdentity.identity is the chain identity used to prepare the update.
    // An explicit empty vector removes its address but is omitted from JSON.
    const removesPrivateAddress =
      details.identity?.containsPrivateAddresses() &&
      !details.identity.privateAddresses?.length;
    const beforeAddress = identity.privateaddress || null;
    const afterAddress = removesPrivateAddress
      ? null
      : identityUpdates.privateaddress || null;
    const privateAddressChange =
      beforeAddress !== afterAddress && (removesPrivateAddress || !!afterAddress)
        ? {
            data: afterAddress || 'No private address',
            rawData: afterAddress,
            beforeAddress,
            afterAddress,
            highRisk: true,
            highRiskType: 'private-address',
            highRiskTitle: !afterAddress
              ? 'Remove private (Z) address'
              : 'Change private address',
            highRiskWarning: !afterAddress
              ? 'This identity will no longer have a private receiving address.'
              : 'Private payments sent to this identity can be directed to the private address.',
          }
        : null;
    const signDataMap = details.signDataMap || new KvMap();
    const getSignDataForKey = lookupKey => {
      if (signDataMap.hasAddress(lookupKey)) {
        return signDataMap.getByAddress(lookupKey);
      }

      for (const [signDataKey, value] of signDataMap.entries()) {
        if (signDataKey.toString() === lookupKey) {
          return value;
        }
      }

      return null;
    };
    const displayUpdates = {
      [VERUSID_AUTH_INFO.key]: {
        [VERUSID_RECOVERY_AUTH.key]:
          identityUpdates.recoveryauthority &&
          identityUpdates.recoveryauthority !== identity.recoveryauthority
            ? {
                data: displayIdentityAddress(identityUpdates.recoveryauthority),
                rawData: identityUpdates.recoveryauthority,
                onPress: () =>
                  openVerusIdDetailsModal(
                    coinObj.system_id,
                    identityUpdates.recoveryauthority,
                  ),
              }
            : null,
        [VERUSID_REVOCATION_AUTH.key]:
          identityUpdates.revocationauthority &&
          identityUpdates.revocationauthority !== identity.revocationauthority
            ? {
                data: displayIdentityAddress(
                  identityUpdates.revocationauthority,
                ),
                rawData: identityUpdates.revocationauthority,
                onPress: () =>
                  openVerusIdDetailsModal(
                    coinObj.system_id,
                    identityUpdates.revocationauthority,
                  ),
              }
            : null,
      },
      [VERUSID_PRIVATE_INFO.key]: {
        [VERUSID_PRIVATE_ADDRESS.key]: privateAddressChange,
      },
      [VERUSID_BASE_INFO.key]: {},
      [VERUSID_CMM_INFO.key]: {},
    };

    if (
      identityUpdates.minimumsignatures != null &&
      identityUpdates.minimumsignatures !== identity.minimumsignatures
    ) {
      const before = identity.minimumsignatures;
      const after = identityUpdates.minimumsignatures;
      const primaryAddresses = identityUpdates.primaryaddresses || identity.primaryaddresses;
      displayUpdates[VERUSID_AUTH_INFO.key].minimumsignatures = {
        highRisk: true,
        highRiskType: 'signature-threshold',
        data: `${before} of ${identity.primaryaddresses.length} → ${after} of ${primaryAddresses.length}`,
        highRiskTitle: `Required signatures: ${before} of ${identity.primaryaddresses.length} → ${after} of ${primaryAddresses.length}`,
        highRiskWarning: `Spending, signing, and ordinary identity updates will require signatures from ${after} of the ${primaryAddresses.length} primary addresses.${after < before ? ' Fewer signatures will be needed to authorize this identity.' : ' Additional signatures will be needed to authorize this identity.'}`,
      };
    }

    if (
      identityUpdates.primaryaddresses &&
      identityUpdates.primaryaddresses.join(',') !==
        identity.primaryaddresses.join(',')
    ) {
      for (let i = 0; i < identityUpdates.primaryaddresses.length; i++) {
        displayUpdates[VERUSID_AUTH_INFO.key][
          `${VERUSID_PRIMARY_ADDRESS.key}:${i}`
        ] = {
          data: displayIdentityAddress(identityUpdates.primaryaddresses[i]),
          rawData: identityUpdates.primaryaddresses[i],
        };
      }
    }

    // Review the original request, before uploads become transaction references.
    // The request is parsed in an effect, so the first render has no identity yet.
    const requestedContent = detailsBufferString && details.identity
      ? identityToDisplayJson(details.identity).contentmultimap || {}
      : identityUpdates.contentmultimap || {};
    const contentKeys = new Set(Object.keys(requestedContent));
    if (details.containsSignData()) {
      for (const [key] of signDataMap.entries()) contentKeys.add(key.toIAddress());
    }
    for (const key of contentKeys) {
      const updates = requestedContent[key];
      const signData = details.containsSignData() ? getSignDataForKey(key) : null;
      if (signData != null) {
        displayUpdates[VERUSID_CMM_INFO.key][`${VERUSID_CMM_DATA.key}:${key}:upload`] = {
          data: getSignDataLabel(signData),
          signData,
          contentKey: key,
          displayTitle: getCmmDataKey(key),
          isEncrypted: !!signData.encryptToAddress,
          onPress: () => openRawDataSheet(getSignDataRawValue(signData), getCmmDataKey(key)),
        };
      }
      const {removeEntries, nonRemoveUpdates} = splitContentMultiMapUpdates(key, updates);

      // These values have no removal effect, but their bytes are still recorded.
      if (key === ContentMultiMapRemoveKey.vdxfid) {
        const recognizedIndexes = new Set(removeEntries.map(entry => entry.index));
        const values = Array.isArray(updates) ? updates : updates == null ? [] : [updates];
        const unrecognized = values.filter((_, index) => !recognizedIndexes.has(index));
        if (unrecognized.length > 0) {
          displayUpdates[VERUSID_CMM_INFO.key][`${VERUSID_CMM_DATA.key}:${key}:unrecognized`] = {
            data: 'Unrecognized removal data',
            displayTitle: 'Unrecognized removal data',
            contentKey: key,
            rawData: unrecognized,
            unrecognizedRemoval: true,
            onPress: () => openRawDataSheet(unrecognized, 'Unrecognized removal data'),
          };
        }
      }

      if (removeEntries.length > 0) {
        removeEntries.forEach(({update, removeMeta, index}) => {
          const removeUi = buildContentMultiMapRemoveUi({
            removeMeta,
            fallbackKey: key,
            currentContentMultiMap: activeContentMultiMap,
            getKeyLabel: getCmmDataKey,
            definedKeyVdxfId: DATA_TYPE_DEFINEDKEY.vdxfid,
          });
          if (!removeUi) return;
          const targetKey =
            removeMeta.action === 4
              ? CMM_CLEAR_MAP_SENTINEL
              : removeMeta.entryKey || key;
          const baseUpdateKey = `${VERUSID_CMM_DATA.key}:${targetKey}`;
          const updateKey = `${baseUpdateKey}:remove:${key}:${index}`;

          // derive remove-action copy from the current identity state, not from chain permanence.
          displayUpdates[VERUSID_CMM_INFO.key][updateKey] = {
            data: removeUi.summary,
            removalUi: removeUi,
            rawData: [update],
            removeMeta: {
              ...removeMeta,
              entryLabel: removeUi.targetLabel,
            },
            ackRows: [
              ['Action', removeUi.summary],
              ['Target', removeUi.targetLabel],
              ['Active content keys', String(removeUi.currentKeyCount)],
              ['Active content values', String(removeUi.currentValueCount)],
            ],
            highRisk: removeMeta.action === 4,
            highRiskType:
              removeMeta.action === 4 ? 'content-clear' : undefined,
            // The High-risk step lists these keys in its details sheet. Keep
            // the full key ID: an unknown key has only a short label.
            clearedKeys:
              removeMeta.action === 4
                ? Object.keys(activeContentMultiMap).map(id => {
                    const label = getCmmDataKey(id);
                    const shortId =
                      id.substring(0, 4) + '...' + id.substring(id.length - 4);
                    return {id, label: label === shortId ? null : label};
                  })
                : undefined,
            highRiskTitle:
              removeMeta.action === 4
                ? 'Clear active identity content'
                : undefined,
            highRiskWarning:
              removeMeta.action === 4
                ? removeUi.highRiskWarning
                : undefined,
            displayTitle: removeUi.displayTitle,
            onPress: () =>
              openRawDataSheet([update], removeUi.modalTitle),
          };
        });
      }

      if (nonRemoveUpdates.length > 0) {
        const dataLabel = getCmmDataLabel(nonRemoveUpdates);
        const isCredentialKey =
          hasEncryptedKeys && key === IDENTITY_CREDENTIAL.vdxfid;
        displayUpdates[VERUSID_CMM_INFO.key][
          `${VERUSID_CMM_DATA.key}:${key}`
        ] = {
          data: dataLabel,
          rawData: nonRemoveUpdates,
          isEncryptedKey: isCredentialKey,
          onPress: () =>
            openRawDataSheet(
              nonRemoveUpdates.length === 1
                ? nonRemoveUpdates[0]
                : nonRemoveUpdates,
              getCmmDataKey(key),
            ),
        };
      }
    }

    return displayUpdates;
  };

  const getExpiryLabel = () => {
    if (!details.expires()) return '';
    return blocksToTime(
      details.expiryHeight.toNumber() - chainInfo.blocks,
      coinObj.seconds_per_block,
    );
  };

  // --- Modal helpers ---
  const loadSignerVerusId = useCallback(async () => {
    if (!canOpenSignerModal) {
      throw new Error('Signer identity is not available');
    }

    return getVerusId(chainId, signerIdentityID);
  }, [canOpenSignerModal, chainId, signerIdentityID]);

  const loadSignerFriendlyNames = useCallback(
    async identityObj => {
      try {
        return getFriendlyNameMap(
          CoinDirectory.getBasicCoinObj(chainId).system_id,
          identityObj,
        );
      } catch (e) {
        return {
          ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
          ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
        };
      }
    },
    [chainId],
  );

  const openVerusIdDetailsModal = (chain, iAddress) => {
    setVerusIdDetailsModalProps({
      loadVerusId: () => getVerusId(chain, iAddress),
      visible: true,
      animationType: 'slide',
      cancel: () => setVerusIdDetailsModalProps(null),
      loadFriendlyNames: async () => {
        try {
          const identityObj = await getVerusId(chain, iAddress);
          return getFriendlyNameMap(
            CoinDirectory.getBasicCoinObj(chain).system_id,
            identityObj,
          );
        } catch (e) {
          return {
            ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
            ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
          };
        }
      },
      iAddress,
      chain,
    });
  };

  const openRawDataSheet = (rawData, title) => {
    setRawDataSheet({
      visible: true,
      title: title || 'Raw data',
      rawData,
    });
  };

  const closeRawDataSheet = () => {
    setRawDataSheet(previous => ({
      ...previous,
      visible: false,
    }));
  };

  const clearRawDataSheet = () => {
    setRawDataSheet({
      visible: false,
      title: 'Raw data',
      rawData: null,
    });
  };

  // --- Computed state ---
  const [expiryLabel, setExpiryLabel] = useState(getExpiryLabel());
  const [sigDateString, setSigDateString] = useState(unixToDate(sigtime));
  const [displayUpdates, setDisplayUpdates] = useState(getDisplayUpdates());

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const signedIn = useSelector(state => state.authentication.signedIn);
  const activeAccountMatchesRequest =
    signedIn &&
    activeAccount != null &&
    accountIsTestnet(activeAccount) === requestIsTestnet;
  // No wallet on this device can answer the request. The review step disables
  // the wallet action and says why.
  const noRequestNetworkWallet =
    !activeAccountMatchesRequest &&
    !(accounts || []).some(
      account => accountIsTestnet(account) === requestIsTestnet,
    );

  const walletAddresses = useMemo(() => {
    const normalize = addresses => {
      if (!Array.isArray(addresses)) return [];
      return addresses
        .map(entry => (typeof entry === 'string' ? entry : entry?.address))
        .filter(Boolean);
    };

    if (!activeAccount || !coinObj) return [];

    const primaryKey = coinObj.id;
    const fallbackKey = coinObj.mainnet_id;
    const primary = normalize(
      activeAccount?.keys?.[primaryKey]?.vrpc?.addresses,
    );
    if (primary.length > 0) return primary;
    return normalize(activeAccount?.keys?.[fallbackKey]?.vrpc?.addresses);
  }, [activeAccount, coinObj]);

  const primaryAddressAfterUpdateInfo = useMemo(() => {
    const updated = identityUpdates?.primaryaddresses || identity?.primaryaddresses;
    if (!Array.isArray(updated)) return null;
    const walletSet = new Set(walletAddresses);

    const addresses = updated.map(addr => ({
      address: addr,
      displayAddress: displayIdentityAddress(addr),
      inWallet: walletSet.has(addr),
    }));

    const walletCount = addresses.reduce(
      (acc, item) => acc + (item.inWallet ? 1 : 0),
      0,
    );
    return {
      addresses,
      walletCount,
      externalCount: addresses.length - walletCount,
      minimumSignatures: identityUpdates?.minimumsignatures ?? identity.minimumsignatures,
    };
  }, [identity, identityUpdates, walletAddresses, friendlyNames]);

  // --- Classify changes ---
  const {highRiskChanges: baseHighRiskChanges, contentChanges} = useMemo(
    () => classifyChanges(displayUpdates),
    [displayUpdates],
  );

  const primaryAddressChanges = useMemo(() => {
    if (!Array.isArray(identityUpdates?.primaryaddresses)) return [];

    const current = Array.isArray(identity?.primaryaddresses)
      ? identity.primaryaddresses
      : [];
    const updated = identityUpdates.primaryaddresses;
    const currentSet = new Set(current);
    const updatedSet = new Set(updated);
    const added = updated.filter(addr => !currentSet.has(addr));
    const removed = current.filter(addr => !updatedSet.has(addr));

    if (added.length === 0 && removed.length === 0) return [];

    const walletSet = new Set(walletAddresses);
    const walletPrimaryCount = updated.filter(addr => walletSet.has(addr)).length;
    const minimumSignatures = identityUpdates.minimumsignatures ?? identity.minimumsignatures;
    const changes = [];

    added.forEach(addr => {
      const inWallet = walletSet.has(addr);
      changes.push({
        key: `${VERUSID_PRIMARY_ADDRESS.key}:add:${addr}`,
        title: 'Add primary address',
        warning: inWallet
          ? 'Adding a primary address makes this ID multisig.'
          : walletPrimaryCount >= minimumSignatures
          ? 'This address is not in your wallet. Your wallet will still have enough primary addresses to meet the signature requirement.'
          : 'This address is not in your wallet. Your wallet will not have enough primary addresses to meet the signature requirement on its own.',
        data: displayIdentityAddress(addr),
        rawData: addr,
        valueLabel: 'New value',
        type: 'primary-add',
        walletMatch: inWallet,
      });
    });

    removed.forEach(addr => {
      changes.push({
        key: `${VERUSID_PRIMARY_ADDRESS.key}:remove:${addr}`,
        title: 'Remove primary address',
        warning: 'Removing a primary address changes who can control this ID.',
        data: displayIdentityAddress(addr),
        rawData: addr,
        valueLabel: 'Removed value',
        type: 'primary-remove',
      });
    });

    return changes;
  }, [identity, identityUpdates, walletAddresses, friendlyNames]);

  const nonPrimaryHighRiskChanges = useMemo(
    () =>
      baseHighRiskChanges.filter(
        change => !change.key.startsWith(VERUSID_PRIMARY_ADDRESS.key),
      ),
    [baseHighRiskChanges],
  );

  const identityStateChange = useMemo(
    () =>
      buildIdentityStateChange({
        currentIdentity: identity,
        updatedIdentity: identityUpdates,
        chainHeight: chainInfo?.blocks,
        secondsPerBlock: coinObj.seconds_per_block,
        prepared: identityPreviewPrepared,
      }),
    [identity, identityUpdates, chainInfo?.blocks, coinObj.seconds_per_block, identityPreviewPrepared],
  );

  const highRiskChanges = useMemo(
    () => [
      ...primaryAddressChanges,
      ...nonPrimaryHighRiskChanges,
      ...(identityStateChange ? [identityStateChange] : []),
    ],
    [primaryAddressChanges, nonPrimaryHighRiskChanges, identityStateChange],
  );

  const hasHighRisk = highRiskChanges.length > 0;
  // A high-risk change shows on the High-risk step only: a private address
  // change or a content clear does not add a Content step. Ordinary content in
  // the same request keeps its Content step, without the high-risk entries.
  // The content clear stays in the data (it changes what other entries do);
  // ContentStep hides only its cards.
  const hasContent = contentChanges.length > 0;
  const contentStepDisplayUpdates = useMemo(
    () => ({
      ...displayUpdates,
      [VERUSID_PRIVATE_INFO.key]: {},
    }),
    [displayUpdates],
  );
  const requesterMetadataRows = [
    chainId ? {label: 'Network', value: chainId} : null,
    sigDateString ? {label: 'Signed', value: sigDateString} : null,
    details.expires() && expiryLabel
      ? {label: 'Expires', value: expiryLabel}
      : null,
  ].filter(Boolean);
  const reviewChangeItems = buildChangeSummaryItems(
    highRiskChanges.length,
    // High-risk content is already counted above. It still has a content review.
    contentChanges.length,
  );

  // --- Stepper navigation ---
  // Build the ordered list of steps (skip content/high-risk if none)
  const steps = useMemo(() => {
    const s = [STEP_REVIEW];
    if (hasContent) s.push(STEP_CONTENT);
    if (hasHighRisk) s.push(STEP_HIGH_RISK);
    s.push(STEP_CONFIRM_PAY);
    return s;
  }, [hasContent, hasHighRisk]);

  const currentStepId = steps[stepIndex] ?? STEP_REVIEW;

  useEffect(() => {
    if (currentStepId !== STEP_CONFIRM_PAY && confirmBroadcasting) {
      setConfirmBroadcasting(false);
    }
  }, [confirmBroadcasting, currentStepId]);

  const goNext = useCallback(() => {
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
  }, [stepIndex, steps]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  useRequestBackHandler(stepIndex > 0 ? goBack : cancel);

  const closeHighRiskAckSheet = useCallback(() => {
    setHighRiskAckSheetVisible(false);
  }, []);

  const understandHighRiskChanges = useCallback(() => {
    setAcknowledged(true);
    setHighRiskAckSheetVisible(false);
    goNext();
  }, [goNext]);

  // --- Wallet unlock handling ---
  const handleContinue = async () => {
    if (activeAccountMatchesRequest) {
      goNext();
      return;
    }

    const allowList = (accounts || []).filter(
      account => accountIsTestnet(account) === requestIsTestnet,
    );

    // The action is disabled with its reason on screen.
    if (allowList.length === 0) return;

    try {
      await requestWalletUnlock({
        reason: 'identity-update-request',
        title: signedIn
          ? 'Switch wallet to continue'
          : 'Unlock wallet to continue',
        requestLabel: 'VerusID update request',
        accountHashes: allowList.map(account => account.accountHash),
        networkLabel: requestIsTestnet ? 'Testnet' : 'Mainnet',
      });
      goNext();
    } catch (e) {
      if (e?.code !== WALLET_UNLOCK_CANCELLED) {
        createAlert(
          'Cannot continue',
          e?.message || 'Unable to unlock wallet.',
        );
      }
    }
  };

  // --- Effects ---
  useEffect(() => {
    setExpiryLabel(getExpiryLabel());
  }, [details]);

  useEffect(() => {
    setDisplayUpdates(getDisplayUpdates());
  }, [details, identityUpdates, friendlyNames, cmmDataKeys, activeContentMultiMap]);

  useEffect(() => {
    if (detailsBufferString) {
      const det = new IdentityUpdateRequestDetails();
      det.fromBuffer(Buffer.from(detailsBufferString, 'hex'), 0, true, requestIsTestnet ? 'VRSCTEST' : 'VRSC');
      setDetails(det);
    }
  }, [detailsBufferString, requestIsTestnet]);

  useEffect(() => {
    setSigDateString(unixToDate(sigtime));
  }, [sigtime]);

  // --- Footer button logic ---
  const getFooterButtonLabel = () => {
    if (currentStepId === STEP_REVIEW) {
      return activeAccountMatchesRequest
        ? 'Review changes'
        : signedIn
        ? 'Switch wallet'
        : 'Unlock wallet';
    }

    return currentStepId === STEP_HIGH_RISK ? 'Continue' : 'Next';
  };

  const handleFooterRight = () => {
    if (currentStepId === STEP_REVIEW) {
      handleContinue();
    } else if (currentStepId === STEP_HIGH_RISK) {
      if (acknowledged) {
        goNext();
      } else {
        setHighRiskAckSheetVisible(true);
      }
    } else if (currentStepId === STEP_CONTENT) {
      goNext();
    }
    // For STEP_CONFIRM_PAY, the ConfirmPayStep handles its own buttons
  };

  const reviewDetails = (
    <View style={styles.footerDetailsList}>
      <View style={styles.footerDetailRow}>
        <Text style={styles.footerDetailLabel}>Changes</Text>
        <View style={styles.footerChangeValueStack}>
          {reviewChangeItems.map(item => (
            <Text
              key={item.key}
              numberOfLines={1}
              style={[
                styles.footerStackedDetailValue,
                item.tone === 'danger' &&
                  styles.footerDetailValueDanger,
              ]}>
              {item.label}
            </Text>
          ))}
        </View>
      </View>
      {details.expires() && expiryLabel ? (
        <View style={[styles.footerDetailRow, styles.footerDetailRowDivider]}>
          <Text style={styles.footerDetailLabel}>Expires in</Text>
          <Text style={styles.footerDetailValue}>{expiryLabel}</Text>
        </View>
      ) : null}
    </View>
  );

  const requestCardProps = {
    action: 'wants to update',
    requester: {request: props.request, signerFqn, signerIdentityID,
      signerSystemID: coinObj.system_id, signerSystemName: chainId, sigtime,
      loadVerusId: loadSignerVerusId, loadFriendlyNames: loadSignerFriendlyNames},
    sections: [{title: 'Request', rows: requesterMetadataRows}],
    responderName: fullyqualifiedname,
    responderWord: '',
    showResponder: true,
  };
  const compactRequestCard = (
    <RequestCardCompact {...requestCardProps} />
  );

  // --- Render ---
  const showFooter = currentStepId !== STEP_CONFIRM_PAY;
  const showTopBackButton =
    stepIndex > 0 &&
    !(currentStepId === STEP_CONFIRM_PAY && confirmBroadcasting);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
        {isListSelectionModalVisible && (
          <ListSelectionModal
            visible={isListSelectionModalVisible}
            data={listData}
            onSelect={() => setIsListSelectionModalVisible(false)}
            cancel={() => setIsListSelectionModalVisible(false)}
            title="Supported Payment Networks"
            flexHeight={1}
          />
        )}
      </Portal>
      <RawDataSheet
        visible={rawDataSheet.visible}
        title={rawDataSheet.title}
        rawData={rawDataSheet.rawData}
        onClose={closeRawDataSheet}
        onClosed={clearRawDataSheet}
        styles={styles}
        theme={theme}
      />

      {showTopBackButton && (
        <View style={styles.stepHeader}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            activeOpacity={0.74}
            onPress={goBack}
            style={styles.backButton}>
            <MaterialCommunityIcons
              color={theme.colors.textPrimary}
              name="arrow-left"
              size={24}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Step content */}
      {currentStepId === STEP_REVIEW && (
        <ReviewStep
          identityStateChange={identityStateChange}
          requestCard={<RequestCard {...requestCardProps} />}
          reviewDetails={reviewDetails}
          styles={styles}
        />
      )}

      {currentStepId === STEP_CONTENT && (
        <ContentStep
          requestCard={compactRequestCard}
          subjectIdentity={activeContentSubjectIdentity}
          friendlyNames={friendlyNames}
          displayUpdates={contentStepDisplayUpdates}
          hideContentClear
          chainInfo={chainInfo}
          coinObj={coinObj}
          cmmDataKeys={cmmDataKeys}
          styles={styles}
        />
      )}

      {currentStepId === STEP_HIGH_RISK && (
        <HighRiskStep
          requestCard={compactRequestCard}
          identityStateChange={identityStateChange}
          highRiskChanges={highRiskChanges}
          primaryAddressAfterUpdateInfo={
            primaryAddressChanges.length > 0 ||
            highRiskChanges.some(change => change.highRiskType === 'signature-threshold')
              ? primaryAddressAfterUpdateInfo
              : null
          }
          ackSheetVisible={highRiskAckSheetVisible}
          onCloseAckSheet={closeHighRiskAckSheet}
          onUnderstandAck={understandHighRiskChanges}
          currentAuthorities={{
            revocation: identity.revocationauthority
              ? {
                  display: displayIdentityAddress(identity.revocationauthority),
                  raw: identity.revocationauthority,
                }
              : null,
            recovery: identity.recoveryauthority
              ? {
                  display: displayIdentityAddress(identity.recoveryauthority),
                  raw: identity.recoveryauthority,
                }
              : null,
          }}
          styles={styles}
        />
      )}

      {currentStepId === STEP_CONFIRM_PAY && (
        <ConfirmPayStep
          requestCard={compactRequestCard}
          identityStateChange={identityStateChange}
          chainHeight={chainInfo?.blocks}
          details={details}
          requestIsTestnet={requestIsTestnet}
          subjectIdentity={subjectIdentity}
          subjectIdTxHex={subjectIdTxHex}
          friendlyNames={friendlyNames}
          coinObj={coinObj}
          responseBufferString={responseBufferString}
          detailIndex={detailIndex}
          deliverIdentityUpdateResponse={deliverIdentityUpdateResponse}
          identityUpdateDeliveryInfo={identityUpdateDeliveryInfo}
          completeIdentityUpdateWithoutDelivery={completeIdentityUpdateWithoutDelivery}
          next={next}
          cancel={cancel}
          highRiskCount={highRiskChanges.length}
          contentCount={contentChanges.length}
          hasEncryptedKeys={hasEncryptedKeys}
          onBroadcastingChange={setConfirmBroadcasting}
          styles={styles}
        />
      )}

      {/* Footer - hidden on ConfirmPayStep (it has its own buttons) */}
      {showFooter && (
        <SafeBottomActionStack
          gap={10}
          horizontalSpacing={24}
          style={styles.footer}>
          {currentStepId === STEP_REVIEW && noRequestNetworkWallet && (
            <View style={walletGateStyles.row}>
              <View style={walletGateStyles.icon}>
                <Info
                  size={16}
                  strokeWidth={2.1}
                  color={theme.colors.textSubtle}
                />
              </View>
              <Text
                style={[
                  theme.typography.bodySm,
                  walletGateStyles.text,
                  {color: theme.colors.textSecondary},
                ]}>
                {`This request needs a ${
                  requestIsTestnet ? 'testnet' : 'mainnet'
                } wallet. Add one, then open the request again.`}
              </Text>
            </View>
          )}
          <AppButton
            disabled={currentStepId === STEP_REVIEW && noRequestNetworkWallet}
            height={56}
            onPress={handleFooterRight}
            themeMode={theme.mode}
            variant="primary">
            {getFooterButtonLabel()}
          </AppButton>
          {currentStepId === STEP_REVIEW && (
            <AppButton
              height={56}
              onPress={cancel}
              themeMode={theme.mode}
              variant="secondary">
              Cancel
            </AppButton>
          )}
        </SafeBottomActionStack>
      )}
    </SafeAreaView>
  );
};

const IdentityUpdateRequestInfo = props => (
  <OnboardingThemeProvider>
    <IdentityUpdateRequestInfoContent {...props} />
  </OnboardingThemeProvider>
);

export default IdentityUpdateRequestInfo;

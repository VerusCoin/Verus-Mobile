import {identityUploadToDisplayJson} from '../../../utils/identityUpdate/uploadDisplay';
import {identityToDisplayJson} from '../../../utils/identityUpdate/identityDisplay';
/*
 * Review original content inline before control acknowledgement and payment.
 * Display representations never replace the original request used for signing.
 */
import React, {useMemo, useState, useEffect, useCallback, useRef} from 'react';
import {Platform, SafeAreaView, View} from 'react-native';
import {Portal, Text} from 'react-native-paper';
import Button from '../../../components/Button';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {blocksToTime, unixToDate} from '../../../utils/math';
import {useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Colors from '../../../globals/colors';
import {openAuthenticateUserModal} from '../../../actions/actions/sendModal/dispatchers/sendModal';
import {
  AUTHENTICATE_USER_SEND_MODAL,
  SEND_MODAL_USER_ALLOWLIST,
} from '../../../utils/constants/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import {getSystemNameFromSystemId} from '../../../utils/CoinData/CoinData';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import ListSelectionModal from '../../../components/ListSelectionModal/ListSelectionModal';
import {copyToClipboard} from '../../../utils/clipboard/clipboard';
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
import VdxfUniValueModal from '../../../components/VdxfUniValueModal/VdxfUniValueModal';
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
import GradientButton from '../../../components/GradientButton';

import ReviewStep from './steps/ReviewStep';
import ContentStep from './steps/ContentStep';
import HighRiskStep from './steps/HighRiskStep';
import ConfirmPayStep from './steps/ConfirmPayStep';
import {classifyChanges} from './utils/classifyChanges';
import {buildContentMultiMapRemoveUi} from './utils/contentMultiMapRemoveUi';
import {extractContentMultiMapRemoveMeta, splitContentMultiMapUpdates} from './utils/contentMultiMapUpdates';
import {buildIdentityStateChange} from './utils/buildIdentityStateChange';
import {identityUpdateRequestInfoStyles as styles} from '../../../styles';

// Step identifiers
const STEP_REVIEW = 0;
const STEP_HIGH_RISK = 1;
const STEP_CONFIRM_PAY = 2;
const CMM_CLEAR_MAP_SENTINEL = '__CMM_CLEAR__';

const IdentityUpdateRequestInfo = props => {
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
    identityUpdates,
    friendlyNames,
    cmmDataKeys,
    detailIndex,
    next,
    subjectIdTxHex,
    identityPreviewPrepared,
    hasEncryptedKeys,
  } = props;
  const insets = useSafeAreaInsets();
  const bottomNavigationInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 24 : 0,
  );
  const footerBottomPadding = 16 + bottomNavigationInset;

  const {fullyqualifiedname, identity} = subjectIdentity;

  // --- Core state ---
  const [stepIndex, setStepIndex] = useState(STEP_REVIEW);
  const [acknowledged, setAcknowledged] = useState(false);
  const signinContinuationActive = useRef(false);

  // --- Modal state ---
  const [vdxfInspectorItems, setVdxfInspectorItems] = useState([]);
  const [vdxfUniValueModalTitle, setVdxfUniValueModalTitle] = useState('Data');
  const [vdxfUniValueModalVisible, setVdxfUniValueModalVisible] =
    useState(false);
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
    const req = new GenericRequest();
    req.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);
    return req;
  }, [requestBufferString]);
  const requestIsTestnet = request.isTestnet();
  const details = useMemo(() => {
    const parsed = new IdentityUpdateRequestDetails();
    if (detailsBufferString) {
      parsed.fromBuffer(Buffer.from(detailsBufferString, 'hex'), 0, true, requestIsTestnet ? 'VRSCTEST' : 'VRSC');
    }
    return parsed;
  }, [detailsBufferString, requestIsTestnet]);

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
      return 'Unrecognized content key';
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
                onPress: () =>
                  openVerusIdDetailsModal(
                    coinObj.system_id,
                    identityUpdates.revocationauthority,
                  ),
              }
            : null,
      },
      [VERUSID_PRIVATE_INFO.key]: {
        [VERUSID_PRIVATE_ADDRESS.key]:
          identityUpdates.privateaddress &&
          identityUpdates.privateaddress !== identity.privateaddress
            ? {
                data: displayIdentityAddress(identityUpdates.privateaddress),
                rawData: identityUpdates.privateaddress,
                onPress: () =>
                  copyToClipboard(identityUpdates.privateaddress, {
                    message: `${identityUpdates.privateaddress} copied to clipboard.`,
                  }),
              }
            : null,
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
          data: identityUpdates.primaryaddresses[i],
          onPress: () =>
            copyToClipboard(identityUpdates.primaryaddresses[i], {
              message: `${identityUpdates.primaryaddresses[i]} copied to clipboard.`,
            }),
        };
      }
    }

    // Review the original requested values, before uploads are replaced with
    // transaction references or credentials are encrypted for publication.
    const requestedContent = detailsBufferString
      ? identityToDisplayJson(details.identity).contentmultimap || {}
      : identityUpdates.contentmultimap || {};
    const contentKeys = new Set(Object.keys(requestedContent));
    if (details.containsSignData()) {
      for (const [key] of signDataMap.entries()) contentKeys.add(key.toIAddress());
    }
    if (contentKeys.size) {
      for (const key of contentKeys) {
        const updates = requestedContent[key];
        const signData = details.containsSignData()
          ? getSignDataForKey(key)
          : null;

        if (signData != null) {
          displayUpdates[VERUSID_CMM_INFO.key][
            `${VERUSID_CMM_DATA.key}:${key}:upload`
          ] = {
            data: signData.encryptToAddress ? getSignDataLabel(signData) : `Public upload: ${getSignDataLabel(signData)}`,
            signData,
            contentKey: key,
            displayTitle: getCmmDataKey(key),
            isEncrypted: !!signData.encryptToAddress,
            onPress: () =>
              openVdxfUniValueModal(
                [toSignDataInspectorItem(signData)],
                getCmmDataKey(key),
              ),
          };
        }
        const {removeEntries, nonRemoveUpdates} = splitContentMultiMapUpdates(key, updates);

        // Unrecognized removal instructions have no removal effect, but their
        // bytes are still published in the update transaction and need review.
        if (key === ContentMultiMapRemoveKey.vdxfid) {
          const recognizedIndexes = new Set(removeEntries.map(entry => entry.index));
          const unrecognized = normalizeCmmUpdates(updates).filter((_, index) => !recognizedIndexes.has(index));
          if (unrecognized.length > 0) {
            displayUpdates[VERUSID_CMM_INFO.key][`${VERUSID_CMM_DATA.key}:${key}:unrecognized`] = {
              data: 'Unrecognized removal data',
              displayTitle: 'Unrecognized removal data',
              contentKey: key,
              rawData: unrecognized,
              unrecognizedRemoval: true,
              onPress: () => openVdxfUniValueModal(
                unrecognized.map((value, index) => ({
                  kind: 'raw-value', key: `raw:${index + 1}`, data: value, rawData: value,
                })),
                'Unrecognized removal data',
              ),
            };
          }
        }

        if (removeEntries.length > 0) {
          removeEntries.forEach(({update, removeMeta, index}) => {
            const removeUi = buildContentMultiMapRemoveUi({
              removeMeta,
              fallbackKey: key,
              currentContentMultiMap: identity.contentmultimap,
              getKeyLabel: getCmmDataKey,
              definedKeyVdxfId: DATA_TYPE_DEFINEDKEY.vdxfid,
            });
            if (!removeUi) return;
            const targetKey =
              removeMeta.action === 4
                ? CMM_CLEAR_MAP_SENTINEL
                : removeMeta.entryKey || key;
            // Keep every removal separate from additions to the same key.
            const updateKey = `${VERUSID_CMM_DATA.key}:${targetKey}:remove:${index}`;

            // derive remove-action copy from the current identity state, not from chain permanence.
            displayUpdates[VERUSID_CMM_INFO.key][updateKey] = {
              data: removeUi.summary,
              rawData: [update],
              removeMeta: {
                ...removeMeta,
                entryLabel: removeUi.targetLabel,
              },
              highRisk: removeMeta.action === 4,
              highRiskType:
                removeMeta.action === 4 ? 'content-clear' : undefined,
              highRiskTitle:
                removeMeta.action === 4
                  ? 'Clear current identity content'
                  : undefined,
              highRiskWarning:
                removeMeta.action === 4
                  ? removeUi.highRiskWarning
                  : undefined,
              displayTitle: removeUi.displayTitle,
              contentKey: key,
              removalUi: removeUi,
              onPress: () =>
                openVdxfUniValueModal(
                  toCmmModalObjects([update], key),
                  removeUi.modalTitle,
                ),
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
            contentKey: key,
            displayTitle: getCmmDataKey(key),
            isEncryptedKey: isCredentialKey,
            onPress: () =>
              openVdxfUniValueModal(
                toCmmModalObjects(nonRemoveUpdates),
                getCmmDataKey(key),
              ),
          };
        }
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

  const openVdxfUniValueModal = (items, title) => {
    setVdxfUniValueModalTitle(title);
    setVdxfInspectorItems(items);
    setVdxfUniValueModalVisible(true);
  };

  const closeVdxfUniValueModal = () => {
    setVdxfUniValueModalVisible(false);
    setVdxfUniValueModalTitle('Data');
    setVdxfInspectorItems([]);
  };

  // --- Computed state ---
  const [expiryLabel, setExpiryLabel] = useState(getExpiryLabel());
  const [loading, setLoading] = useState(false);
  const [sigDateString, setSigDateString] = useState(unixToDate(sigtime));
  const [waitingForSignin, setWaitingForSignin] = useState(false);
  const displayUpdates = useMemo(getDisplayUpdates,
    [details, detailsBufferString, identityUpdates, subjectIdentity, friendlyNames, cmmDataKeys, hasEncryptedKeys]);

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const signedIn = useSelector(state => state.authentication.signedIn);
  const sendModalType = useSelector(state => state.sendModal.type);
  const isWrongRequestType = useSelector(state => {
    const isTestAccount =
      state.authentication.activeAccount &&
      Object.keys(state.authentication.activeAccount.testnetOverrides).length >
        0;
    return (
      state.authentication.signedIn &&
      ((isTestAccount && !requestIsTestnet) ||
        (!isTestAccount && requestIsTestnet))
    );
  });

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
  const {highRiskChanges: baseHighRiskChanges} = useMemo(
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
  const hasUnownedPrimaryAddress = useMemo(
    () =>
      primaryAddressChanges.some(
        change => change.type === 'primary-add' && change.walletMatch === false,
      ),
    [primaryAddressChanges],
  );

  // Check if all high-risk items are acknowledged
  const allHighRiskAcknowledged = useMemo(() => {
    if (!hasHighRisk) return true;
    return acknowledged;
  }, [hasHighRisk, acknowledged]);

  const toggleAcknowledgment = useCallback(() => {
    setAcknowledged(prev => !prev);
  }, []);

  // Match the groups rendered by ContentStep, including high-risk content removal.
  const hasContent = [VERUSID_CMM_INFO.key, VERUSID_PRIVATE_INFO.key].some(
    groupKey => Object.values(displayUpdates[groupKey] || {}).some(Boolean),
  );

  const contentChangeCount = Object.values(displayUpdates[VERUSID_CMM_INFO.key] || {}).filter(Boolean).length;

  // --- Stepper navigation ---
  // Content is always expanded on the opening review. Only control changes
  // require a separate acknowledgement before payment and submission.
  const steps = useMemo(() => {
    const s = [STEP_REVIEW];
    if (hasHighRisk) s.push(STEP_HIGH_RISK);
    s.push(STEP_CONFIRM_PAY);
    return s;
  }, [hasHighRisk]);

  const currentStepId = steps[stepIndex] ?? STEP_REVIEW;
  const isFirstStep = stepIndex === 0;

  const goNext = useCallback(() => {
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
  }, [stepIndex, steps]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  // --- Sign-in handling (kept from original) ---
  const handleContinue = () => {
    if (signedIn) {
      goNext();
    } else {
      signinContinuationActive.current = true;
      setWaitingForSignin(true);
      const allowList = requestIsTestnet
        ? accounts.filter(x => {
            return (
              x.testnetOverrides &&
              x.testnetOverrides[coinObj.mainnet_id] === coinObj.id
            );
          })
        : accounts.filter(x => {
            return !(
              x.testnetOverrides && x.testnetOverrides[coinObj.id] != null
            );
          });

      if (allowList.length > 0) {
        openAuthenticateUserModal({[SEND_MODAL_USER_ALLOWLIST]: allowList});
      } else {
        createAlert(
          'Cannot continue',
          `No ${
            requestIsTestnet ? 'testnet' : 'mainnet'
          } profiles found, cannot respond to ${
            requestIsTestnet ? 'testnet' : 'mainnet'
          } login request.`,
        );
      }
    }
  };

  const wrongRequestType = isTestRequest => {
    createAlert(
      isTestRequest ? 'Testnet Request' : 'Mainnet Request',
      `This request was created for ${
        isTestRequest ? 'testnet' : 'mainnet'
      }, but you are using a ${
        isTestRequest ? 'mainnet' : 'testnet'
      } profile. Please logout, select a ${
        isTestRequest ? 'testnet' : 'mainnet'
      } profile, and retry this request to continue.`,
      [
        {
          text: 'Ok',
          onPress: () => {
            cancel();
            resolveAlert(true);
          },
        },
      ],
      {cancelable: false},
    );
  };

  // --- Effects ---
  useEffect(() => {
    setStepIndex(STEP_REVIEW);
    setAcknowledged(false);
    setWaitingForSignin(false);
    signinContinuationActive.current = false;
    setVdxfUniValueModalVisible(false);
    setIsListSelectionModalVisible(false);
    setVerusIdDetailsModalProps(null);
  }, [detailsBufferString, requestBufferString, subjectIdTxHex, identityUpdates, subjectIdentity]);

  useEffect(() => {
    if (isWrongRequestType) wrongRequestType(requestIsTestnet);
  }, []);

  useEffect(() => {
    if (signedIn && waitingForSignin && signinContinuationActive.current) {
      signinContinuationActive.current = false;
      setWaitingForSignin(false);
      goNext();
    }
  }, [signedIn, waitingForSignin]);

  useEffect(() => {
    setExpiryLabel(getExpiryLabel());
  }, [details]);

  useEffect(() => {
    setSigDateString(unixToDate(sigtime));
  }, [sigtime]);

  useEffect(() => {
    if (sendModalType != AUTHENTICATE_USER_SEND_MODAL) setLoading(false);
    else setLoading(true);
  }, [sendModalType]);

  // --- Footer button logic ---
  const getFooterButtonLabel = () => {
    if (currentStepId === STEP_CONFIRM_PAY) return 'Update identity';
    if (currentStepId === STEP_REVIEW && hasHighRisk) return 'Review risks';
    return 'Continue';
  };

  const getFooterLeftLabel = () => {
    if (isFirstStep) return 'Cancel';
    return 'Back';
  };

  const isNextDisabled = () => {
    if (isWrongRequestType) return true;
    if (currentStepId === STEP_HIGH_RISK && !allHighRiskAcknowledged)
      return true;
    return false;
  };

  const handleFooterLeft = () => {
    if (isFirstStep) {
      cancel();
    } else {
      goBack();
    }
  };

  const handleFooterRight = () => {
    if (currentStepId === STEP_REVIEW) {
      handleContinue();
    } else if (currentStepId === STEP_HIGH_RISK) {
      goNext();
    }
    // For STEP_CONFIRM_PAY, the ConfirmPayStep handles its own buttons
  };

  // --- Render ---
  if (loading) {
    return <AnimatedActivityIndicatorBox />;
  }

  const showFooter = currentStepId !== STEP_CONFIRM_PAY;

  return (
    <SafeAreaView style={styles.container}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
        {vdxfInspectorItems.length > 0 && (
          <VdxfUniValueModal
            items={vdxfInspectorItems}
            visible={vdxfUniValueModalVisible}
            title={vdxfUniValueModalTitle}
            setVisible={x => setVdxfUniValueModalVisible(x)}
            cancel={closeVdxfUniValueModal}
          />
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

      {/* Step content */}
      {currentStepId === STEP_REVIEW && (
        <ReviewStep
          identityStateChange={identityStateChange}
          signerFqn={signerFqn}
          canOpenSignerModal={canOpenSignerModal}
          chainId={chainId}
          sigDateString={sigDateString}
          expiryLabel={expiryLabel}
          details={details}
          fullyqualifiedname={fullyqualifiedname}
          highRiskCount={highRiskChanges.length}
          contentCount={contentChangeCount}
          openVerusIdDetailsModal={openVerusIdDetailsModal}
          signerIdentityID={signerIdentityID}
          styles={styles}>
          {hasContent && (
            <ContentStep
              subjectIdentity={subjectIdentity}
              displayUpdates={displayUpdates}
              cmmDataKeys={cmmDataKeys}
            />
          )}
        </ReviewStep>
      )}

      {currentStepId === STEP_HIGH_RISK && (
        <HighRiskStep
          identityStateChange={identityStateChange}
          highRiskChanges={highRiskChanges}
          primaryAddressAfterUpdateInfo={
            primaryAddressChanges.length > 0 ||
            highRiskChanges.some(change => change.highRiskType === 'signature-threshold')
              ? primaryAddressAfterUpdateInfo
              : null
          }
          acknowledged={acknowledged}
          onToggle={toggleAcknowledgment}
          hasUnownedPrimaryAddress={hasUnownedPrimaryAddress}
          currentAuthorities={{
            revocation: identity.revocationauthority
              ? displayIdentityAddress(identity.revocationauthority)
              : null,
            recovery: identity.recoveryauthority
              ? displayIdentityAddress(identity.recoveryauthority)
              : null,
          }}
          styles={styles}
        />
      )}

      {currentStepId === STEP_CONFIRM_PAY && (
        <ConfirmPayStep
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
          next={next}
          cancel={cancel}
          onGoBack={goBack}
          highRiskCount={highRiskChanges.length}
          contentCount={contentChangeCount}
          hasEncryptedKeys={hasEncryptedKeys}
          onReviewContent={hasContent ? () => setStepIndex(STEP_REVIEW) : undefined}
          footerBottomPadding={footerBottomPadding}
          styles={styles}
        />
      )}

      {/* Footer - hidden on ConfirmPayStep (it has its own buttons) */}
      {showFooter && (
        <View style={[styles.footer, {paddingBottom: footerBottomPadding}]}>
          <View style={styles.ctaCol}>
            <Button
              mode="contained"
              onPress={handleFooterLeft}
              style={styles.secondaryCta}
              contentStyle={styles.secondaryCtaContent}
              uppercase={false}
              buttonColor="#EBF6FF"
              textColor={Colors.primaryColor}
              labelStyle={styles.secondaryCtaLabel}>
              {getFooterLeftLabel()}
            </Button>
          </View>
          <View style={styles.ctaCol}>
            <GradientButton
              onPress={handleFooterRight}
              style={styles.primaryCta}
              disabled={isNextDisabled()}>
              {getFooterButtonLabel()}
            </GradientButton>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default IdentityUpdateRequestInfo;

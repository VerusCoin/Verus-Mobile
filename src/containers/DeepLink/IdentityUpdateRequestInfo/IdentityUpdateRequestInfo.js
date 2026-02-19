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
  - 2026-02-06: High-risk step shows primary-address deltas (add/remove), uses a
    single acknowledgment checkbox, and flags new addresses not in wallet.
    Adds a post-update primary-address ownership summary ("In wallet" vs "External")
    so users can clearly see whether they retain control when adding external addresses.
  - 2026-02-06: Fixed wallet address derivation ordering so "in wallet" matching
    is reliable during the High-risk step.
  - 2026-02-07: Fixed misleading HighRiskStep display. primaryAddressAfterUpdateInfo
    is now only passed when primary addresses are actually changing, preventing the
    "You will share control" message from appearing for authority-only changes.
  - 2026-02-07: Authority-only changes now show a dedicated card with prominent ID
    name and info icon (AuthorityInfoSheet) instead of generic outcome messaging.
*/
import React, {useMemo, useState, useEffect, useCallback} from 'react';
import {SafeAreaView, View, StyleSheet} from 'react-native';
import { primitives } from "verusid-ts-client"
import { Button, Portal, Text } from 'react-native-paper';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import { getFriendlyNameMap, getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { blocksToTime, unixToDate } from '../../../utils/math';
import { useSelector } from 'react-redux';
import Colors from '../../../globals/colors';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL, SEND_MODAL_USER_ALLOWLIST } from '../../../utils/constants/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { createAlert, resolveAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import ListSelectionModal from '../../../components/ListSelectionModal/ListSelectionModal';
import { copyToClipboard } from '../../../utils/clipboard/clipboard';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { getVerusIdStatus } from '../../../utils/verusid/getVerusIdStatus';
import { VERUSID_AUTH_INFO, VERUSID_BASE_INFO, VERUSID_CMM_DATA, VERUSID_CMM_INFO, VERUSID_PRIMARY_ADDRESS, VERUSID_PRIVATE_ADDRESS, VERUSID_PRIVATE_INFO, VERUSID_RECOVERY_AUTH, VERUSID_REVOCATION_AUTH, VERUSID_STATUS } from '../../../utils/constants/verusidObjectData';
import { getCmmDataLabel } from '../../../utils/vdxf/cmmDataLabel';
import VdxfUniValueModal from '../../../components/VdxfUniValueModal/VdxfUniValueModal';
import { getVDXFKeyLabel } from '../../../utils/vdxf/vdxfTypeLabels';
import { capitalizeString } from '../../../utils/stringUtils';
import { GenericRequest, IdentityUpdateRequestDetails } from 'verus-typescript-primitives';
import GradientButton from '../../../components/GradientButton';

import ReviewStep from './steps/ReviewStep';
import ContentStep from './steps/ContentStep';
import HighRiskStep from './steps/HighRiskStep';
import ConfirmPayStep from './steps/ConfirmPayStep';
import { classifyChanges } from './utils/classifyChanges';

// Step identifiers
const STEP_REVIEW = 0;
const STEP_CONTENT = 1;
const STEP_HIGH_RISK = 2;
const STEP_CONFIRM_PAY = 3;

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
    updateIdTxHex,
  } = props;
  
  const { fullyqualifiedname, identity } = subjectIdentity;

  // --- Core state ---
  const [subject, setSubject] = useState(primitives.Identity.fromJson(subjectIdentity));
  const [details, setDetails] = useState(new IdentityUpdateRequestDetails());
  const [stepIndex, setStepIndex] = useState(STEP_REVIEW);
  const [acknowledged, setAcknowledged] = useState(false);

  // --- Modal state ---
  const [vdxfUniValueModalData, setVdxfUniValueModalData] = useState([]);
  const [vdxfUniValueModalTitle, setVdxfUniValueModalTitle] = useState("Data");
  const [vdxfUniValueModalVisible, setVdxfUniValueModalVisible] = useState(false);
  const [partialSignDataModalData, setPartialSignDataModalData] = useState(null);
  const [partialSignDataModalTitle, setPartialSignDataModalTitle] = useState("Data");
  const [partialSignDataModalVisible, setPartialSignDataModalVisible] = useState(false);
  const [isListSelectionModalVisible, setIsListSelectionModalVisible] = useState(false);
  const [listData, setListData] = useState([]);
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] = useState(null);

  // --- Derived values ---
  const friendlyNameMap = new Map(Object.entries(friendlyNames));
  const chainId = signerSystemName || (signerSystemID ? getSystemNameFromSystemId(signerSystemID) : null);
  const canOpenSignerModal = Boolean(chainId && signerIdentityID);

  const request = useMemo(() => {
    if (!requestBufferString) return null;
    const req = new GenericRequest();
    req.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);
    return req;
  }, [requestBufferString]);
  const requestIsTestnet = request != null ? request.isTestnet() : false;

  // --- Helper functions ---
  const getVerusId = async (chain, iAddrOrName) => {
    const id = await getIdentity(CoinDirectory.getBasicCoinObj(chain).system_id, iAddrOrName);
    if (id.error) throw new Error(id.error.message);
    return id.result;
  };

  const displayIdentityAddress = (addr) => {
    if (friendlyNameMap.has(addr)) return friendlyNameMap.get(addr);
    return addr;
  };

  const getSignDataLabel = (signData) => {
    if (!signData) return 'Sign data';
    const trim = (value, maxLen = 60) => {
      if (value == null) return '';
      const str = String(value);
      return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
    };
    const dataJson = signData.toCLIJson();
    if (signData.isVdxfData()) return 'VDXF data';
    if (signData.isMMRData()) return 'MMR data';
    if (dataJson.filename) return `Filename: ${trim(dataJson.filename)}`;
    if (dataJson.message) return `Message: ${trim(dataJson.message)}`;
    if (dataJson.messagehex) return `Hex message: ${trim(dataJson.messagehex)}`;
    if (dataJson.messagebase64) return `Base64 message: ${trim(dataJson.messagebase64)}`;
    if (dataJson.datahash) return `Data hash: ${trim(dataJson.datahash)}`;
    return 'Sign data';
  };

  const getCmmDataKey = iAddr => {
    const keyLabel = getVDXFKeyLabel(iAddr, true);
    if (keyLabel == null) {
      if (cmmDataKeys && cmmDataKeys[iAddr]) return cmmDataKeys[iAddr].label;
      return iAddr.substring(0, 4) + '...' + iAddr.substring(iAddr.length - 4);
    }
    return capitalizeString(keyLabel);
  };

  // --- Display updates ---
  const getDisplayUpdates = () => {
    const signDataMap = details.signDataMap || new Map();
    const displayUpdates = {
      [VERUSID_AUTH_INFO.key]: {
        [VERUSID_RECOVERY_AUTH.key]: identityUpdates.recoveryauthority && identityUpdates.recoveryauthority !== identity.recoveryauthority ? {
          data: displayIdentityAddress(identityUpdates.recoveryauthority),
          onPress: () => openVerusIdDetailsModal(coinObj.system_id, identityUpdates.recoveryauthority)
        } : null,
        [VERUSID_REVOCATION_AUTH.key]: identityUpdates.revocationauthority && identityUpdates.revocationauthority !== identity.revocationauthority ? {
          data: displayIdentityAddress(identityUpdates.revocationauthority),
          onPress: () => openVerusIdDetailsModal(coinObj.system_id, identityUpdates.revocationauthority)
        } : null
      },
      [VERUSID_PRIVATE_INFO.key]: {
        [VERUSID_PRIVATE_ADDRESS.key]: identityUpdates.privateaddress && identityUpdates.privateaddress !== identity.privateaddress ? {
          data: displayIdentityAddress(identityUpdates.privateaddress),
          onPress: () => copyToClipboard(identityUpdates.privateaddress, { message: `${identityUpdates.privateaddress} copied to clipboard.` })
        } : null
      },
      [VERUSID_BASE_INFO.key]: {},
      [VERUSID_CMM_INFO.key]: {}
    };

    if (identityUpdates.primaryaddresses && identityUpdates.primaryaddresses.join(',') !== identity.primaryaddresses.join(',')) {
      for (let i = 0; i < identityUpdates.primaryaddresses.length; i++) {
        displayUpdates[VERUSID_AUTH_INFO.key][`${VERUSID_PRIMARY_ADDRESS.key}:${i}`] = {
          data: identityUpdates.primaryaddresses[i],
          onPress: () => copyToClipboard(identityUpdates.primaryaddresses[i], { message: `${identityUpdates.primaryaddresses[i]} copied to clipboard.` })
        };
      }
    }

    if (identityUpdates.flags && identityUpdates.flags !== identity.flags) {
      if (subject.isRevoked() !== details.identity.isRevoked()) {
        displayUpdates[VERUSID_BASE_INFO.key][VERUSID_STATUS.key] = {
          data: getVerusIdStatus(identityUpdates, chainInfo, coinObj),
        };
      }
    }

    if (identityUpdates.contentmultimap) {
      for (const key in identityUpdates.contentmultimap) {
        if (details.containsSignData() && signDataMap.has(key)) {
          const signData = signDataMap.get(key);
          displayUpdates[VERUSID_CMM_INFO.key][`${VERUSID_CMM_DATA.key}:${key}`] = {
            data: getSignDataLabel(signData),
            isEncrypted: true,
            onPress: () => openPartialSignDataModal(signData, getCmmDataKey(key))
          };
        } else {
          const dataLabel = getCmmDataLabel(identityUpdates.contentmultimap[key]);
          displayUpdates[VERUSID_CMM_INFO.key][`${VERUSID_CMM_DATA.key}:${key}`] = {
            data: dataLabel,
            rawData: identityUpdates.contentmultimap[key],
            onPress: () => {
              const updates = identityUpdates.contentmultimap[key];
              return openVdxfUniValueModal(updates.map(x => ({
                key: Object.keys(x)[0],
                data: Object.values(x)[0]
              })), getCmmDataKey(key));
            }
          };
        }
      }
    }

    return displayUpdates;
  };

  const getExpiryLabel = () => {
    if (!details.expires()) return "";
    return blocksToTime(details.expiryHeight.toNumber() - chainInfo.longestchain, coinObj.seconds_per_block);
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
          return getFriendlyNameMap(CoinDirectory.getBasicCoinObj(chain).system_id, identityObj);
        } catch (e) {
          return {
            ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
            ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
          };
        }
      },
      iAddress,
      chain
    });
  };

  const openVdxfUniValueModal = (objects, title) => {
    setVdxfUniValueModalTitle(title);
    setVdxfUniValueModalData(objects);
    setVdxfUniValueModalVisible(true);
  };

  const closeVdxfUniValueModal = () => {
    setVdxfUniValueModalVisible(false);
    setVdxfUniValueModalTitle("Data");
    setVdxfUniValueModalData([]);
  };

  const openPartialSignDataModal = (data, title) => {
    setPartialSignDataModalTitle(title);
    setPartialSignDataModalData(data);
    setPartialSignDataModalVisible(true);
  };

  const closePartialSignDataModal = () => {
    setPartialSignDataModalVisible(false);
    setPartialSignDataModalTitle("Data");
    setPartialSignDataModalData(null);
  };

  // --- Computed state ---
  const [expiryLabel, setExpiryLabel] = useState(getExpiryLabel());
  const [loading, setLoading] = useState(false);
  const [sigDateString, setSigDateString] = useState(unixToDate(sigtime));
  const [waitingForSignin, setWaitingForSignin] = useState(false);
  const [displayUpdates, setDisplayUpdates] = useState(getDisplayUpdates());

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const sendModalType = useSelector(state => state.sendModal.type);
  const isWrongRequestType = useSelector(state => {
    const isTestAccount =
      state.authentication.activeAccount &&
      Object.keys(state.authentication.activeAccount.testnetOverrides).length > 0;
    return (
      state.authentication.signedIn &&
      ((isTestAccount && !requestIsTestnet) ||
      (!isTestAccount && requestIsTestnet))
    );
  });

  const walletAddresses = useMemo(() => {
    const normalize = (addresses) => {
      if (!Array.isArray(addresses)) return [];
      return addresses
        .map(entry => (typeof entry === 'string' ? entry : entry?.address))
        .filter(Boolean);
    };

    if (!activeAccount || !coinObj) return [];

    const primaryKey = coinObj.id;
    const fallbackKey = coinObj.mainnet_id;
    const primary = normalize(activeAccount?.keys?.[primaryKey]?.vrpc?.addresses);
    if (primary.length > 0) return primary;
    return normalize(activeAccount?.keys?.[fallbackKey]?.vrpc?.addresses);
  }, [activeAccount, coinObj]);

  const primaryAddressAfterUpdateInfo = useMemo(() => {
    if (!Array.isArray(identityUpdates?.primaryaddresses)) return null;

    const updated = identityUpdates.primaryaddresses;
    const walletSet = new Set(walletAddresses);

    const addresses = updated.map(addr => ({
      address: addr,
      displayAddress: displayIdentityAddress(addr),
      inWallet: walletSet.has(addr),
    }));

    const walletCount = addresses.reduce((acc, item) => acc + (item.inWallet ? 1 : 0), 0);
    return { addresses, walletCount, externalCount: addresses.length - walletCount };
  }, [identityUpdates, walletAddresses, friendlyNames]);

  // --- Classify changes ---
  const { highRiskChanges: baseHighRiskChanges, contentChanges } = useMemo(
    () => classifyChanges(displayUpdates),
    [displayUpdates]
  );

  const primaryAddressChanges = useMemo(() => {
    if (!Array.isArray(identityUpdates?.primaryaddresses)) return [];

    const current = Array.isArray(identity?.primaryaddresses) ? identity.primaryaddresses : [];
    const updated = identityUpdates.primaryaddresses;
    const currentSet = new Set(current);
    const updatedSet = new Set(updated);
    const added = updated.filter(addr => !currentSet.has(addr));
    const removed = current.filter(addr => !updatedSet.has(addr));

    if (added.length === 0 && removed.length === 0) return [];

    const walletSet = new Set(walletAddresses);
    const hasWalletPrimaryAfterUpdate = updated.some(addr => walletSet.has(addr));
    const changes = [];

    added.forEach(addr => {
      const inWallet = walletSet.has(addr);
      changes.push({
        key: `${VERUSID_PRIMARY_ADDRESS.key}:add:${addr}`,
        title: 'Add primary address',
        warning: inWallet
          ? 'Adding a primary address makes this ID multisig.'
          : hasWalletPrimaryAfterUpdate
            ? 'This address is not in your wallet. Adding it shares control of this ID with someone else. Your wallet will still control this ID.'
            : 'This address is not in your wallet. After this update, none of the primary addresses are in your wallet. You will lose control of this ID.',
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
    () => baseHighRiskChanges.filter(change => !change.key.startsWith(VERUSID_PRIMARY_ADDRESS.key)),
    [baseHighRiskChanges]
  );

  const highRiskChanges = useMemo(
    () => [...primaryAddressChanges, ...nonPrimaryHighRiskChanges],
    [primaryAddressChanges, nonPrimaryHighRiskChanges]
  );

  const hasHighRisk = highRiskChanges.length > 0;
  const hasUnownedPrimaryAddress = useMemo(
    () => primaryAddressChanges.some(change => change.type === 'primary-add' && change.walletMatch === false),
    [primaryAddressChanges]
  );

  // Check if all high-risk items are acknowledged
  const allHighRiskAcknowledged = useMemo(() => {
    if (!hasHighRisk) return true;
    return acknowledged;
  }, [hasHighRisk, acknowledged]);

  const toggleAcknowledgment = useCallback(() => {
    setAcknowledged(prev => !prev);
  }, []);

  const hasContent = contentChanges.length > 0 || highRiskChanges.length > 0;

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
  const isLastStep = stepIndex === steps.length - 1;
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
      setWaitingForSignin(true);
      const allowList = requestIsTestnet ? accounts.filter(x => {
        return x.testnetOverrides && x.testnetOverrides[coinObj.mainnet_id] === coinObj.id;
      }) : accounts.filter(x => {
        return !(x.testnetOverrides && x.testnetOverrides[coinObj.id] != null);
      });

      if (allowList.length > 0) {
        openAuthenticateUserModal({ [SEND_MODAL_USER_ALLOWLIST]: allowList });
      } else {
        createAlert(
          "Cannot continue",
          `No ${requestIsTestnet ? 'testnet' : 'mainnet'} profiles found, cannot respond to ${requestIsTestnet ? 'testnet' : 'mainnet'} login request.`,
        );
      }
    }
  };

  const wrongRequestType = isTestRequest => {
    createAlert(
      isTestRequest ? 'Testnet Request' : 'Mainnet Request',
      `This request was created for ${isTestRequest ? 'testnet' : 'mainnet'}, but you are using a ${isTestRequest ? 'mainnet' : 'testnet'} profile. Please logout, select a ${isTestRequest ? 'testnet' : 'mainnet'} profile, and retry this request to continue.`,
      [{ text: 'Ok', onPress: () => { cancel(); resolveAlert(true); } }],
      { cancelable: false },
    );
  };

  // --- Effects ---
  useEffect(() => {
    if (isWrongRequestType) wrongRequestType(requestIsTestnet);
  }, []);

  useEffect(() => {
    if (signedIn && waitingForSignin) {
      setWaitingForSignin(false);
      goNext();
    }
  }, [signedIn, waitingForSignin]);

  useEffect(() => { setExpiryLabel(getExpiryLabel()); }, [details]);

  useEffect(() => {
    setDisplayUpdates(getDisplayUpdates());
  }, [details, identityUpdates, friendlyNames, cmmDataKeys]);

  useEffect(() => {
    if (detailsBufferString) {
      const det = new IdentityUpdateRequestDetails();
      det.fromBuffer(Buffer.from(detailsBufferString, 'hex'), 0);
      setDetails(det);
    }
  }, [detailsBufferString]);

  useEffect(() => { setSigDateString(unixToDate(sigtime)); }, [sigtime]);

  useEffect(() => {
    if (sendModalType != AUTHENTICATE_USER_SEND_MODAL) setLoading(false);
    else setLoading(true);
  }, [sendModalType]);

  // --- Footer button logic ---
  const getFooterButtonLabel = () => {
    if (currentStepId === STEP_CONFIRM_PAY) return 'Update';
    return 'Next';
  };

  const getFooterLeftLabel = () => {
    if (isFirstStep) return 'Cancel';
    return 'Back';
  };

  const isNextDisabled = () => {
    if (isWrongRequestType) return true;
    if (currentStepId === STEP_HIGH_RISK && !allHighRiskAcknowledged) return true;
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
    } else if (currentStepId === STEP_CONTENT || currentStepId === STEP_HIGH_RISK) {
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
        {vdxfUniValueModalData.length > 0 && (
          <VdxfUniValueModal 
            objects={vdxfUniValueModalData}
            visible={vdxfUniValueModalVisible}
            title={vdxfUniValueModalTitle}
            setVisible={(x) => setVdxfUniValueModalVisible(x)}
            cancel={closeVdxfUniValueModal}
          />
        )}
        {partialSignDataModalData != null && (
          <VdxfUniValueModal 
            data={partialSignDataModalData}
            objects={[]}
            visible={partialSignDataModalVisible}
            title={partialSignDataModalTitle}
            setVisible={(x) => setPartialSignDataModalVisible(x)}
            cancel={closePartialSignDataModal}
          />
        )}
        {isListSelectionModalVisible && <ListSelectionModal
          visible={isListSelectionModalVisible}
          data={listData}
          onSelect={() => setIsListSelectionModalVisible(false)}
          cancel={() => setIsListSelectionModalVisible(false)}
          title="Supported Payment Networks"
          flexHeight={1}
        />}
      </Portal>

      {/* Step content */}
      {currentStepId === STEP_REVIEW && (
        <ReviewStep
          signerFqn={signerFqn}
          canOpenSignerModal={canOpenSignerModal}
          chainId={chainId}
          sigDateString={sigDateString}
          expiryLabel={expiryLabel}
          details={details}
          fullyqualifiedname={fullyqualifiedname}
          highRiskCount={highRiskChanges.length}
          contentCount={contentChanges.length}
          openVerusIdDetailsModal={openVerusIdDetailsModal}
          signerIdentityID={signerIdentityID}
          styles={styles}
        />
      )}

      {currentStepId === STEP_CONTENT && (
        <ContentStep
          subjectIdentity={subjectIdentity}
          friendlyNames={friendlyNames}
          displayUpdates={displayUpdates}
          chainInfo={chainInfo}
          coinObj={coinObj}
          cmmDataKeys={cmmDataKeys}
          styles={styles}
        />
      )}

      {currentStepId === STEP_HIGH_RISK && (
        <HighRiskStep
          highRiskChanges={highRiskChanges}
          primaryAddressAfterUpdateInfo={primaryAddressChanges.length > 0 ? primaryAddressAfterUpdateInfo : null}
          acknowledged={acknowledged}
          onToggle={toggleAcknowledgment}
          hasUnownedPrimaryAddress={hasUnownedPrimaryAddress}
          currentAuthorities={{
            revocation: identity.revocationauthority ? displayIdentityAddress(identity.revocationauthority) : null,
            recovery: identity.recoveryauthority ? displayIdentityAddress(identity.recoveryauthority) : null,
          }}
          styles={styles}
        />
      )}

      {currentStepId === STEP_CONFIRM_PAY && (
        <ConfirmPayStep
          details={details}
          requestIsTestnet={requestIsTestnet}
          subjectIdentity={subjectIdentity}
          subjectIdTxHex={subjectIdTxHex}
          updateIdTxHex={updateIdTxHex}
          friendlyNames={friendlyNames}
          coinObj={coinObj}
          responseBufferString={responseBufferString}
          detailIndex={detailIndex}
          next={next}
          cancel={cancel}
          onGoBack={goBack}
          highRiskCount={highRiskChanges.length}
          contentCount={contentChanges.length}
          styles={styles}
        />
      )}

      {/* Footer - hidden on ConfirmPayStep (it has its own buttons) */}
      {showFooter && (
        <View style={styles.footer}>
          <View style={styles.ctaCol}>
            <Button
              mode="contained"
              onPress={handleFooterLeft}
              style={styles.secondaryCta}
              contentStyle={styles.secondaryCtaContent}
              uppercase={false}
              buttonColor="#EBF6FF"
              textColor={Colors.primaryColor}
              labelStyle={styles.secondaryCtaLabel}
            >
              {getFooterLeftLabel()}
            </Button>
          </View>
          <View style={styles.ctaCol}>
            <GradientButton 
              onPress={handleFooterRight} 
              style={styles.primaryCta}
              disabled={isNextDisabled()}
            >
              {getFooterButtonLabel()}
            </GradientButton>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.2,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  requesterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    zIndex: 2,
  },
  requesterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requesterIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requesterTextContainer: {
    flex: 1,
  },
  requesterLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  requesterName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  requesterDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipContainer: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiryChip: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  unsignedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  targetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    zIndex: 2,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  targetInfo: {
    flex: 1,
  },
  targetLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  targetName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  sectionContent: {
    padding: 0,
  },
  footer: {
    backgroundColor: 'white',
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  ctaCol: {
    flex: 1,
    minWidth: 0,
  },
  secondaryCta: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF6FF',
    borderWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {width: 0, height: 0},
  },
  secondaryCtaContent: {
    height: 44,
  },
  secondaryCtaLabel: {
    color: Colors.primaryColor,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0,
    textTransform: 'none',
  },
  primaryCta: {
    width: '100%',
    alignSelf: 'stretch',
    height: 44,
    borderRadius: 22,
  },
});

export default IdentityUpdateRequestInfo;

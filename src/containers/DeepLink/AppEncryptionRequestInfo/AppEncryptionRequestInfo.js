/*
 * AppEncryptionRequestInfo
 * 
 * Displays AppEncryptionRequest details to the user for approval.
 * Once approved, derives encryption keys and returns response.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Portal, Text } from 'react-native-paper';
import Button from '../../../components/Button';
import { useSelector } from 'react-redux';
import { GenericResponse } from 'verus-typescript-primitives';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import SemiModal from '../../../components/SemiModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import Colors from '../../../globals/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { SEND_MODAL_USER_ALLOWLIST } from '../../../utils/constants/sendModal';
import { createAlert, resolveAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { unixToDate } from '../../../utils/math';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import { getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import VrpcProvider from '../../../utils/vrpc/vrpcInterface';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { copyToClipboard } from '../../../utils/clipboard/clipboard';
import { requestServiceStoredData } from '../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../utils/constants/services';
import { VERUSID_NETWORK_DEFAULT } from '../../../../env/index';
import { processAppEncryptionRequest } from '../../../utils/deeplink/handlers/appEncryptionRequestHandler';
import { ensureGenericResponseSigner } from '../../../utils/deeplink/genericResponse/ensureGenericResponseSigner';
import { getAppEncryptionSessionKey } from '../../../utils/deeplink/appEncryptionSession';
import {
  appEncryptionIdentityMatchesConstraints,
  getAppEncryptionIdentityConstraints,
} from '../../../utils/deeplink/validator/appEncryptionIdentityConstraints';
import store from '../../../store';
import styles from '../../../styles/appEncryption.styles';
import { convertFqnToDisplayFormat } from '../../../utils/fullyqualifiedname';

// ── Helpers ──

const truncateAddress = (addr) => {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
};

const getDaemonChainArg = systemID => {
  const coin = getIdentityCoin(systemID);
  if (coin?.id === 'VRSC') return '';
  if (coin?.id === 'VRSCTEST') return ' -chain=vrsctest';

  // PBaaS chain identifiers are case-sensitive and independent of display names.
  return systemID ? ` -chain=${systemID}` : '';
};

const buildDaemonDecryptCommand = ({
  encryptedDescriptorJson,
  signerSystemID,
}) => {
  const chainArg = getDaemonChainArg(signerSystemID);
  const payload = JSON.stringify({ datadescriptor: encryptedDescriptorJson });
  return `./verus${chainArg} decryptdata '${payload}'`;
};

const isTestProfile = account => {
  return Object.keys(account?.testnetOverrides || {}).length > 0;
};

const EMPTY_IDENTITIES = {};

const getIdentityCoin = chainId => {
  try {
    return CoinDirectory.findCoinObj(chainId);
  } catch (_) {
    return null;
  }
};

// ── Identity Picker Sheet ──

const IdentityPickerSheet = ({
  visible,
  linkedIds,
  sortedIds,
  selectedIdentity,
  onClose,
  onSelect,
}) => {
  const insets = useSafeAreaInsets();
  const paddingBottom = 16 + insets.bottom;

  if (!visible) return null;

  const hasIdentities = Object.keys(sortedIds).some(chainId =>
    sortedIds[chainId] && sortedIds[chainId].length > 0
  );

  return (
    <Portal>
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
        title="Select identity to respond with"
        flexHeight={0.01}
        contentContainerStyle={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          flex: 0,
          width: '100%',
          alignSelf: 'flex-end',
          paddingBottom,
          maxHeight: '70%',
        }}
      >
        <View>
          <View style={styles.sheetDescription}>
            <Text style={styles.sheetDescriptionText}>
              Choose a VerusID to derive the encryption key from.
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            <View style={styles.listContainer}>
              {!hasIdentities && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No linked identities match this request.
                  </Text>
                </View>
              )}

              {Object.keys(sortedIds).map(chainId => {
                const identities = sortedIds[chainId];
                if (!identities || identities.length === 0) return null;

                return (
                  <View key={chainId} style={styles.networkGroup}>
                    <View style={styles.networkHeader}>
                      <Text style={styles.networkHeaderText}>{chainId}</Text>
                    </View>

                    {identities.map(iAddr => {
                      const friendlyName = linkedIds[chainId]?.[iAddr] || iAddr;
                      const isSelected =
                        selectedIdentity &&
                        selectedIdentity.chainId === chainId &&
                        selectedIdentity.iAddress === iAddr;

                      return (
                        <TouchableOpacity
                          key={iAddr}
                          style={[
                            styles.identityCard,
                            isSelected && styles.identityCardSelected,
                          ]}
                          onPress={() => onSelect(chainId, iAddr, friendlyName)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.identityIconContainer}>
                            <MaterialCommunityIcons
                              name="account"
                              size={22}
                              color={isSelected ? Colors.verusGreenColor : '#666'}
                            />
                          </View>
                          <View style={styles.identityTextSection}>
                            <Text
                              style={[
                                styles.identityName,
                                isSelected && styles.identityNameSelected,
                              ]}
                              numberOfLines={1}
                            >
                              {friendlyName !== iAddr ? convertFqnToDisplayFormat(friendlyName) : iAddr}
                            </Text>
                            <Text
                              style={styles.identityAddress}
                              numberOfLines={1}
                            >
                              {truncateAddress(iAddr)}
                            </Text>
                          </View>

                          {isSelected ? (
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={20}
                              color={Colors.verusGreenColor}
                              style={styles.chevronIcon}
                            />
                          ) : (
                            <MaterialCommunityIcons
                              name="chevron-right"
                              size={20}
                              color="#CCC"
                              style={styles.chevronIcon}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </SemiModal>
    </Portal>
  );
};

// ── Detail Row Component ──

const DetailRow = ({ title, subtitle, onPress, rightIcon, showBorder, isWarning }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.7 } : {};
  return (
    <Wrapper
      style={[
        styles.detailRow,
        showBorder && styles.detailRowBorder,
        onPress && styles.detailRowPressable,
        isWarning && styles.detailRowWarning,
      ]}
      {...wrapperProps}
    >
      <View style={styles.detailLeft}>
        <Text 
          style={[styles.detailTitle, isWarning && styles.detailTitleWarning]} 
          numberOfLines={undefined}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.detailSubtitle, isWarning && styles.detailSubtitleWarning]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightIcon ? (
        <MaterialCommunityIcons 
          name={rightIcon} 
          size={18} 
          color={isWarning ? "#E65100" : "#888"} 
        />
      ) : null}
    </Wrapper>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════

const AppEncryptionRequestSession = (props) => {
  const {
    // From displayProps (handler output)
    signerFqn,
    signerSystemID,
    signerSystemName,
    signerIdentityID,
    sigtime,
    derivationNumber,
    secondaryDerivationNumber,
    appScopeID,
    appScopeFqn,
    derivationIdFqn,
    derivationIdentityID,
    hasDerivationID,
    requestIdFqn,
    hasRequestID,
    encryptResponseToAddress,
    returnESK,
    // Standard props from GenericRequestHome
    cancel,
    next,
    response,
    request,
    detailIndex,
    sessionKey,
  } = props;

  // ── Redux state ──
  const signedIn = useSelector(state => state.authentication.signedIn);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const sendModalType = useSelector(state => state.sendModal.type);
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const encryptedIds = useObjectSelector(state => state.services.stored[VERUSID_SERVICE_ID]);
  const requestIsTestnet = request != null ? request.isTestnet() : false;
  const testnetOverrides = useObjectSelector(
    state => state.authentication.activeAccount?.testnetOverrides || {},
  );
  const identityNetwork = testnetOverrides[VERUSID_NETWORK_DEFAULT]
    ? testnetOverrides[VERUSID_NETWORK_DEFAULT]
    : VERUSID_NETWORK_DEFAULT;

  // ── Local state ──
  const [loading, setLoading] = useState(false);
  const [waitingForSignin, setWaitingForSignin] = useState(false);
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] = useState(null);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [linkedIdentityData, setLinkedIdentityData] = useState(null);
  const [parentData, setParentData] = useState(null);
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);

  // ── Encrypted response preview state ──
  const [encryptedResponseHex, setEncryptedResponseHex] = useState(null);
  const [encryptedDescriptorJson, setEncryptedDescriptorJson] = useState(null);
  const [pendingResponse, setPendingResponse] = useState(null);
  const mounted = useRef(true);
  const activeApproval = useRef(null);
  const sending = useRef(false);
  const requestHex = request.toBuffer().toString('hex');
  const linkedIdsVersion = JSON.stringify(encryptedIds);
  const linkedIdsLoaded = signedIn && linkedIdentityData != null &&
    linkedIdentityData.source === encryptedIds;
  const linkedIds = linkedIdsLoaded ? linkedIdentityData.ids : EMPTY_IDENTITIES;
  const constraints = useMemo(() => {
    try {
      return getAppEncryptionIdentityConstraints(request);
    } catch (_) {
      // Malformed signed constraints cannot authorize an identity selection.
      return null;
    }
  }, [request, requestHex]);
  const parentScope = useMemo(() => ({ linkedIds, constraints }), [linkedIds, constraints]);
  const sortedIds = useMemo(() => {
    const sorted = {};

    if (!linkedIdsLoaded || !constraints) return sorted;
    if (constraints.parentIDs.size > 0 && parentData?.scope !== parentScope) return sorted;

    for (const chainId of Object.keys(linkedIds)) {
      const coin = getIdentityCoin(chainId);
      if (!coin || !!coin.testnet !== requestIsTestnet) continue;

      sorted[chainId] = Object.keys(linkedIds[chainId] || {})
        .filter(identityID => appEncryptionIdentityMatchesConstraints(constraints, {
          identityID,
          systemID: coin.system_id,
          parentID: parentData?.ids[`${chainId}:${identityID}`],
        }))
        .sort((a, b) => (linkedIds[chainId][a] || '').localeCompare(linkedIds[chainId][b] || ''));
    }

    return sorted;
  }, [linkedIds, linkedIdsLoaded, constraints, parentData, parentScope, requestIsTestnet]);
  const selectedIdentityAllowed = selectedIdentity != null &&
    sortedIds[selectedIdentity.chainId]?.includes(selectedIdentity.iAddress);
  const review = useMemo(() => ({ request, requestHex, detailIndex, selectedIdentity, sortedIds }),
    [request, requestHex, detailIndex, selectedIdentity, sortedIds]);
  const currentReview = useRef(review);
  currentReview.current = review;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    activeApproval.current = null;
    setLoading(false);
    setEncryptedResponseHex(null);
    setEncryptedDescriptorJson(null);
    setPendingResponse(null);
  }, [review]);

  // ── Derived values ──
  const requesterLabel = signerFqn || 'An application';
  const requesterAddress = signerFqn ? signerIdentityID : null;
  const sigDateString = sigtime ? unixToDate(sigtime) : null;
  const chainId = signerSystemName || signerSystemID;
  const matchingAccounts = useMemo(() => {
    return (accounts || []).filter(account => isTestProfile(account) === requestIsTestnet);
  }, [accounts, requestIsTestnet]);

  // ── isWrongRequestType check (testnet/mainnet mismatch) ──
  const isWrongRequestType = useMemo(() => {
    if (!signedIn || !activeAccount) return false;
    const isTestAccount = isTestProfile(activeAccount);
    return requestIsTestnet !== isTestAccount;
  }, [activeAccount, requestIsTestnet, signedIn]);

  // ── Load linked identities (decrypt stored data) ──
  useEffect(() => {
    let active = true;
    const loadLinkedIds = async () => {
      try {
        const verusIdServiceData = await requestServiceStoredData(
          VERUSID_SERVICE_ID,
        );
        if (active && getAppEncryptionSessionKey(store.getState()) === sessionKey) {
          setLinkedIdentityData({ source: encryptedIds, ids: verusIdServiceData.linked_ids || {} });
        }
      } catch (e) {
        if (active) setLinkedIdentityData({ source: encryptedIds, ids: {} });
      }
    };

    if (signedIn) loadLinkedIds();

    return () => { active = false; };
  }, [encryptedIds, signedIn]);

  // Parent constraints use the current identity record, not a stored display name.
  useEffect(() => {
    let active = true;

    const loadParents = async () => {
      const ids = {};
      await Promise.all(Object.keys(linkedIds).map(async chainId => {
        const coin = getIdentityCoin(chainId);
        if (!coin?.vrpc_endpoints?.[0] || !!coin.testnet !== requestIsTestnet) return;

        try {
          VrpcProvider.initEndpoint(coin.system_id, coin.vrpc_endpoints[0]);
        } catch (_) {
          return;
        }

        await Promise.all(Object.keys(linkedIds[chainId] || {}).map(async identityID => {
          try {
            const result = await getIdentity(coin.system_id, identityID);
            if (!result.error) ids[`${chainId}:${identityID}`] = result.result?.identity?.parent;
          } catch (_) {
            // Unverified parents remain ineligible until the identities reload.
          }
        }));
      }));

      if (active && getAppEncryptionSessionKey(store.getState()) === sessionKey) {
        setParentData({ scope: parentScope, ids });
      }
    };

    if (linkedIdsLoaded && constraints?.parentIDs.size > 0) loadParents();

    return () => { active = false; };
  }, [parentScope, linkedIdsLoaded, requestIsTestnet]);

  // ── Handle sign-in flow ──
  useEffect(() => {
    if (waitingForSignin && signedIn && sendModalType == null) {
      setWaitingForSignin(false);
    }
  }, [signedIn, sendModalType, waitingForSignin]);

  // ── Auto-select first matching identity ──
  useEffect(() => {
    if (selectedIdentity && !selectedIdentityAllowed) {
      setSelectedIdentity(null);
    } else if (!selectedIdentity && linkedIdsLoaded) {
      const preferredChain = requestIsTestnet ? 'VRSCTEST' : identityNetwork;
      const identityChain = [preferredChain, ...Object.keys(sortedIds)]
        .find(chainId => sortedIds[chainId]?.length > 0);

      if (identityChain) {
        const firstIAddress = Object.keys(linkedIds[identityChain])
          .find(identityID => sortedIds[identityChain].includes(identityID));
        setSelectedIdentity({
          chainId: identityChain,
          iAddress: firstIAddress,
          friendlyName: linkedIds[identityChain][firstIAddress] || firstIAddress,
        });
      }
    }
  }, [linkedIds, linkedIdsLoaded, sortedIds, selectedIdentity, selectedIdentityAllowed, requestIsTestnet, identityNetwork]);

  // ── Identity picker handlers ──
  const handleOpenIdentitySheet = () => {
    setIdentitySheetVisible(true);
  };

  const handleSelectIdentity = (chainId, iAddress, friendlyName) => {
    if (!currentReview.current.sortedIds[chainId]?.includes(iAddress)) return;

    activeApproval.current = null;
    setSelectedIdentity({ chainId, iAddress, friendlyName });
    setIdentitySheetVisible(false);
  };

  // ── Open signer modal ──
  const openSignerModal = () => {
    if (signerSystemID && signerIdentityID) {
      const coinObj = getIdentityCoin(signerSystemID);
      if (coinObj) {
        setVerusIdDetailsModalProps({
          loadVerusId: async () => {
            const res = await getIdentity(coinObj.system_id, signerIdentityID);
            if (res.error) throw new Error(res.error.message);
            return res.result;
          },
          visible: true,
          animationType: 'slide',
          cancel: () => setVerusIdDetailsModalProps(null),
          loadFriendlyNames: async () => ({}),
          coinObj,
        });
      }
    }
  };

  const handleSignin = () => {
    if (matchingAccounts.length === 0) {
      createAlert(
        'No profile found',
        `No ${requestIsTestnet ? 'testnet' : 'mainnet'} profile is available for this request.`,
      );
      return;
    }

    openAuthenticateUserModal({
      [SEND_MODAL_USER_ALLOWLIST]: matchingAccounts,
    });
    setWaitingForSignin(true);
  };

  // ── Handle approval ──
  const handleApprove = async () => {
    if (!mounted.current || currentReview.current !== review || activeApproval.current) return;

    // Check if signed in
    if (!signedIn) {
      handleSignin();
      return;
    }

    if (isWrongRequestType || getAppEncryptionSessionKey(store.getState()) !== sessionKey) return;

    if (!selectedIdentityAllowed) {
      createAlert('Error', 'Please select an identity to respond with.');
      return;
    }

    // This guard also protects callbacks retained after the user changes their selection.
    const approval = {
      isActive: () => {
        try {
          return mounted.current && currentReview.current === review &&
            activeApproval.current === approval &&
            getAppEncryptionSessionKey(store.getState()) === sessionKey &&
            JSON.stringify(store.getState().services.stored[VERUSID_SERVICE_ID]) === linkedIdsVersion &&
            request.toBuffer().toString('hex') === requestHex;
        } catch (e) {
          return false;
        }
      },
      assertActive: () => {
        if (!approval.isActive()) {
          throw Object.assign(new Error('Encryption approval is no longer current.'), { code: 'SESSION_CHANGED' });
        }
      },
    };
    activeApproval.current = approval;
    setLoading(true);

    try {
      approval.assertActive();
      // Keep a pending response private until this approval is sent.
      const updatedResponse = new GenericResponse({
        ...response,
        details: [...(response?.details || [])],
      });
      const coinObj = CoinDirectory.findCoinObj(selectedIdentity.chainId);

      if (!coinObj) {
        throw new Error('Unsupported signing chain.');
      }

      ensureGenericResponseSigner({
        response: updatedResponse,
        systemID: coinObj.system_id,
        identityID: selectedIdentity.iAddress,
      });

      // Process the encryption request
      const { responseDetail, encryptedDescriptorJson: descriptorJson } = await processAppEncryptionRequest({
        request,
        detailIndex,
        responseSignerID: selectedIdentity.iAddress,
        responseSignerSystemID: coinObj.system_id,
        assertActive: approval.assertActive,
      });
      approval.assertActive();

      // Build updated response
      updatedResponse.details = updatedResponse.details || [];
      updatedResponse.details.push(responseDetail);

      updatedResponse.setFlags();

      // Serialize to hex so the user can preview/copy the encrypted response
      const responseHex = updatedResponse.toBuffer().toString('hex');
      setEncryptedResponseHex(responseHex);
      setEncryptedDescriptorJson(descriptorJson);
      setPendingResponse({ updatedResponse, handledIndices: [detailIndex], approval, review });
    } catch (e) {
      if (!approval.isActive() || e.code === 'SESSION_CHANGED') return;

      activeApproval.current = null;
      const isZSeedMissing = e.message && e.message.includes('No Z (shielded address) seed');
      createAlert(
        isZSeedMissing ? 'Z Seed Required' : 'Error',
        e.message || 'Failed to process encryption request.'
      );
      if (isZSeedMissing) {
        cancel();
      }
    } finally {
      if (mounted.current && currentReview.current === review) setLoading(false);
    }
  };

  // ── Handle denial ──
  const handleDeny = () => {
    createAlert(
      'Deny Request',
      'Are you sure you want to deny this encryption request?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolveAlert() },
        { text: 'Deny', style: 'destructive', onPress: () => { resolveAlert(); cancel(); } },
      ]
    );
  };

  // ── Copy z-address to clipboard ──
  const copyZAddress = (address) => {
    copyToClipboard(address);
    createAlert('Copied', 'Address copied to clipboard.');
  };

  // ── Send the pending response (after reviewing debug info) ──
  const handleSendResponse = async () => {
    if (!pendingResponse?.approval.isActive() || sending.current) return;
    sending.current = true;
    setLoading(true);
    try {
      pendingResponse.approval.assertActive();
      await next(pendingResponse.updatedResponse, pendingResponse.handledIndices);
    } catch (e) {
      if (!pendingResponse.approval.isActive() || e.code === 'SESSION_CHANGED') return;
      createAlert('Error', e.message || 'Failed to send response.');
    } finally {
      sending.current = false;
      if (pendingResponse.approval.isActive()) setLoading(false);
    }
  };

  // ── Debug dropdown state ──
  const [debugExpanded, setDebugExpanded] = useState(false);
  const approveDisabled =
    waitingForSignin || isWrongRequestType || (signedIn && !selectedIdentityAllowed);
  const daemonDecryptCommand = useMemo(() => {
    if (!encryptedDescriptorJson) return null;

    return buildDaemonDecryptCommand({
      encryptedDescriptorJson,
      signerSystemID,
    });
  }, [encryptedDescriptorJson, signerSystemID]);

  // ── Render response preview screen ──
  if (encryptedResponseHex && pendingResponse?.review === review) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.readyHeader}>
            <View style={styles.readyIconCircle}>
              <MaterialCommunityIcons
                name="lock-check"
                size={48}
                color={Colors.verusGreenColor}
              />
            </View>
            <Text style={styles.readyTitle}>
              Your encrypted response is ready to send
            </Text>
            <Text style={styles.readySubtitle}>
              The encryption was successful. Press continue to send it back to the requesting app.
            </Text>
          </View>

          {/* Debug dropdown */}
          {encryptedDescriptorJson && (
            <View style={styles.debugSection}>
              <TouchableOpacity
                style={styles.debugToggle}
                onPress={() => setDebugExpanded(!debugExpanded)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={debugExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#888"
                />
                <Text style={styles.debugToggleText}>View debug information</Text>
              </TouchableOpacity>

              {debugExpanded && (
                <View style={styles.debugContent}>
                  {/* Encrypted Descriptor JSON */}
                  <View style={styles.debugCard}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Encrypted Descriptor (JSON)</Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        const jsonStr = JSON.stringify(encryptedDescriptorJson, null, 2);
                        copyToClipboard(jsonStr);
                        createAlert('Copied', 'Encrypted descriptor JSON copied to clipboard.');
                      }}
                      style={styles.responseHexContainer}
                    >
                      <Text selectable style={styles.responseHexText}>
                        {JSON.stringify(encryptedDescriptorJson, null, 2)}
                      </Text>
                      <View style={styles.responseHexCopyHint}>
                        <MaterialCommunityIcons name="content-copy" size={16} color={Colors.primaryColor} />
                        <Text style={styles.responseHexCopyHintText}>Tap to copy</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Daemon decryptdata command */}
                  <View style={styles.debugCard}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Daemon Command</Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        copyToClipboard(daemonDecryptCommand);
                        createAlert('Copied', 'Daemon command copied to clipboard.');
                      }}
                      style={styles.responseHexContainer}
                    >
                      <Text selectable style={styles.responseHexText}>
                        {daemonDecryptCommand}
                      </Text>
                      <View style={styles.responseHexCopyHint}>
                        <MaterialCommunityIcons name="content-copy" size={16} color={Colors.primaryColor} />
                        <Text style={styles.responseHexCopyHintText}>Tap to copy command</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer: single Continue button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueCta}
            onPress={handleSendResponse}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.continueCtaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ──
  if (loading) {
    return <AnimatedActivityIndicatorBox />;
  }

  return (
    <SafeAreaView style={styles.root}>
      {verusIdDetailsModalProps && (
        <VerusIdDetailsModal {...verusIdDetailsModalProps} />
      )}

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons 
            name="key-variant" 
            size={48} 
            color={Colors.primaryColor} 
          />
          <Text style={styles.headerTitle}>Encryption Key Request</Text>
          <Text style={styles.headerSubtitle}>
            {requesterLabel} is requesting a private encryption address from your identity.
          </Text>
        </View>

        {!signedIn && (
          <View style={styles.infoCard}>
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={Colors.primaryColor}
            />
            <Text style={styles.infoText}>
              Sign in to a {requestIsTestnet ? 'testnet' : 'mainnet'} profile to approve this request.
            </Text>
          </View>
        )}

        {/* Wrong Network Warning */}
        {isWrongRequestType && (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={20}
              color="#C62828"
            />
            <Text style={styles.errorText}>
              This request is for {requestIsTestnet ? 'testnet' : 'mainnet'},
              but you are signed into a {requestIsTestnet ? 'mainnet' : 'testnet'} profile.
            </Text>
          </View>
        )}

        {/* ESK Warning */}
        {returnESK && (
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons
                name="alert"
                size={24}
                color="#E65100"
              />
              <Text style={styles.warningTitle}>Extended Spending Key Requested</Text>
            </View>
            <Text style={styles.warningText}>
              {hasDerivationID
                ? 'This app is requesting the Extended Spending Key for the final nested channel. It can decrypt data, spend funds, and derive further keys from this channel. The app-scope key stays private.'
                : 'This app is requesting the Extended Spending Key for the app-scope channel. It can decrypt data, spend funds, and derive every nested channel for your selected identity, app scope, and primary key number.'}
            </Text>
            <Text style={styles.warningEmphasis}>
              Only approve if you fully trust this application.
            </Text>
          </View>
        )}

        {/* Identity Selection Card */}
        {signedIn && (
          <TouchableOpacity
            style={[
              styles.identitySelectCard,
              selectedIdentity && styles.identitySelectCardSelected,
            ]}
            onPress={handleOpenIdentitySheet}
            activeOpacity={0.7}
          >
            <View style={styles.identitySelectIconContainer}>
              <MaterialCommunityIcons
                name="account-check"
                size={28}
                color={selectedIdentity ? Colors.verusGreenColor : '#666'}
              />
            </View>
            <View style={styles.identitySelectTextContainer}>
              <Text style={styles.identitySelectLabel}>
                {selectedIdentity ? 'Your selected identity' : 'Select identity to respond'}
              </Text>
              <Text style={[
                styles.identitySelectName,
                selectedIdentity && styles.identitySelectNameSelected,
              ]}>
                {selectedIdentity
                  ? selectedIdentity.friendlyName && selectedIdentity.friendlyName !== selectedIdentity.iAddress
                    ? convertFqnToDisplayFormat(selectedIdentity.friendlyName)
                    : selectedIdentity.iAddress
                  : 'Tap to choose'}
              </Text>
              {selectedIdentity && (
                <Text style={styles.identitySelectAddress}>
                  {selectedIdentity.iAddress}
                </Text>
              )}
            </View>
            <MaterialCommunityIcons
              name={selectedIdentity ? 'check-circle' : 'chevron-right'}
              size={24}
              color={selectedIdentity ? Colors.verusGreenColor : '#CCC'}
            />
          </TouchableOpacity>
        )}

        {/* Request Details Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Request Details</Text>
          </View>

          {/* Requesting App */}
          <DetailRow
            title={requesterLabel}
            subtitle={`Requesting App${requesterAddress ? ` • ${truncateAddress(requesterAddress)}` : ''}`}
            onPress={signerSystemID && signerIdentityID ? openSignerModal : undefined}
            rightIcon={signerSystemID && signerIdentityID ? 'chevron-right' : undefined}
            showBorder={false}
          />

          {/* Chain */}
          {chainId && (
            <DetailRow
              title={chainId}
              subtitle="Network"
              showBorder={true}
            />
          )}

          {/* Signature Date */}
          {sigDateString && (
            <DetailRow
              title={sigDateString}
              subtitle="Request Signed"
              showBorder={true}
            />
          )}

          {/* App scope is always the first derivation target, even when nested. */}
          <DetailRow
            title={appScopeFqn || appScopeID}
            subtitle={`App Scope${appScopeFqn && appScopeFqn !== appScopeID ? ` • ${appScopeID}` : ''}`}
            showBorder={true}
          />

          <DetailRow
            title={`#${derivationNumber}`}
            subtitle="Primary Key Number • Within the app scope"
            showBorder={true}
          />

          {hasDerivationID && (
            <>
              <DetailRow
                title={derivationIdFqn || derivationIdentityID}
                subtitle={`Nested Identity${derivationIdFqn && derivationIdFqn !== derivationIdentityID ? ` • ${derivationIdentityID}` : ''}`}
                showBorder={true}
              />
              <DetailRow
                title={`#${secondaryDerivationNumber}`}
                subtitle="Secondary Key Number • Within the nested identity"
                showBorder={true}
              />
            </>
          )}

          {/* Request ID */}
          {hasRequestID && (
            <DetailRow
              title={requestIdFqn}
              subtitle="Request ID"
              showBorder={true}
            />
          )}

          {/* Every app encryption response requires this recipient. */}
          <DetailRow
            title={encryptResponseToAddress}
            subtitle="Response Encryption Recipient"
            onPress={() => copyZAddress(encryptResponseToAddress)}
            rightIcon="content-copy"
            showBorder={true}
          />
        </View>

        {/* Identity Picker Sheet */}
        <IdentityPickerSheet
          visible={identitySheetVisible}
          linkedIds={linkedIds}
          sortedIds={sortedIds}
          selectedIdentity={selectedIdentity}
          onClose={() => setIdentitySheetVisible(false)}
          onSelect={handleSelectIdentity}
        />

      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <View style={styles.ctaCol}>
          <Button
            mode="outlined"
            onPress={handleDeny}
            style={styles.secondaryCta}
            contentStyle={styles.secondaryCtaContent}
            labelStyle={styles.secondaryCtaLabel}
          >
            Deny
          </Button>
        </View>
        <View style={styles.ctaCol}>
          <TouchableOpacity
            style={[
              styles.continueCta,
              approveDisabled && styles.continueCtaDisabled,
            ]}
            onPress={handleApprove}
            activeOpacity={0.8}
            disabled={approveDisabled}
          >
            <Text style={styles.continueCtaText}>{signedIn ? 'Approve' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const AppEncryptionRequestInfo = props => {
  const sessionKey = useSelector(getAppEncryptionSessionKey);
  return <AppEncryptionRequestSession key={sessionKey} {...props} sessionKey={sessionKey} />;
};

export default AppEncryptionRequestInfo;

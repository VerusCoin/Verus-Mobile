/*
  AuthenticationRequestInfo
  - 2026-02-07: Inline identity selection via bottom sheet.
    - Added identity loading, constraint filtering, and IdentityPickerSheet
    - Choose-identity card opens sheet; selection shown on card
    - Continue builds response in-place instead of navigating to separate screen
    - Fixed connector arrow to attach flush to top card
    - Changed selection accent from blue to verusGreenColor
    - Truncated i-address display to first 6 + last 6 chars
    - Disabled Continue until identity is selected
    - Resolved constraint i-addresses to friendly names via getIdentity
*/
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Portal, Text, Divider, List } from 'react-native-paper';
import { useSelector } from 'react-redux';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import Colors from '../../../globals/colors';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL, SEND_MODAL_USER_ALLOWLIST } from '../../../utils/constants/sendModal';
import { createAlert, resolveAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { unixToDate } from '../../../utils/math';
import {
  AuthenticationRequestDetails, RecipientConstraint,
  AuthenticationResponseDetails,
  AuthenticationResponseOrdinalVDXFObject,
  CompactAddressObject,
  GenericResponse,
  VerifiableSignatureData,
} from 'verus-typescript-primitives';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { getFriendlyNameMap, getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import { convertFqnToDisplayFormat } from '../../../utils/fullyqualifiedname';
import { requestServiceStoredData } from '../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../utils/constants/services';
import { VERUSID_NETWORK_DEFAULT } from '../../../../env/index';
import GradientButton from '../../../components/GradientButton';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import VerusIdAtIcon from '../../../images/customIcons/verusid-at-icon.svg';
import IdentityPickerSheet from './components/IdentityPickerSheet';

const truncateAddress = (addr) => {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
};

const Connector = () => {
  return (
    <View style={styles.connectorContainer}>
      <View style={styles.connectorLine} />
      <View style={styles.connectorArrow} />
    </View>
  );
};

const AuthenticationRequestInfo = props => {
  const {
    detailsBufferString,
    sigtime,
    signerFqn,
    signerSystemID,
    signerSystemName,
    signerIdentityID,
    provisioningDetailsBufferString,
    provisioningDetailIndex,
    cancel,
    navigation,
    next,
    request,
    response,
    detailIndex,
  } = props;

  const [details, setDetails] = useState(new AuthenticationRequestDetails());
  const [loading, setLoading] = useState(false);
  const [sigDateString, setSigDateString] = useState(null);
  const [waitingForSignin, setWaitingForSignin] = useState(false);
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] = useState(null);
  const [constraintFriendlyNames, setConstraintFriendlyNames] = useState({});
  const [constraintNamesLoading, setConstraintNamesLoading] = useState(false);

  // Identity picker state
  const [linkedIds, setLinkedIds] = useState({});
  const [sortedIds, setSortedIds] = useState({});
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState(null); // { chainId, iAddress, friendlyName }


  const accounts = useObjectSelector(state => state.authentication.accounts);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const passthrough = useSelector(state => state.deeplink.passthrough);
  const sendModalType = useSelector(state => state.sendModal.type);
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const isTestAccount = activeAccount && Object.keys(activeAccount.testnetOverrides).length > 0;
  const encryptedIds = useObjectSelector(state => state.services.stored[VERUSID_SERVICE_ID]);
  const testnetOverrides = useObjectSelector(state => state.authentication.activeAccount?.testnetOverrides || {});
  const identityNetwork = testnetOverrides[VERUSID_NETWORK_DEFAULT]
    ? testnetOverrides[VERUSID_NETWORK_DEFAULT]
    : VERUSID_NETWORK_DEFAULT;

  const requestIsTestnet = request != null && request.isTestnet();
  const canOpenSignerModal = signerSystemName && signerIdentityID;
  const defaultConstraintChain = requestIsTestnet ? 'VRSCTEST' : 'VRSC';
  const constraintChain = signerSystemName || defaultConstraintChain;
  const requesterLabel = signerFqn || 'An app';
  const systemLabel =
    signerSystemName || getSystemNameFromSystemId(signerSystemID) || signerSystemID;

  // Identity constraint filtering (mirrored from AuthenticationRequestIdentity)
  const recipientConstraints = details && details.recipientConstraints ? details.recipientConstraints : [];

  const allowedSystems = useMemo(() => {
    const systems = recipientConstraints
      .filter(x => x.type === AuthenticationRequestDetails.REQUIRED_SYSTEM)
      .map(x => {
        try {
          return getSystemNameFromSystemId(x.identity.toIAddress());
        } catch (e) {
          return null;
        }
      })
      .filter(x => x != null);
    return new Set(systems);
  }, [recipientConstraints]);

  const requiredIds = useMemo(() => {
    return new Set(
      recipientConstraints
        .filter(x => x.type === AuthenticationRequestDetails.REQUIRED_ID)
        .map(x => {
          try {
            return x.identity.toIAddress();
          } catch (e) {
            return null;
          }
        })
        .filter(x => x != null),
    );
  }, [recipientConstraints]);

  const isIdentityAllowed = (chainId, iAddr) => {
    if (requiredIds.size > 0 && !requiredIds.has(iAddr)) return false;
    if (allowedSystems.size > 0 && !allowedSystems.has(chainId)) return false;
    return true;
  };

  const getConstraintAddress = (constraint) => {
    if (constraint == null || constraint.identity == null) return null;

    try {
      return constraint.identity.toIAddress();
    } catch (e) {
      try {
        return constraint.identity.toAddress();
      } catch (e2) {
        return constraint.identity.address || null;
      }
    }
  };

  const getConstraintDisplayName = (constraintType, constraintAddress) => {
    if (constraintAddress && constraintFriendlyNames[constraintAddress]) {
      return constraintFriendlyNames[constraintAddress];
    }

    if (constraintType === RecipientConstraint.REQUIRED_SYSTEM && constraintAddress) {
      const systemName = getSystemNameFromSystemId(constraintAddress);
      if (systemName) return systemName;
      return 'Unknown system';
    }

    if (constraintAddress && constraintAddress.includes('@')) {
      return constraintAddress;
    }

    return 'Unknown identity';
  };

  const getConstraintLabel = (constraint) => {
    const constraintAddress = getConstraintAddress(constraint);
    const constraintLabel = getConstraintDisplayName(constraint.type, constraintAddress);

    // Use resolved friendly name if available
    const friendlyName = constraintFriendlyNames[constraintLabel];
    if (friendlyName && constraint.type !== AuthenticationRequestDetails.REQUIRED_SYSTEM) {
      constraintLabel = friendlyName;
    }

    switch (constraint.type) {
      case RecipientConstraint.REQUIRED_ID:
        return `Required identity:\n${constraintLabel}`;
      case RecipientConstraint.REQUIRED_SYSTEM:
        return `Required system:\n${constraintLabel.substring(0, constraintLabel.length - 1)}`;
      case RecipientConstraint.REQUIRED_PARENT:
        return `Required parent:\n${constraintLabel}`;
      default:
        return `Constraint:\n${constraintLabel}`;
    }
  };

  const getExpiryLabel = () => {
    if (!details || !details.hasExpiryTime()) return null;
    return unixToDate(details.expiryTime.toNumber());
  };

  const getVerusId = async (chain, iAddrOrName) => {
    const identity = await getIdentity(CoinDirectory.getBasicCoinObj(chain).system_id, iAddrOrName);

    if (identity.error) throw new Error(identity.error.message);
    else return identity.result;
  };

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
    })
  };

  const getMainHeading = () => {
    const requesterLabel = signerFqn ? signerFqn : 'An app';
    const hasResponseUris = details && details.responseURIs && details.responseURIs.length > 0;

    if (hasResponseUris) {
      return `${requesterLabel} is requesting login with VerusID`;
    }

    if (passthrough?.fqnToAutoLink) {
      return `VerusID from ${requesterLabel} now ready to link`;
    }

    return `Would you like to request a VerusID from ${requesterLabel}?`;
  };

  const getAllowList = () => {
    if (requestIsTestnet) {
      return accounts.filter(x => x.testnetOverrides && Object.keys(x.testnetOverrides).length > 0);
    }
    return accounts.filter(x => !x.testnetOverrides || Object.keys(x.testnetOverrides).length === 0);
  };

  // Build response using selected identity and call next()
  const buildResponseAndContinue = () => {
    const { chainId, iAddress } = selectedIdentity;

    const responseDetail = new AuthenticationResponseOrdinalVDXFObject({
      data: new AuthenticationResponseDetails({
        requestID: details.requestID,
      }),
    });

    const baseResponse = response || new GenericResponse();
    if (baseResponse.details == null) baseResponse.details = [];
    baseResponse.details = [...baseResponse.details, responseDetail];

    if (baseResponse.signature == null) {
      const coinObj = CoinDirectory.findCoinObj(chainId);
      baseResponse.signature = new VerifiableSignatureData({
        systemID: CompactAddressObject.fromIAddress(coinObj.system_id),
        identityID: CompactAddressObject.fromIAddress(iAddress),
      });
      baseResponse.setSigned();
    }

    next(baseResponse, [detailIndex]);
  };

  const handleContinue = () => {
    if (signedIn) {
      const requestBufferString = request.toBuffer().toString('hex');
      const responseBufferString = response.details && response.details.length > 0
        ? response.toBuffer().toString('hex')
        : '';

      navigation.navigate('AuthenticationRequestIdentity', {
        detailsBufferString,
        requestBufferString,
        responseBufferString,
        detailIndex,
        next,
        signerIdentityID,
        provisioningDetailsBufferString,
        provisioningDetailIndex
      });
      if (!selectedIdentity) return;
      buildResponseAndContinue();
    } else {
      setWaitingForSignin(true);
      const allowList = getAllowList();

      if (allowList.length > 0) {
        const data = {
          [SEND_MODAL_USER_ALLOWLIST]: allowList
        };

        openAuthenticateUserModal(data);
      } else {
        createAlert(
          "Cannot continue",
          `No ${requestIsTestnet ? 'testnet' : 'mainnet'} profiles found, cannot respond to authentication request.`,
        );
      }
    }
  };

  const wrongRequestType = (isTestRequest) => {
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
      {
        cancelable: false,
      },
    );
  };

  useEffect(() => {
    if (signedIn && waitingForSignin) {
      handleContinue();
    }
  }, [signedIn, waitingForSignin]);

  useEffect(() => {
    if (sendModalType != AUTHENTICATE_USER_SEND_MODAL) {
      setLoading(false);
    } else setLoading(true);
  }, [sendModalType]);

  useEffect(() => {
    if (signedIn && request != null) {
      if ((isTestAccount && !requestIsTestnet) || (!isTestAccount && requestIsTestnet)) {
        wrongRequestType(requestIsTestnet);
      }
    }
  }, [signedIn, requestIsTestnet, isTestAccount]);

  const expiryLabel = getExpiryLabel();
  const constraints = details && details.recipientConstraints ? details.recipientConstraints : [];
  const responseUris = details && details.responseURIs ? details.responseURIs : [];
  const detailRows = useMemo(() => {
    const rows = [];

    if (constraints.length > 0) {
      constraints.forEach((constraint, index) => {
        rows.push({
          key: `constraint-${index}`,
          title: getConstraintLabel(constraint),
          subtitle: 'Recipient constraint',
        });
      });
    }

    if (responseUris.length > 0) {
      responseUris.forEach((uri, index) => {
        rows.push({
          key: `response-${index}`,
          title: uri.getUriString(),
          subtitle: 'Response URI',
        });
      });
    }

    if (expiryLabel != null) {
      rows.push({
        key: 'expiry',
        title: expiryLabel,
        subtitle: 'Expires at',
      });
    }

    return rows;
  }, [constraints, responseUris, expiryLabel, constraintFriendlyNames]);

  useEffect(() => {
    if (detailsBufferString) {
      const det = new AuthenticationRequestDetails();
      det.fromBuffer(Buffer.from(detailsBufferString, 'hex'), 0);
      setDetails(det);
    }
  }, [detailsBufferString]);

  // Resolve friendly names for constraint i-addresses
  useEffect(() => {
    const resolveConstraintNames = async () => {
      const constraintsToResolve = recipientConstraints.filter(
        c => c.type === AuthenticationRequestDetails.REQUIRED_PARENT ||
             c.type === AuthenticationRequestDetails.REQUIRED_ID
      );

      if (constraintsToResolve.length === 0) return;

      const names = {};
      const systemId = signerSystemID || (requestIsTestnet ? 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq' : 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV');

      for (const constraint of constraintsToResolve) {
        try {
          const iAddr = constraint.identity.toIAddress();
          const result = await getIdentity(systemId, iAddr);
          if (!result.error && result.result && result.result.fullyqualifiedname) {
            names[iAddr] = result.result.fullyqualifiedname;
          }
        } catch (e) {
          // Keep i-address as fallback
        }
      }

      if (Object.keys(names).length > 0) {
        setConstraintFriendlyNames(prev => ({ ...prev, ...names }));
      }
    };

    if (recipientConstraints.length > 0) {
      resolveConstraintNames();
    }
  }, [recipientConstraints, signerSystemID]);

  useEffect(() => {
    if (sigtime != null) {
      setSigDateString(unixToDate(sigtime));
    } else {
      setSigDateString(null);
    }
  }, [sigtime]);

  useEffect(() => {
    let cancelled = false;

    const loadConstraintFriendlyNames = async () => {
      const recipientConstraints = details && details.recipientConstraints ? details.recipientConstraints : [];

      if (recipientConstraints.length === 0) {
        setConstraintFriendlyNames(prev => (Object.keys(prev).length > 0 ? {} : prev));
        setConstraintNamesLoading(false);
        return;
      }

      setConstraintNamesLoading(true);

      const constraintAddresses = Array.from(
        new Set(recipientConstraints.map(getConstraintAddress).filter(addr => addr != null))
      );

      if (constraintAddresses.length === 0) {
        setConstraintFriendlyNames(prev => (Object.keys(prev).length > 0 ? {} : prev));
        setConstraintNamesLoading(false);
        return;
      }

      try {
        const coinObj = CoinDirectory.getBasicCoinObj(constraintChain);
        let names = {
          ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
          ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
        };

        if (signerIdentityID) {
          const signerIdentity = await getIdentity(coinObj.system_id, signerIdentityID);
          if (!signerIdentity.error && signerIdentity.result) {
            names = await getFriendlyNameMap(coinObj.system_id, signerIdentity.result, [...constraintAddresses]);
          } else {
            for (const addr of constraintAddresses) {
              const identity = await getIdentity(coinObj.system_id, addr);
              if (!identity.error && identity.result && identity.result.fullyqualifiedname) {
                names[addr] = convertFqnToDisplayFormat(identity.result.fullyqualifiedname);
              }
            }
          }
        } else {
          for (const addr of constraintAddresses) {
            const identity = await getIdentity(coinObj.system_id, addr);
            if (!identity.error && identity.result && identity.result.fullyqualifiedname) {
              names[addr] = convertFqnToDisplayFormat(identity.result.fullyqualifiedname);
            }
          }
        }

        if (!cancelled) {
          setConstraintFriendlyNames(names);
        }
      } catch (e) {
        if (!cancelled) {
          setConstraintFriendlyNames({
            ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
            ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
          });
        }
      } finally {
        if (!cancelled) {
          setConstraintNamesLoading(false);
        }
      }
    };

    loadConstraintFriendlyNames();

    return () => {
      cancelled = true;
    };
  }, [details, signerIdentityID, constraintChain]);

  // Load linked identities when encrypted IDs change (user signs in / links ID)
  useEffect(() => {
    const loadLinkedIds = async () => {
      try {
        const verusIdServiceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
        if (verusIdServiceData.linked_ids) {
          setLinkedIds(verusIdServiceData.linked_ids);
        } else {
          setLinkedIds({});
        }
      } catch (e) {
        // Silently handle — identities will show as empty
        setLinkedIds({});
      }
    };

    if (signedIn) {
      loadLinkedIds();
    }
  }, [encryptedIds, signedIn]);

  // Sort identities alphabetically by friendly name per chain
  useEffect(() => {
    const sorted = {};
    for (const chainId of Object.keys(linkedIds)) {
      sorted[chainId] = linkedIds[chainId]
        ? Object.keys(linkedIds[chainId]).sort((a, b) => {
            const nameA = linkedIds[chainId][a] || '';
            const nameB = linkedIds[chainId][b] || '';
            return nameA.localeCompare(nameB);
          })
        : [];
    }
    setSortedIds(sorted);
  }, [linkedIds]);

  // Identity sheet handlers
  const handleOpenIdentitySheet = () => {
    setIdentitySheetVisible(true);
  };

  const handleSelectIdentity = (chainId, iAddress, friendlyName) => {
    setSelectedIdentity({ chainId, iAddress, friendlyName });
    setIdentitySheetVisible(false);
  };

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <SafeAreaView style={styles.container}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
      </Portal>
      <View style={{ flex: 1, width: '100%' }}>
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={Styles.focalCenter}>
          <Text style={{ fontSize: 18, textAlign: 'center', paddingBottom: 12, width: "90%" }}>
            {getMainHeading()}
          </Text>
          <View style={Styles.fullWidth}>
            <Divider />
            {(signerFqn || sigDateString) && (
              <React.Fragment>
                {signerFqn && (
                  <TouchableOpacity
                    disabled={!canOpenSignerModal}
                    onPress={() => openVerusIdDetailsModal(signerSystemName, signerIdentityID)}>
                    <List.Item
                      title={signerFqn}
                      description={'Requested by'}
                      right={props => (
                        <List.Icon {...props} icon={'information'} size={20} />
                      )}
                    />
                    <Divider />
                  </TouchableOpacity>
                )}
                {(signerSystemName || signerSystemID) && (
                  <React.Fragment>
                    <List.Item title={signerSystemName || signerSystemID} description={'Signature system'} />
                    <Divider />
                  </React.Fragment>
                )}
                {sigDateString && (
                  <React.Fragment>
                    <List.Item title={sigDateString} description={'Signed on'} />
                    <Divider />
                  </React.Fragment>
                )}
              </React.Fragment>
            )}
            {constraints.length > 0 && constraintNamesLoading && (
              <React.Fragment>
                <List.Subheader>Your VerusID must have:</List.Subheader>
                <List.Item title={'Resolving recipient constraints...'} />
                <Divider />
              </React.Fragment>
            )}
            {constraints.length > 0 && !constraintNamesLoading && (
              <React.Fragment>
                <List.Subheader>Your VerusID must have:</List.Subheader>
                {constraints.map((constraint, index) => (
                  <React.Fragment key={`${constraint.type}-${index}`}>
                    <List.Item title={getConstraintLabel(constraint)} />
                    <Divider />
                  </React.Fragment>
                ))}
              </React.Fragment>
            )}
            {responseUris.length > 0 && (
              <React.Fragment>
                <List.Subheader>Response URIs</List.Subheader>
                {responseUris.map((uri, index) => (
                  <React.Fragment key={`${uri.getUriString()}-${index}`}>
                    <List.Item title={uri.getUriString()} />
                    <Divider />
                  </React.Fragment>
                ))}
              </React.Fragment>
            )}
            {expiryLabel != null && (
              <React.Fragment>
                <List.Item title={expiryLabel} description={'Expires at'} />
                <Divider />
              </React.Fragment>
            )}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <View style={styles.ctaCol}>
          <Button
            mode="contained"
            onPress={() => cancel()}
            style={styles.secondaryCta}
            contentStyle={styles.secondaryCtaContent}
            uppercase={false}
            buttonColor="#EBF6FF"
            textColor={Colors.primaryColor}
            labelStyle={styles.secondaryCtaLabel}
          >
            Cancel
          </Button>
        </View>
        <View style={styles.ctaCol}>
          <GradientButton
            onPress={() => handleContinue()}
            style={[styles.primaryCta, !selectedIdentity && styles.primaryCtaDisabled]}
            disabled={!selectedIdentity}
          >
            Continue
          </GradientButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AuthenticationRequestInfo;

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
  chipText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  connectorContainer: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    zIndex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  connectorLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#E0E0E0',
    position: 'absolute',
  },
  connectorArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E0E0E0',
    position: 'absolute',
    bottom: 0,
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
  targetCardSelected: {
    borderColor: Colors.verusGreenColor,
    backgroundColor: '#F5FBF6',
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
  targetAddress: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sectionHelper: {
    fontSize: 12,
    color: '#888',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    marginTop: -4,
  },
  sectionContent: {
    padding: 0,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  detailLeft: {
    flex: 1,
    marginRight: 12,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  detailSubtitle: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  emptyRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  emptyText: {
    fontSize: 12,
    color: '#888',
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
    shadowOffset: { width: 0, height: 0 },
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
  primaryCtaDisabled: {
    opacity: 0.4,
  },
});

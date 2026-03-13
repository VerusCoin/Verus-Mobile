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
  - 2026-03-11: Fixed auth constraint system resolution and offline parent derivation .
*/
import React, {useEffect, useMemo, useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import {Button, Portal, Text} from 'react-native-paper';
import {useSelector} from 'react-redux';
import {CommonActions} from '@react-navigation/native';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import Colors from '../../../globals/colors';
import {
  openAuthenticateUserModal,
  openLinkIdentityModal,
  openProvisionIdentityModal,
} from '../../../actions/actions/sendModal/dispatchers/sendModal';
import {
  AUTHENTICATE_USER_SEND_MODAL,
  SEND_MODAL_IDENTITY_TO_LINK_FIELD,
  SEND_MODAL_USER_ALLOWLIST,
} from '../../../utils/constants/sendModal';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {unixToDate} from '../../../utils/math';
import {
  AuthenticationRequestDetails,
  RecipientConstraint,
  AuthenticationResponseDetails,
  AuthenticationResponseOrdinalVDXFObject,
  CompactAddressObject,
  fqnToParentAddress,
  fqnToParentFqn,
  GenericResponse,
  ProvisionIdentityDetails,
  VerifiableSignatureData,
} from 'verus-typescript-primitives';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {
  getFriendlyNameMap,
  getCurrency,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {getSystemNameFromSystemId} from '../../../utils/CoinData/CoinData';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import {convertFqnToDisplayFormat} from '../../../utils/fullyqualifiedname';
import {requestServiceStoredData} from '../../../utils/auth/authBox';
import {VERUSID_SERVICE_ID} from '../../../utils/constants/services';
import GradientButton from '../../../components/GradientButton';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import VerusIdAtIcon from '../../../images/customIcons/verusid-at-icon.svg';
import { authenticationRequestInfoStyles as styles } from '../../../styles';
import IdentityPickerSheet from './components/IdentityPickerSheet';

const truncateAddress = addr => {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
};

const toAddressString = addressObj => {
  if (addressObj == null || typeof addressObj.toAddress !== 'function') {
    throw new Error('Expected compact address object');
  }

  return addressObj.toAddress();
};

const EMPTY_RECIPIENT_CONSTRAINTS = [];
const ROOT_CHAIN_BY_NETWORK = {
  mainnet: 'VRSC',
  testnet: 'VRSCTEST',
};

const getDisplaySystemName = fullyqualifiedname => {
  if (!fullyqualifiedname) return null;

  const displayName = convertFqnToDisplayFormat(fullyqualifiedname);
  return displayName.endsWith('@')
    ? displayName.slice(0, displayName.length - 1)
    : displayName;
};

const getOfflineSystemName = systemId => {
  if (!systemId) return null;

  try {
    return getSystemNameFromSystemId(systemId);
  } catch (e) {
    return null;
  }
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
    next,
    request,
    response,
    detailIndex,
  } = props;

  const [details, setDetails] = useState(new AuthenticationRequestDetails());
  const [loading, setLoading] = useState(false);
  const [sigDateString, setSigDateString] = useState(null);
  const [waitingForSignin, setWaitingForSignin] = useState(false);
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] =
    useState(null);
  const [constraintFriendlyNames, setConstraintFriendlyNames] = useState({});
  const [passthroughHandled, setPassthroughHandled] = useState(false);
  const [technicalDetailsExpanded, setTechnicalDetailsExpanded] =
    useState(false);
  const [resolvedSystemNames, setResolvedSystemNames] = useState({});

  // Identity picker state
  const [linkedIds, setLinkedIds] = useState({});
  const [linkedIdsLoaded, setLinkedIdsLoaded] = useState(false);
  const [linkedIdentityParentIds, setLinkedIdentityParentIds] = useState({});
  const [linkedIdentityParentsLoaded, setLinkedIdentityParentsLoaded] =
    useState(false);
  const [sortedIds, setSortedIds] = useState({});
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState(null); // { chainId, iAddress, friendlyName }
  const [idProvisionSuccess, setIdProvisionSuccess] = useState(false);

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const passthrough = useSelector(state => state.deeplink.passthrough);
  const sendModal = useObjectSelector(state => state.sendModal);
  const sendModalType = useSelector(state => state.sendModal.type);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const isTestAccount =
    activeAccount && Object.keys(activeAccount.testnetOverrides).length > 0;
  const encryptedIds = useObjectSelector(
    state => state.services.stored[VERUSID_SERVICE_ID],
  );

  const requestIsTestnet = request != null && request.isTestnet();
  const defaultRootChainId = requestIsTestnet
    ? ROOT_CHAIN_BY_NETWORK.testnet
    : ROOT_CHAIN_BY_NETWORK.mainnet;
  const defaultRootSystemId =
    CoinDirectory.getBasicCoinObj(defaultRootChainId).system_id;
  const requesterLabel = signerFqn || 'An app';

  // Identity constraint filtering (mirrored from AuthenticationRequestIdentity)
  const recipientConstraints =
    details && details.recipientConstraints
      ? details.recipientConstraints
      : EMPTY_RECIPIENT_CONSTRAINTS;
  const requiredSystemIds = useMemo(() => {
    return recipientConstraints
      .filter(x => x.type === RecipientConstraint.REQUIRED_SYSTEM)
      .map(x => {
        try {
          return toAddressString(x.identity);
        } catch (e) {
          return null;
        }
      })
      .filter(x => x != null);
  }, [recipientConstraints]);
  const systemIdsToResolve = useMemo(() => {
    return Array.from(
      new Set([signerSystemID, ...requiredSystemIds].filter(Boolean)),
    );
  }, [requiredSystemIds, signerSystemID]);
  const responseUris = useMemo(() => {
    if (request && request.responseURIs && request.responseURIs.length > 0) {
      return request.responseURIs;
    }

    return [];
  }, [request]);

  useEffect(() => {
    let cancelled = false;

    const resolveSystemNames = async () => {
      const pendingSystemIds = systemIdsToResolve.filter(
        systemId => resolvedSystemNames[systemId] == null,
      );

      if (pendingSystemIds.length === 0) {
        return;
      }

      const resolvedNames = {};

      for (const systemId of pendingSystemIds) {
        const offlineName = getOfflineSystemName(systemId);

        if (offlineName) {
          resolvedNames[systemId] = offlineName;
          continue;
        }

        try {
          const currencyRes = await getCurrency(defaultRootSystemId, systemId);
          if (!currencyRes.error && currencyRes.result?.fullyqualifiedname) {
            resolvedNames[systemId] = getDisplaySystemName(
              currencyRes.result.fullyqualifiedname,
            );
          }
        } catch (e) {
          // leave unresolved systems empty rather than guessing the wrong chain.
        }
      }

      if (!cancelled && Object.keys(resolvedNames).length > 0) {
        setResolvedSystemNames(prev => ({...prev, ...resolvedNames}));
      }
    };

    resolveSystemNames();

    return () => {
      cancelled = true;
    };
  }, [defaultRootSystemId, resolvedSystemNames, systemIdsToResolve]);

  const allowedSystems = useMemo(() => {
    return new Set(
      requiredSystemIds
        .map(systemId => resolvedSystemNames[systemId])
        .filter(Boolean)
        .map(systemName => systemName.toLowerCase()),
    );
  }, [requiredSystemIds, resolvedSystemNames]);
  const requiredSystemsResolved = useMemo(() => {
    return requiredSystemIds.every(systemId => resolvedSystemNames[systemId]);
  }, [requiredSystemIds, resolvedSystemNames]);
  const signerChainId = resolvedSystemNames[signerSystemID] || signerSystemName;
  const canOpenSignerModal = signerChainId && signerIdentityID;
  const systemLabel = signerChainId || signerSystemID;

  const requiredIds = useMemo(() => {
    return new Set(
      recipientConstraints
        .filter(x => x.type === RecipientConstraint.REQUIRED_ID)
        .map(x => {
          try {
            return toAddressString(x.identity);
          } catch (e) {
            return null;
          }
        })
        .filter(x => x != null),
    );
  }, [recipientConstraints]);

  const requiredParentIds = useMemo(() => {
    return new Set(
      recipientConstraints
        .filter(x => x.type === RecipientConstraint.REQUIRED_PARENT)
        .map(x => {
          try {
            return toAddressString(x.identity);
          } catch (e) {
            return null;
          }
        })
        .filter(x => x != null),
    );
  }, [recipientConstraints]);
  const parentConstraintFriendlyNames = useMemo(() => {
    const names = {};

    if (requiredParentIds.size === 0) {
      return names;
    }

    for (const chainId of Object.keys(linkedIds)) {
      for (const fullyqualifiedname of Object.values(linkedIds[chainId] || {})) {
        if (!fullyqualifiedname) {
          continue;
        }

        try {
          const parentAddress = fqnToParentAddress(fullyqualifiedname, chainId);
          const parentFqn = fqnToParentFqn(fullyqualifiedname);

          if (
            parentAddress &&
            parentFqn &&
            requiredParentIds.has(parentAddress) &&
            names[parentAddress] == null
          ) {
            names[parentAddress] = convertFqnToDisplayFormat(parentFqn);
          }
        } catch (e) {
          // Ignore malformed FQNs and keep the address fallback below.
        }
      }
    }

    return names;
  }, [linkedIds, requiredParentIds]);

  const getKnownChainId = chainName => {
    if (!chainName) return chainName;

    const normalizedChainName = String(chainName).toLowerCase();
    const linkedChainId = Object.keys(linkedIds).find(
      key => key.toLowerCase() === normalizedChainName,
    );

    if (linkedChainId) return linkedChainId;

    const knownCoinId = Object.keys(CoinDirectory.coins || {}).find(
      key => key.toLowerCase() === normalizedChainName,
    );

    return knownCoinId || chainName;
  };

  const linkChainId =
    requiredSystemsResolved && requiredSystemIds.length > 0
      ? getKnownChainId(resolvedSystemNames[requiredSystemIds[0]])
      : defaultRootChainId;

  const isIdentityAllowed = (chainId, iAddr) => {
    if (requiredSystemIds.length > 0 && !requiredSystemsResolved) return false;
    if (requiredIds.size > 0 && !requiredIds.has(iAddr)) return false;
    if (
      allowedSystems.size > 0 &&
      !allowedSystems.has(String(chainId).toLowerCase())
    ) {
      return false;
    }

    if (requiredParentIds.size > 0) {
      if (!linkedIdentityParentsLoaded) return false;

      const identityParent =
        linkedIdentityParentIds[`${chainId}:${iAddr}`] || null;
      if (identityParent == null || !requiredParentIds.has(identityParent)) {
        return false;
      }
    }

    return true;
  };

  const getConstraintAddress = constraint => {
    if (constraint == null || constraint.identity == null) return null;
    return toAddressString(constraint.identity);
  };

  const getConstraintDisplayName = (constraintType, constraintAddress) => {
    if (constraintAddress && constraintFriendlyNames[constraintAddress]) {
      return constraintFriendlyNames[constraintAddress];
    }

    if (
      constraintType === RecipientConstraint.REQUIRED_SYSTEM &&
      constraintAddress
    ) {
      const systemName =
        resolvedSystemNames[constraintAddress] ||
        getOfflineSystemName(constraintAddress);
      if (systemName) return systemName;
      return 'Unknown system';
    }

    if (constraintAddress && constraintAddress.includes('@')) {
      return constraintAddress;
    }

    return constraintAddress || 'Unknown identity';
  };

  const getConstraintRowData = constraint => {
    const constraintAddress = getConstraintAddress(constraint);
    let constraintValue = getConstraintDisplayName(
      constraint.type,
      constraintAddress,
    );

    // Use resolved friendly name if available
    const friendlyName = constraintFriendlyNames[constraintValue];
    if (
      friendlyName &&
      constraint.type !== RecipientConstraint.REQUIRED_SYSTEM
    ) {
      constraintValue = friendlyName;
    }

    switch (constraint.type) {
      case RecipientConstraint.REQUIRED_ID:
        return {label: 'Required identity', value: constraintValue};
      case RecipientConstraint.REQUIRED_SYSTEM: {
        const systemValue = constraintValue.endsWith('@')
          ? constraintValue.substring(0, constraintValue.length - 1)
          : constraintValue;
        return {label: 'Required system', value: systemValue};
      }
      case RecipientConstraint.REQUIRED_PARENT:
        return {label: 'Required parent', value: constraintValue};
      default:
        return {label: 'Constraint', value: constraintValue};
    }
  };

  const getExpiryLabel = () => {
    if (!details || !details.hasExpiryTime()) return null;
    return unixToDate(details.expiryTime.toNumber());
  };

  const getVerusId = async (chain, iAddrOrName) => {
    const identity = await getIdentity(
      CoinDirectory.getBasicCoinObj(chain).system_id,
      iAddrOrName,
    );

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

  const getMainTitle = () => {
    if (responseUris.length > 0) {
      return 'Sign-in request';
    }

    if (passthrough?.fqnToAutoLink) {
      return 'Identity link request';
    }

    return 'Identity request';
  };

  const getAllowList = () => {
    if (requestIsTestnet) {
      return accounts.filter(
        x => x.testnetOverrides && Object.keys(x.testnetOverrides).length > 0,
      );
    }
    return accounts.filter(
      x => !x.testnetOverrides || Object.keys(x.testnetOverrides).length === 0,
    );
  };

  // Build response using selected identity and call next()
  const buildResponseAndContinue = () => {
    const {chainId, iAddress} = selectedIdentity;
    const requestID =
      request && request.requestID ? request.requestID : details.requestID;
    if (!response) {
      throw new Error('Missing generic response');
    }

    const responseDetail = new AuthenticationResponseOrdinalVDXFObject({
      data: new AuthenticationResponseDetails({
        requestID,
      }),
    });

    const baseResponse = new GenericResponse();
    if (response.details && response.details.length > 0) {
      baseResponse.fromBuffer(response.toBuffer(), 0);
    } else {
      Object.assign(baseResponse, response);
      baseResponse.details = [];
    }
    if (baseResponse.details == null) baseResponse.details = [];
    baseResponse.details = [...baseResponse.details, responseDetail];
    baseResponse.setFlags();

    if (baseResponse.signature == null) {
      const coinObj = CoinDirectory.findCoinObj(chainId);
      baseResponse.signature = new VerifiableSignatureData({
        systemID: CompactAddressObject.fromIAddress(coinObj.system_id),
        identityID: CompactAddressObject.fromIAddress(iAddress),
      });
      baseResponse.setSigned();
    }

    const handledIndices = [detailIndex];
    if (
      provisioningDetailIndex != null &&
      !handledIndices.includes(provisioningDetailIndex)
    ) {
      handledIndices.push(provisioningDetailIndex);
    }

    next(baseResponse, handledIndices);
  };

  const handleContinue = () => {
    if (signedIn) {
      if (!selectedIdentity) {
        handleOpenIdentitySheet();
        return;
      }
      buildResponseAndContinue();
      return;
    } else {
      setWaitingForSignin(true);
      const allowList = getAllowList();

      if (allowList.length > 0) {
        const data = {
          [SEND_MODAL_USER_ALLOWLIST]: allowList,
        };

        openAuthenticateUserModal(data);
      } else {
        createAlert(
          'Cannot continue',
          `No ${
            requestIsTestnet ? 'testnet' : 'mainnet'
          } profiles found, cannot respond to authentication request.`,
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
      {
        cancelable: false,
      },
    );
  };

  useEffect(() => {
    // After unlocking via auth modal, return to this screen and wait for
    // explicit user action (tap "Select VerusID") instead of auto-opening
    // the picker sheet.
    if (
      signedIn &&
      waitingForSignin &&
      sendModalType !== AUTHENTICATE_USER_SEND_MODAL
    ) {
      setWaitingForSignin(false);
    }
  }, [signedIn, waitingForSignin, sendModalType]);

  useEffect(() => {
    if (!idProvisionSuccess && sendModal.data?.success) {
      setIdProvisionSuccess(true);
      return;
    }

    if (idProvisionSuccess && !sendModal.visible) {
      props.navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'SignedInStack',
              params: {
                screen: 'Home',
                params: {
                  screen: 'IdentityTab',
                },
              },
            },
          ],
        }),
      );
    }
  }, [
    idProvisionSuccess,
    sendModal.data?.success,
    sendModal.visible,
    props.navigation,
  ]);

  useEffect(() => {
    if (sendModalType != AUTHENTICATE_USER_SEND_MODAL) {
      setLoading(false);
    } else setLoading(true);
  }, [sendModalType]);

  useEffect(() => {
    if (signedIn && request != null) {
      if (
        (isTestAccount && !requestIsTestnet) ||
        (!isTestAccount && requestIsTestnet)
      ) {
        wrongRequestType(requestIsTestnet);
      }
    }
  }, [signedIn, requestIsTestnet, isTestAccount]);

  const expiryLabel = getExpiryLabel();
  const constraints =
    details && details.recipientConstraints ? details.recipientConstraints : [];
  const constraintRows = useMemo(() => {
    const rows = [];

    if (constraints.length > 0) {
      constraints.forEach((constraint, index) => {
        const rowData = getConstraintRowData(constraint);
        rows.push({
          key: `constraint-${index}`,
          ...rowData,
        });
      });
    }

    return rows;
  }, [constraints, constraintFriendlyNames]);

  const technicalRows = useMemo(() => {
    const rows = [];

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
  }, [responseUris, expiryLabel]);

  useEffect(() => {
    if (detailsBufferString) {
      const det = new AuthenticationRequestDetails();
      det.fromBuffer(Buffer.from(detailsBufferString, 'hex'), 0);
      setDetails(det);
    }
  }, [detailsBufferString]);

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
      if (recipientConstraints.length === 0) {
        setConstraintFriendlyNames(prev =>
          Object.keys(prev).length > 0 ? {} : prev,
        );
        return;
      }

      const names = {
        ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
        ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
      };
      const lookupSystemId =
        requiredSystemIds.length === 1
          ? requiredSystemIds[0]
          : signerSystemID || defaultRootSystemId;

      for (const constraint of recipientConstraints) {
        const constraintAddress = getConstraintAddress(constraint);
        if (!constraintAddress) {
          continue;
        }

        if (constraint.type === RecipientConstraint.REQUIRED_SYSTEM) {
          const resolvedSystemName =
            resolvedSystemNames[constraintAddress] ||
            getOfflineSystemName(constraintAddress);

          if (resolvedSystemName) {
            names[constraintAddress] = resolvedSystemName;
          }

          continue;
        }

        if (constraint.type === RecipientConstraint.REQUIRED_PARENT) {
          if (parentConstraintFriendlyNames[constraintAddress]) {
            names[constraintAddress] =
              parentConstraintFriendlyNames[constraintAddress];
          }

          continue;
        }

        try {
          const identity = await getIdentity(lookupSystemId, constraintAddress);
          if (!identity.error && identity.result?.fullyqualifiedname) {
            names[constraintAddress] = convertFqnToDisplayFormat(
              identity.result.fullyqualifiedname,
            );
          }
        } catch (e) {
          // Keep i-address fallback when cross-chain resolution is unavailable.
        }
      }

      if (!cancelled) {
        setConstraintFriendlyNames(names);
      }
    };

    loadConstraintFriendlyNames();

    return () => {
      cancelled = true;
    };
  }, [
    defaultRootSystemId,
    recipientConstraints,
    requiredSystemIds,
    parentConstraintFriendlyNames,
    resolvedSystemNames,
    signerSystemID,
  ]);

  // Load linked identities when encrypted IDs change (user signs in / links ID)
  useEffect(() => {
    const loadLinkedIds = async () => {
      try {
        const verusIdServiceData = await requestServiceStoredData(
          VERUSID_SERVICE_ID,
        );
        if (verusIdServiceData.linked_ids) {
          setLinkedIds(verusIdServiceData.linked_ids);
        } else {
          setLinkedIds({});
        }
      } catch (e) {
        // Silently handle — identities will show as empty
        setLinkedIds({});
      } finally {
        setLinkedIdsLoaded(true);
      }
    };

    if (signedIn) {
      setLinkedIdsLoaded(false);
      loadLinkedIds();
    } else {
      setLinkedIdsLoaded(false);
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

  useEffect(() => {
    let cancelled = false;

    const loadLinkedIdentityParents = async () => {
      const parentMap = {};
      const identities = Object.keys(linkedIds).flatMap(chainId =>
        Object.keys(linkedIds[chainId] || {}).map(iAddress => ({
          chainId,
          iAddress,
          fullyqualifiedname: linkedIds[chainId][iAddress],
        })),
      );

      if (identities.length === 0) {
        if (!cancelled) {
          setLinkedIdentityParentIds({});
          setLinkedIdentityParentsLoaded(true);
        }
        return;
      }

      await Promise.all(
        identities.map(async ({chainId, iAddress, fullyqualifiedname}) => {
          const mapKey = `${chainId}:${iAddress}`;

          try {
            parentMap[mapKey] = fqnToParentAddress(fullyqualifiedname, chainId);
          } catch (e) {
            parentMap[mapKey] = null;
          }
        }),
      );

      if (!cancelled) {
        setLinkedIdentityParentIds(parentMap);
        setLinkedIdentityParentsLoaded(true);
      }
    };

    if (!signedIn) {
      setLinkedIdentityParentIds(prev =>
        Object.keys(prev).length > 0 ? {} : prev,
      );
      setLinkedIdentityParentsLoaded(false);
      return () => {
        cancelled = true;
      };
    }

    if (requiredParentIds.size === 0) {
      setLinkedIdentityParentIds(prev =>
        Object.keys(prev).length > 0 ? {} : prev,
      );
      setLinkedIdentityParentsLoaded(true);
      return () => {
        cancelled = true;
      };
    }

    setLinkedIdentityParentsLoaded(false);
    loadLinkedIdentityParents();

    return () => {
      cancelled = true;
    };
  }, [linkedIds, signedIn, requiredParentIds]);

  useEffect(() => {
    if (passthroughHandled) return;
    if (!signedIn) return;
    if (!(passthrough && passthrough.fqnToAutoLink)) return;
    if (requiredSystemIds.length > 0 && !requiredSystemsResolved) return;

    const noLogin = responseUris.length === 0;
    const data = {
      [SEND_MODAL_IDENTITY_TO_LINK_FIELD]: passthrough.fqnToAutoLink,
      noLogin,
    };

    openLinkIdentityModal(CoinDirectory.findCoinObj(linkChainId), data);
    setPassthroughHandled(true);
  }, [
    passthroughHandled,
    signedIn,
    passthrough,
    responseUris,
    linkChainId,
    requiredSystemIds,
    requiredSystemsResolved,
  ]);

  const openLinkIdentityModalFromChain = () => {
    openLinkIdentityModal(CoinDirectory.findCoinObj(linkChainId));
  };

  const openProvisionIdentityModalFromChain = () => {
    if (!provisioningDetailsBufferString) return;

    try {
      const provisioningDetails = new ProvisionIdentityDetails();
      provisioningDetails.fromBuffer(
        Buffer.from(provisioningDetailsBufferString, 'hex'),
        0,
      );

      const systemId = provisioningDetails.systemID
        ? provisioningDetails.systemID.toAddress()
        : null;
      const provisioningCoinObj = systemId
        ? CoinDirectory.findCoinObj(systemId, null, true)
        : CoinDirectory.findCoinObj(linkChainId);

      const requestId =
        request && request.requestID ? request.requestID.toAddress() : null;
      const requestSignerId =
        signerIdentityID ||
        (request && request.signature
          ? request.signature.identityID.toIAddress()
          : null);
      const requestBufferString = request
        ? request.toBuffer().toString('hex')
        : '';

      openProvisionIdentityModal(provisioningCoinObj, {
        provisioningDetailsBufferString,
        provisioningRequestID: requestId,
        provisioningSignerId: requestSignerId,
        provisioningRequestBufferString: requestBufferString,
        provisioningRequestType: 'generic',
        provisioningRequestHasResponseUris: responseUris.length > 0,
      });
    } catch (e) {
      createAlert('Error', e.message);
    }
  };

  const canProvision = useMemo(() => {
    if (!provisioningDetailsBufferString) return false;

    try {
      const provisioningDetails = new ProvisionIdentityDetails();
      provisioningDetails.fromBuffer(
        Buffer.from(provisioningDetailsBufferString, 'hex'),
        0,
      );

      if (provisioningDetails.identityID) {
        const targetId = provisioningDetails.identityID.toAddress();
        for (const chainId of Object.keys(linkedIds)) {
          if (
            linkedIds[chainId] &&
            Object.keys(linkedIds[chainId]).includes(targetId)
          ) {
            return false;
          }
        }
      }

      return true;
    } catch (e) {
      return false;
    }
  }, [provisioningDetailsBufferString, linkedIds]);

  // Identity sheet handlers
  const handleOpenIdentitySheet = () => {
    if (!eligibilityReady) return;
    setIdentitySheetVisible(true);
  };

  const handleSelectIdentity = (chainId, iAddress, friendlyName) => {
    setSelectedIdentity({chainId, iAddress, friendlyName});
    setIdentitySheetVisible(false);
  };

  const hasRequirements = constraintRows.length > 0;
  const hasTechnicalDetails = technicalRows.length > 0;
  const showIdentityPrompt = signedIn && !selectedIdentity;
  const hasMatchingIdentity = useMemo(() => {
    for (const chainId of Object.keys(sortedIds)) {
      const chainIdentityAddresses = sortedIds[chainId] || [];
      for (const iAddress of chainIdentityAddresses) {
        if (isIdentityAllowed(chainId, iAddress)) {
          return true;
        }
      }
    }

    return false;
  }, [
    sortedIds,
    requiredIds,
    allowedSystems,
    requiredParentIds,
    linkedIdentityParentIds,
    linkedIdentityParentsLoaded,
  ]);
  const eligibilityReady =
    linkedIdsLoaded &&
    (requiredSystemIds.length === 0 || requiredSystemsResolved) &&
    (requiredParentIds.size === 0 || linkedIdentityParentsLoaded);
  const shouldShowRequestNewAsPrimary =
    signedIn &&
    eligibilityReady &&
    !selectedIdentity &&
    canProvision &&
    !hasMatchingIdentity;
  const shouldShowLinkAsPrimary =
    signedIn &&
    eligibilityReady &&
    !selectedIdentity &&
    !canProvision &&
    !hasMatchingIdentity;
  const showRequestAsSecondaryAction =
    canProvision && !shouldShowRequestNewAsPrimary;
  const showSecondaryActionRail = signedIn && !selectedIdentity;
  const primaryActionLabel = signedIn
    ? selectedIdentity
      ? 'Continue'
      : shouldShowRequestNewAsPrimary
      ? 'Request VerusID'
      : shouldShowLinkAsPrimary
      ? 'Link VerusID'
      : 'Select VerusID'
    : 'Sign in';
  const primaryActionHandler = shouldShowRequestNewAsPrimary
    ? openProvisionIdentityModalFromChain
    : shouldShowLinkAsPrimary
    ? openLinkIdentityModalFromChain
    : handleContinue;

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <SafeAreaView style={styles.container}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
        <IdentityPickerSheet
          visible={identitySheetVisible}
          linkedIds={linkedIds}
          sortedIds={sortedIds}
          isIdentityAllowed={isIdentityAllowed}
          selectedIdentity={selectedIdentity}
          onClose={() => setIdentitySheetVisible(false)}
          onSelect={handleSelectIdentity}
        />
      </Portal>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.mainTitle}>{getMainTitle()}</Text>
        </View>

        {(signerFqn || sigDateString || systemLabel) && (
          <TouchableOpacity
            style={styles.requesterCard}
            onPress={
              canOpenSignerModal
                ? () =>
                    openVerusIdDetailsModal(signerChainId, signerIdentityID)
                : undefined
            }
            activeOpacity={canOpenSignerModal ? 0.7 : 1}>
            <View style={styles.requesterHeaderRow}>
              <View style={styles.requesterIconContainer}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={28}
                  color={Colors.verusGreenColor}
                />
              </View>
              <View style={styles.requesterTextContainer}>
                <Text style={styles.requesterLabel}>Request from</Text>
                <Text style={styles.requesterName}>{requesterLabel}</Text>
              </View>
              {canOpenSignerModal && (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={Colors.verusDarkGray}
                />
              )}
            </View>
            <View style={styles.requesterDetailsRow}>
              {systemLabel ? (
                <View style={styles.chipContainer}>
                  <Text style={styles.chipText}>{systemLabel}</Text>
                </View>
              ) : null}
              {sigDateString ? (
                <View style={styles.chipContainer}>
                  <Text style={styles.chipText}>{sigDateString}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        )}

        <Connector />

        <TouchableOpacity
          style={[
            styles.targetCard,
            showIdentityPrompt && styles.targetCardActionNeeded,
            selectedIdentity && styles.targetCardSelected,
          ]}
          onPress={signedIn ? handleOpenIdentitySheet : undefined}
          activeOpacity={signedIn ? 0.7 : 1}
          disabled={!signedIn}>
          <View style={styles.targetRow}>
            <View style={styles.targetIconContainer}>
              <VerusIdAtIcon width={24} height={24} fill="#3165D4" />
            </View>
            <View style={styles.targetInfo}>
              <Text style={styles.targetLabel}>Identity</Text>
              <Text style={styles.targetName}>
                {selectedIdentity
                  ? selectedIdentity.friendlyName
                  : 'Select VerusID'}
              </Text>
              <Text style={styles.targetAddress}>
                {selectedIdentity
                  ? truncateAddress(selectedIdentity.iAddress)
                  : signedIn
                  ? 'Required to continue'
                  : 'Sign in to select identity'}
              </Text>
            </View>
            {signedIn && (
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={Colors.verusDarkGray}
              />
            )}
          </View>
        </TouchableOpacity>

        {hasRequirements && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialCommunityIcons
                  name="shield-account-outline"
                  size={20}
                  color="#666"
                />
                <Text style={styles.sectionTitle}>Request requirements</Text>
              </View>
            </View>
            <View style={styles.sectionContent}>
              {constraintRows.map((row, index) => (
                <View
                  key={row.key}
                  style={[styles.detailRow, index > 0 && styles.detailRowBorder]}>
                  <Text style={styles.requirementLabel}>{row.label}</Text>
                  <Text style={styles.requirementValue} numberOfLines={1}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {hasTechnicalDetails && (
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() =>
                setTechnicalDetailsExpanded(expanded => !expanded)
              }
              activeOpacity={0.7}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={20}
                  color="#666"
                />
                <Text style={styles.sectionTitle}>Technical details</Text>
              </View>
              <MaterialCommunityIcons
                name={
                  technicalDetailsExpanded
                    ? 'chevron-up'
                    : 'chevron-down'
                }
                size={20}
                color="#999"
              />
            </TouchableOpacity>
            {technicalDetailsExpanded && (
              <View style={styles.sectionContent}>
                {technicalRows.map((row, index) => (
                  <View
                    key={row.key}
                    style={[
                      styles.detailRow,
                      index > 0 && styles.detailRowBorder,
                    ]}>
                    <View style={styles.detailLeft}>
                      <Text style={styles.detailTitle}>{row.title}</Text>
                      <Text style={styles.detailSubtitle}>{row.subtitle}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {!hasRequirements && !hasTechnicalDetails && (
          <View style={styles.simpleInfoRow}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color="#6B7280"
            />
            <Text style={styles.simpleInfoText}>
              No additional data will be shared.
            </Text>
          </View>
        )}
        {!signedIn && (
          <View style={styles.simpleInfoRow}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color="#6B7280"
            />
            <Text style={styles.simpleInfoText}>
              Sign in first, then select identity.
            </Text>
          </View>
        )}
        {!signedIn && (
          <View style={{height: 8}} />
        )}
        <View style={{height: 24}} />
      </ScrollView>

      {showSecondaryActionRail && (
        <View style={styles.identityActionLinksRow}>
          <TouchableOpacity
            style={styles.identityActionLinkTouch}
            onPress={openLinkIdentityModalFromChain}
            activeOpacity={0.75}>
            <Text style={styles.identityActionLinkText}>Link VerusID</Text>
          </TouchableOpacity>
          {showRequestAsSecondaryAction && (
            <>
              <Text style={styles.identityActionLinksDivider}>·</Text>
              <TouchableOpacity
                style={styles.identityActionLinkTouch}
                onPress={openProvisionIdentityModalFromChain}
                activeOpacity={0.75}>
                <Text style={styles.identityActionLinkText}>
                  Request VerusID
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

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
            labelStyle={styles.secondaryCtaLabel}>
            Cancel
          </Button>
        </View>
        <View style={styles.ctaCol}>
          <GradientButton onPress={primaryActionHandler} style={styles.primaryCta}>
            {primaryActionLabel}
          </GradientButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AuthenticationRequestInfo;

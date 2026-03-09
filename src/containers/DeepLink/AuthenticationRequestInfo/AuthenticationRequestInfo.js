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
import React, {useEffect, useMemo, useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
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
  GenericResponse,
  ProvisionIdentityDetails,
  VerifiableSignatureData,
} from 'verus-typescript-primitives';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {getSystemNameFromSystemId} from '../../../utils/CoinData/CoinData';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import {convertFqnToDisplayFormat} from '../../../utils/fullyqualifiedname';
import {requestServiceStoredData} from '../../../utils/auth/authBox';
import {VERUSID_SERVICE_ID} from '../../../utils/constants/services';
import {VERUSID_NETWORK_DEFAULT} from '../../../../env/index';
import GradientButton from '../../../components/GradientButton';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import VerusIdAtIcon from '../../../images/customIcons/verusid-at-icon.svg';
import IdentityPickerSheet from './components/IdentityPickerSheet';

const truncateAddress = addr => {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
};

const toAddressString = addressObj => {
  if (addressObj == null) return null;
  if (typeof addressObj === 'string') return addressObj;

  try {
    if (typeof addressObj.toIAddress === 'function') {
      return addressObj.toIAddress();
    }
  } catch (e) {
    // Ignore and try fallback conversion
  }

  try {
    if (typeof addressObj.toAddress === 'function') {
      return addressObj.toAddress();
    }
  } catch (e) {
    // Ignore and try fallback conversion
  }

  if (typeof addressObj.address === 'string') return addressObj.address;
  return null;
};

const EMPTY_RECIPIENT_CONSTRAINTS = [];

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
  const [constraintNamesLoading, setConstraintNamesLoading] = useState(false);
  const [passthroughHandled, setPassthroughHandled] = useState(false);
  const [technicalDetailsExpanded, setTechnicalDetailsExpanded] =
    useState(false);

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
  const testnetOverrides = useObjectSelector(
    state => state.authentication.activeAccount?.testnetOverrides || {},
  );
  const identityNetwork = testnetOverrides[VERUSID_NETWORK_DEFAULT]
    ? testnetOverrides[VERUSID_NETWORK_DEFAULT]
    : VERUSID_NETWORK_DEFAULT;

  const requestIsTestnet = request != null && request.isTestnet();
  const canOpenSignerModal = signerSystemName && signerIdentityID;
  const defaultConstraintChain = requestIsTestnet ? 'VRSCTEST' : 'VRSC';
  const constraintChain = signerSystemName || defaultConstraintChain;
  const requesterLabel = signerFqn || 'An app';
  const systemLabel =
    signerSystemName ||
    getSystemNameFromSystemId(signerSystemID) ||
    signerSystemID;

  // Identity constraint filtering (mirrored from AuthenticationRequestIdentity)
  const recipientConstraints =
    details && details.recipientConstraints
      ? details.recipientConstraints
      : EMPTY_RECIPIENT_CONSTRAINTS;
  const responseUris = useMemo(() => {
    if (request && request.responseURIs && request.responseURIs.length > 0) {
      return request.responseURIs;
    }

    if (details && details.responseURIs && details.responseURIs.length > 0) {
      return details.responseURIs;
    }

    return [];
  }, [request, details]);

  const allowedSystems = useMemo(() => {
    const systems = recipientConstraints
      .filter(x => x.type === RecipientConstraint.REQUIRED_SYSTEM)
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
        .filter(x => x.type === RecipientConstraint.REQUIRED_ID)
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

  const requiredParentIds = useMemo(() => {
    return new Set(
      recipientConstraints
        .filter(x => x.type === RecipientConstraint.REQUIRED_PARENT)
        .map(x => toAddressString(x.identity))
        .filter(x => x != null),
    );
  }, [recipientConstraints]);

  const linkChainId =
    allowedSystems.size > 0
      ? Array.from(allowedSystems)[0]
      : requestIsTestnet
      ? 'VRSCTEST'
      : identityNetwork;

  const isIdentityAllowed = (chainId, iAddr) => {
    if (requiredIds.size > 0 && !requiredIds.has(iAddr)) return false;
    if (allowedSystems.size > 0 && !allowedSystems.has(chainId)) return false;

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
      const systemName = getSystemNameFromSystemId(constraintAddress);
      if (systemName) return systemName;
      return 'Unknown system';
    }

    if (constraintAddress && constraintAddress.includes('@')) {
      return constraintAddress;
    }

    return 'Unknown identity';
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

    const responseDetail = new AuthenticationResponseOrdinalVDXFObject({
      data: new AuthenticationResponseDetails({
        requestID,
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

  // Resolve friendly names for constraint i-addresses
  useEffect(() => {
    const resolveConstraintNames = async () => {
      const constraintsToResolve = recipientConstraints.filter(
        c =>
          c.type === RecipientConstraint.REQUIRED_PARENT ||
          c.type === RecipientConstraint.REQUIRED_ID,
      );

      if (constraintsToResolve.length === 0) return;

      const names = {};
      const systemId =
        signerSystemID ||
        (requestIsTestnet
          ? 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'
          : 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV');

      for (const constraint of constraintsToResolve) {
        try {
          const iAddr = constraint.identity.toIAddress();
          const result = await getIdentity(systemId, iAddr);
          if (
            !result.error &&
            result.result &&
            result.result.fullyqualifiedname
          ) {
            names[iAddr] = result.result.fullyqualifiedname;
          }
        } catch (e) {
          // Keep i-address as fallback
        }
      }

      if (Object.keys(names).length > 0) {
        setConstraintFriendlyNames(prev => ({...prev, ...names}));
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
      const recipientConstraints =
        details && details.recipientConstraints
          ? details.recipientConstraints
          : [];

      if (recipientConstraints.length === 0) {
        setConstraintFriendlyNames(prev =>
          Object.keys(prev).length > 0 ? {} : prev,
        );
        setConstraintNamesLoading(false);
        return;
      }

      setConstraintNamesLoading(true);

      const constraintAddresses = Array.from(
        new Set(
          recipientConstraints
            .map(getConstraintAddress)
            .filter(addr => addr != null),
        ),
      );

      if (constraintAddresses.length === 0) {
        setConstraintFriendlyNames(prev =>
          Object.keys(prev).length > 0 ? {} : prev,
        );
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
          const signerIdentity = await getIdentity(
            coinObj.system_id,
            signerIdentityID,
          );
          if (!signerIdentity.error && signerIdentity.result) {
            names = await getFriendlyNameMap(
              coinObj.system_id,
              signerIdentity.result,
              [...constraintAddresses],
            );
          } else {
            for (const addr of constraintAddresses) {
              const identity = await getIdentity(coinObj.system_id, addr);
              if (
                !identity.error &&
                identity.result &&
                identity.result.fullyqualifiedname
              ) {
                names[addr] = convertFqnToDisplayFormat(
                  identity.result.fullyqualifiedname,
                );
              }
            }
          }
        } else {
          for (const addr of constraintAddresses) {
            const identity = await getIdentity(coinObj.system_id, addr);
            if (
              !identity.error &&
              identity.result &&
              identity.result.fullyqualifiedname
            ) {
              names[addr] = convertFqnToDisplayFormat(
                identity.result.fullyqualifiedname,
              );
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
      const identities = [];

      for (const chainId of Object.keys(linkedIds)) {
        const chainIds = Object.keys(linkedIds[chainId] || {});
        chainIds.forEach(iAddress => identities.push({chainId, iAddress}));
      }

      if (identities.length === 0) {
        if (!cancelled) {
          setLinkedIdentityParentIds({});
          setLinkedIdentityParentsLoaded(true);
        }
        return;
      }

      await Promise.all(
        identities.map(async ({chainId, iAddress}) => {
          const mapKey = `${chainId}:${iAddress}`;

          try {
            const coinObj = CoinDirectory.getBasicCoinObj(chainId);
            const identity = await getIdentity(coinObj.system_id, iAddress);
            const parentId = identity?.error
              ? null
              : toAddressString(identity?.result?.identity?.parent);
            parentMap[mapKey] = parentId;
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

    const noLogin = responseUris.length === 0;
    const data = {
      [SEND_MODAL_IDENTITY_TO_LINK_FIELD]: passthrough.fqnToAutoLink,
      noLogin,
    };

    openLinkIdentityModal(CoinDirectory.findCoinObj(linkChainId), data);
    setPassthroughHandled(true);
  }, [passthroughHandled, signedIn, passthrough, responseUris, linkChainId]);

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
                    openVerusIdDetailsModal(signerSystemName, signerIdentityID)
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
  targetCardActionNeeded: {
    borderColor: Colors.primaryColor,
    backgroundColor: '#F5FAFF',
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
    paddingVertical: 12,
    minHeight: 48,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1A1A1A',
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
  requirementLabel: {
    flex: 1,
    marginRight: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  requirementValue: {
    flexShrink: 1,
    maxWidth: '55%',
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'right',
  },
  simpleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginBottom: 8,
  },
  simpleInfoText: {
    fontSize: 13,
    color: '#6B7280',
  },
  identityActionLinksRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 6,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  identityActionLinkTouch: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  identityActionLinkText: {
    fontSize: 14,
    color: '#5F6B7A',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  identityActionLinksDivider: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  footer: {
    backgroundColor: 'white',
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
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

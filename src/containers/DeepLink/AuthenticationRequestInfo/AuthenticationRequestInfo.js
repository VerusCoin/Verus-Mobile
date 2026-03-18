import React, { useEffect, useState } from 'react';
import { Dimensions, SafeAreaView, ScrollView, TouchableOpacity, View } from 'react-native';
import { Button, Divider, List, Portal, Text } from 'react-native-paper';
import { useSelector } from 'react-redux';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import Colors from '../../../globals/colors';
import Styles from '../../../styles/index';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL, SEND_MODAL_USER_ALLOWLIST } from '../../../utils/constants/sendModal';
import { createAlert, resolveAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { unixToDate } from '../../../utils/math';
import { AuthenticationRequestDetails, RecipientConstraint } from 'verus-typescript-primitives';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { getFriendlyNameMap, getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { SMALL_DEVICE_HEGHT } from '../../../utils/constants/constants';
import { VerusIdLogo } from '../../../images/customIcons';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import { convertFqnToDisplayFormat } from '../../../utils/fullyqualifiedname';

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

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const passthrough = useSelector(state => state.deeplink.passthrough);
  const sendModalType = useSelector(state => state.sendModal.type);
  const { height } = Dimensions.get('window');

  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const isTestAccount = activeAccount && Object.keys(activeAccount.testnetOverrides).length > 0;

  const requestIsTestnet = request != null && request.isTestnet();
  const canOpenSignerModal = signerSystemName && signerIdentityID;
  const defaultConstraintChain = requestIsTestnet ? 'VRSCTEST' : 'VRSC';
  const constraintChain = signerSystemName || defaultConstraintChain;

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

    switch (constraint.type) {
      case RecipientConstraint.REQUIRED_ID:
        return `Required identity: ${constraintLabel}`;
      case RecipientConstraint.REQUIRED_SYSTEM:
        return `Required system: ${constraintLabel.substring(0, constraintLabel.length - 1)}`;
      case RecipientConstraint.REQUIRED_PARENT:
        return `Required parent: ${constraintLabel}`;
      default:
        return `Constraint: ${constraintLabel}`;
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
    const hasResponseUris = request && request.responseURIs && request.responseURIs.length > 0;

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
  const responseUris = request && request.responseURIs ? request.responseURIs : [];

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

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <SafeAreaView style={Styles.defaultRoot}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
      </Portal>
      <View style={{ flex: 1, width: '100%' }}>
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={Styles.focalCenter}>
          {height >= SMALL_DEVICE_HEGHT && <VerusIdLogo width={'55%'} height={'10%'} />}
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
            {expiryLabel != null && (
              <React.Fragment>
                <List.Item title={expiryLabel} description={'Expires at'} />
                <Divider />
              </React.Fragment>
            )}
          </View>
        </ScrollView>
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: '#fff'
          }}>
          <Button
            textColor={Colors.warningButtonColor}
            style={{ width: 148 }}
            onPress={() => cancel()}>
            Cancel
          </Button>
          <Button
            buttonColor={Colors.verusGreenColor}
            textColor={Colors.secondaryColor}
            style={{ width: 148 }}
            onPress={() => handleContinue()}>
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AuthenticationRequestInfo;

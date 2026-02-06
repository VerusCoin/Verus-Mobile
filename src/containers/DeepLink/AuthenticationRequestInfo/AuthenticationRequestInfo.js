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
import { AuthenticationRequestDetails } from 'verus-typescript-primitives';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { getFriendlyNameMap, getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { SMALL_DEVICE_HEGHT } from '../../../utils/constants/constants';
import { VerusIdLogo } from '../../../images/customIcons';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';

const AuthenticationRequestInfo = props => {
  const {
    detailsBufferString,
    sigtime,
    signerFqn,
    signerSystemID,
    signerSystemName,
    signerIdentityID,
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

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const sendModalType = useSelector(state => state.sendModal.type);
  const { height } = Dimensions.get('window');

  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const isTestAccount = activeAccount && Object.keys(activeAccount.testnetOverrides).length > 0;

  const requestIsTestnet = request != null && request.isTestnet();
  const canOpenSignerModal = signerSystemName && signerIdentityID;

  const getConstraintLabel = (constraint) => {
    let identityLabel = constraint.identity.address;
    let constraintLabel = identityLabel;

    try {
      constraintLabel = constraint.identity.toIAddress();
    } catch (e) {
      constraintLabel = identityLabel;
    }

    if (constraint.type === AuthenticationRequestDetails.REQUIRED_SYSTEM) {
      const systemName = getSystemNameFromSystemId(constraintLabel);
      if (systemName) constraintLabel = systemName;
    }

    switch (constraint.type) {
      case AuthenticationRequestDetails.REQUIRED_ID:
        return `Required identity: ${constraintLabel}`;
      case AuthenticationRequestDetails.REQUIRED_SYSTEM:
        return `Required system: ${constraintLabel}`;
      case AuthenticationRequestDetails.REQUIRED_PARENT:
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
    return `${requesterLabel} is requesting login with VerusID`;
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
        next
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
  const responseUris = details && details.responseURIs ? details.responseURIs : [];

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
          <Text style={{ fontSize: 18, textAlign: 'center', paddingBottom: 12 }}>
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
            {constraints.length > 0 && (
              <React.Fragment>
                <List.Subheader>Recipient constraints</List.Subheader>
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

import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { Divider, List } from 'react-native-paper';
import { CommonActions } from '@react-navigation/native';
import { AuthenticationRequestDetails, AuthenticationResponseDetails, AuthenticationResponseOrdinalVDXFObject, CompactAddressObject, GenericRequest, GenericResponse, ProvisionIdentityDetails, VerifiableSignatureData } from 'verus-typescript-primitives';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { openLinkIdentityModal, openProvisionIdentityModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { requestServiceStoredData } from '../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../utils/constants/services';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { VERUSID_NETWORK_DEFAULT } from '../../../../env/index';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import { SEND_MODAL_IDENTITY_TO_LINK_FIELD } from '../../../utils/constants/sendModal';
import Styles from '../../../styles/index';

const AuthenticationRequestIdentity = props => {
  const {
    requestBufferString,
    responseBufferString,
    detailsBufferString,
    detailIndex,
    provisioningDetailsBufferString,
    provisioningDetailIndex,
    signerIdentityID,
    next,
  } = props.route.params;

  const [loading, setLoading] = useState(false);
  const [linkedIds, setLinkedIds] = useState({});
  const [sortedIds, setSortedIds] = useState({});
  const [details, setDetails] = useState(new AuthenticationRequestDetails());
  const [provisioningDetails, setProvisioningDetails] = useState(null);
  const [idProvisionSuccess, setIdProvisionSuccess] = useState(false);
  const [passthroughHandled, setPassthroughHandled] = useState(false);
  const encryptedIds = useObjectSelector(state => state.services.stored[VERUSID_SERVICE_ID]);
  const sendModal = useObjectSelector(state => state.sendModal);
  const passthrough = useObjectSelector(state => state.deeplink.passthrough);
  const testnetOverrides = useObjectSelector(state => state.authentication.activeAccount.testnetOverrides);
  const identityNetwork = testnetOverrides[VERUSID_NETWORK_DEFAULT]
    ? testnetOverrides[VERUSID_NETWORK_DEFAULT]
    : VERUSID_NETWORK_DEFAULT;

  const recipientConstraints = details && details.recipientConstraints ? details.recipientConstraints : [];

  const getAllowedSystems = () => {
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
  };

  const getRequiredIds = () => {
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
        .filter(x => x != null)
    );
  };

  const allowedSystems = getAllowedSystems();
  const requiredIds = getRequiredIds();

  const request = useMemo(() => {
    const req = new GenericRequest();
    req.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);
    return req;
  }, [requestBufferString]);

  const requestIsTestnet = request.isTestnet();
  const linkChainId = allowedSystems.size > 0
    ? Array.from(allowedSystems)[0]
    : (requestIsTestnet ? 'VRSCTEST' : identityNetwork);

  const baseResponse = useMemo(() => {
    const res = new GenericResponse();

    if (responseBufferString && responseBufferString.length > 0) {
      res.fromBuffer(Buffer.from(responseBufferString, 'hex'), 0);
    }

    return res;
  }, [responseBufferString]);

  async function onEncryptedIdsUpdate() {
    setLoading(true);

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
      createAlert('Error Loading Linked VerusIDs', e.message);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (detailsBufferString) {
      const det = new AuthenticationRequestDetails();
      det.fromBuffer(Buffer.from(detailsBufferString, 'hex'), 0);
      setDetails(det);
    }
  }, [detailsBufferString]);

  useEffect(() => {
    if (provisioningDetailsBufferString) {
      const det = new ProvisionIdentityDetails();
      det.fromBuffer(Buffer.from(provisioningDetailsBufferString, 'hex'), 0);
      setProvisioningDetails(det);
    }
  }, [provisioningDetailsBufferString]);

  useEffect(() => {
    onEncryptedIdsUpdate();
  }, [encryptedIds]);

  useEffect(() => {
    if (!idProvisionSuccess && sendModal.data?.success){
      setIdProvisionSuccess(true);
    }

    if (idProvisionSuccess && !sendModal.visible) {
      props.navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'SignedInStack'}],
        }),
      );
    }
  }, [sendModal]);

  useEffect(() => {
    if (passthroughHandled) return;
    if (!(passthrough && passthrough.fqnToAutoLink)) return;
    if (!request) return;

    const noLogin = !request.responseURIs || request.responseURIs.length === 0;
    const data = {
      [SEND_MODAL_IDENTITY_TO_LINK_FIELD]: passthrough.fqnToAutoLink,
      noLogin,
    };

    openLinkIdentityModal(CoinDirectory.findCoinObj(linkChainId), data);
    setPassthroughHandled(true);
  }, [passthrough, request, linkChainId, passthroughHandled]);

  useEffect(() => {
    const sortedIdKeysPerChain = {};

    for (const chainId of Object.keys(linkedIds)) {
      sortedIdKeysPerChain[chainId] = linkedIds[chainId]
        ? Object.keys(linkedIds[chainId]).sort(function (x, y) {
            if (linkedIds[chainId][x] < linkedIds[chainId][y]) {
              return -1;
            }
            if (linkedIds[chainId][x] > linkedIds[chainId][y]) {
              return 1;
            }
            return 0;
          })
        : [];
    }

    setSortedIds(sortedIdKeysPerChain);
  }, [linkedIds]);

  const isIdentityAllowed = (chainId, iAddr) => {
    if (requiredIds.size > 0 && !requiredIds.has(iAddr)) {
      return false;
    }

    if (allowedSystems.size > 0 && !allowedSystems.has(chainId)) {
      return false;
    }

    return true;
  };

  const selectIdentity = (chainId, iAddress) => {
    const responseDetail = new AuthenticationResponseOrdinalVDXFObject({
      data: new AuthenticationResponseDetails({
        requestID: request.requestID
      })
    });

    const updatedResponse = baseResponse;
    if (updatedResponse.details == null) updatedResponse.details = [];
    updatedResponse.details = [...updatedResponse.details, responseDetail];

    if (updatedResponse.signature == null) {
      const coinObj = CoinDirectory.findCoinObj(chainId);
      updatedResponse.signature = new VerifiableSignatureData({
        systemID: CompactAddressObject.fromIAddress(coinObj.system_id),
        identityID: CompactAddressObject.fromIAddress(iAddress)
      });

      updatedResponse.setSigned();
    }

    const handledIndices = [detailIndex];
    if (provisioningDetailIndex != null) handledIndices.push(provisioningDetailIndex);
    next(updatedResponse, handledIndices);
  };

  const openLinkIdentityModalFromChain = () => {
    return openLinkIdentityModal(CoinDirectory.findCoinObj(linkChainId));
  };

  const openProvisionIdentityModalFromChain = () => {
    if (!provisioningDetailsBufferString || provisioningDetails == null) return;

    const systemId = provisioningDetails.systemID ? provisioningDetails.systemID.toAddress() : null;
    const provisioningCoinObj = systemId
      ? CoinDirectory.findCoinObj(systemId, null, true)
      : CoinDirectory.findCoinObj(linkChainId);

    const requestId = request.hasRequestID ? request.requestID.toAddress() : null;
    const requestSignerId = signerIdentityID || (request.signature ? request.signature.identityID.toIAddress() : null);

    openProvisionIdentityModal(provisioningCoinObj, {
      provisioningDetailsBufferString,
      provisioningRequestID: requestId,
      provisioningSignerId: requestSignerId,
      provisioningRequestBufferString: requestBufferString,
      provisioningRequestType: 'generic',
      provisioningRequestHasResponseUris: request.responseURIs != null && request.responseURIs.length > 0,
    });
  };

  if (loading) {
    return <AnimatedActivityIndicatorBox />;
  }

  const hasIdentities = Object.keys(sortedIds).some(chainId => {
    return sortedIds[chainId].some(iAddr => isIdentityAllowed(chainId, iAddr));
  });

  const canProvision = (() => {
    if (!provisioningDetails) return false;

    if (provisioningDetails.identityID) {
      const targetId = provisioningDetails.identityID.toAddress();
      for (const chainId of Object.keys(linkedIds)) {
        if (linkedIds[chainId] && Object.keys(linkedIds[chainId]).includes(targetId)) {
          return false;
        }
      }
    }

    return true;
  })();

  return (
    <ScrollView style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}>
      {!hasIdentities && (
        <List.Subheader>No matching identities found</List.Subheader>
      )}
      {Object.keys(sortedIds).map(chainId => {
        const filteredIds = sortedIds[chainId].filter(iAddr => isIdentityAllowed(chainId, iAddr));

        if (filteredIds.length === 0) return null;

        return (
          <React.Fragment key={chainId}>
            <List.Subheader>{`Linked ${chainId} VerusIDs`}</List.Subheader>
            {filteredIds.map(iAddr => {
              return (
                <React.Fragment key={iAddr}>
                  <Divider />
                  <List.Item
                    title={linkedIds[chainId][iAddr]}
                    description={iAddr}
                    descriptionNumberOfLines={1}
                    titleNumberOfLines={1}
                    left={props => <List.Icon {...props} icon={'account'} />}
                    right={props => (
                      <List.Icon {...props} icon={'chevron-right'} size={20} />
                    )}
                    onPress={() => selectIdentity(chainId, iAddr)}
                  />
                </React.Fragment>
              );
            })}
            <Divider />
          </React.Fragment>
        );
      })}
      <Divider />
      <List.Subheader>{`Options`}</List.Subheader>
      <Divider />
      <List.Item
        title={'Link VerusID'}
        right={props => <List.Icon {...props} icon={'plus'} size={20} />}
        onPress={() => openLinkIdentityModalFromChain()}
      />
      <Divider />
      {canProvision && (
        <React.Fragment>
          <List.Item
            title={'Request new VerusID'}
            right={props => (
              <List.Icon {...props} icon={'plus'} size={20} />
            )}
            onPress={() => openProvisionIdentityModalFromChain()}
          />
          <Divider />
        </React.Fragment>
      )}
    </ScrollView>
  );
};

export default AuthenticationRequestIdentity;

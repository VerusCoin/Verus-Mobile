import React, { useEffect, useMemo, useState } from 'react';
import { View, SafeAreaView, Text } from 'react-native';
import Styles from '../../../styles/index';
import { CompactAddressObject, GenericRequest, GenericResponse, IdentityUpdateRequestDetails, IdentityUpdateResponseDetails, IdentityUpdateResponseOrdinalVDXFObject, VerifiableSignatureData } from 'verus-typescript-primitives';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import FundSourceSelectList from '../../FundSourceSelect/FundSourceSelectList';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { coinsList } from '../../../utils/CoinData/CoinsList';
import { openUpdateIdentitySendModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { 
  SEND_MODAL_IDENTITY_UPDATE_CHAIN_INFO, 
  SEND_MODAL_IDENTITY_UPDATE_CMM_DATA_KEYS, 
  SEND_MODAL_IDENTITY_UPDATE_COMPLETE, 
  SEND_MODAL_IDENTITY_UPDATE_DETAILS_HEX,
  SEND_MODAL_IDENTITY_UPDATE_IS_TESTNET,
  SEND_MODAL_IDENTITY_UPDATE_FRIENDLY_NAMES, 
  SEND_MODAL_IDENTITY_UPDATE_ID_BLOCKHEIGHT, 
  SEND_MODAL_IDENTITY_UPDATE_ID_RAW_TX_HEX, 
  SEND_MODAL_IDENTITY_UPDATE_TXID,
  SEND_MODAL_IDENTITY_UPDATE_SUBJECT_ID, 
  SEND_MODAL_IDENTITY_UPDATE_TX_HEX, 
  SEND_MODAL_IDENTITY_UPDATE_UPDATES
} from '../../../utils/constants/sendModal';
import { usePrevious } from '../../../hooks/usePrevious';

const IdentityUpdatePaymentConfiguration = props => {
  const {
    detailsBufferString,
    requestBufferString,
    responseBufferString,
    detailIndex,
    next,
    chainInfo,
    subjectIdentity,
    displayUpdates,
    friendlyNames,
    cmmDataKeys,
    subjectIdTxHex,
    updateIdTxHex,
    coinObj,
    cancel
  } = props.route.params;

  const [details, setDetails] = useState(new IdentityUpdateRequestDetails());

  const [loading, setLoading] = useState(false);

  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);
  const allSubWallets = useObjectSelector(state => state.coinMenus.allSubWallets);
  const sendModal = useObjectSelector(state => state.sendModal);

  const prevSendModal = usePrevious(sendModal);

  const baseResponse = React.useMemo(() => {
    const res = new GenericResponse();

    if (responseBufferString && responseBufferString.length > 0) {
      res.fromBuffer(Buffer.from(responseBufferString, 'hex'), 0);
    }

    return res;
  }, [responseBufferString]);

  const requestIsTestnet = useMemo(() => {
    if (!requestBufferString) return false;
    const req = new GenericRequest();
    req.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);
    return req.isTestnet();
  }, [requestBufferString]);

  const signerIdentityAddress = subjectIdentity.identity
    ? subjectIdentity.identity.identityaddress
    : subjectIdentity.identityaddress;

  const onSelectFundSource = (source) => {
    openUpdateIdentitySendModal(source.option.coinObj, source.option.wallet, {
      [SEND_MODAL_IDENTITY_UPDATE_DETAILS_HEX]: details.toBuffer().toString('hex'),
      [SEND_MODAL_IDENTITY_UPDATE_IS_TESTNET]: requestIsTestnet,
      [SEND_MODAL_IDENTITY_UPDATE_ID_RAW_TX_HEX]: subjectIdTxHex,
      [SEND_MODAL_IDENTITY_UPDATE_ID_BLOCKHEIGHT]: subjectIdentity.blockheight,
      [SEND_MODAL_IDENTITY_UPDATE_SUBJECT_ID]: subjectIdentity,
      [SEND_MODAL_IDENTITY_UPDATE_FRIENDLY_NAMES]: friendlyNames,
      [SEND_MODAL_IDENTITY_UPDATE_UPDATES]: displayUpdates,
      [SEND_MODAL_IDENTITY_UPDATE_CHAIN_INFO]: chainInfo,
      [SEND_MODAL_IDENTITY_UPDATE_CMM_DATA_KEYS]: cmmDataKeys,
      [SEND_MODAL_IDENTITY_UPDATE_TX_HEX]: updateIdTxHex
    })
  }

  useEffect(() => {
    if (detailsBufferString) {
      const det = new IdentityUpdateRequestDetails();
      det.fromBuffer(Buffer.from(detailsBufferString, 'hex'), 0);
      setDetails(det);
    }
  }, [detailsBufferString]);

  useEffect(() => {
    if (
      sendModal &&
      prevSendModal &&
      sendModal.type == null &&
      prevSendModal.type != null &&
      prevSendModal.data[SEND_MODAL_IDENTITY_UPDATE_COMPLETE]
    ) {
      if (next) {
        const txid = prevSendModal.data[SEND_MODAL_IDENTITY_UPDATE_TXID];
        const responseDetail = new IdentityUpdateResponseOrdinalVDXFObject({
          data: new IdentityUpdateResponseDetails({
            requestID: details.containsRequestID() ? details.requestID : undefined,
            txid: txid ? Buffer.from(txid, 'hex').reverse() : undefined
          })
        });

        const updatedResponse = baseResponse;
        if (updatedResponse.details == null) updatedResponse.details = [];
        updatedResponse.details = [...updatedResponse.details, responseDetail];

        if (updatedResponse.signature == null) {
          updatedResponse.signature = new VerifiableSignatureData({
            systemID: CompactAddressObject.fromIAddress(coinObj.system_id),
            identityID: CompactAddressObject.fromIAddress(signerIdentityAddress)
          });

          updatedResponse.setSigned();
        }

        next(updatedResponse, [detailIndex]);
      } else {
        cancel();
      }
    }
  }, [sendModal, prevSendModal, baseResponse, details, coinObj, detailIndex, next, cancel, signerIdentityAddress]);

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <SafeAreaView style={Styles.defaultRoot}>
      <View style={{ flex: 1, width: '100%' }}>
        <View
          style={Styles.fullWidthBlock}>
          <Text style={{ fontSize: 18, textAlign: 'center' }}>{"Select a source of funds to calculate and pay fees from"}</Text>
        </View>
        <FundSourceSelectList
          animationType="slide"
          onSelect={onSelectFundSource}
          sourceOptions={{}}
          allSubWallets={allSubWallets}
          coinObjs={activeCoinsForUser}
          testnet={requestIsTestnet}
          requestedCurrency={
            details.containsSystem() ?
              details.systemID.toAddress() :
              requestIsTestnet ?
                coinsList.VRSCTEST.currency_id :
                coinsList.VRSC.currency_id
          }
          allowAnyAmount={true}
        />
      </View>
    </SafeAreaView>
  );
};

export default IdentityUpdatePaymentConfiguration;

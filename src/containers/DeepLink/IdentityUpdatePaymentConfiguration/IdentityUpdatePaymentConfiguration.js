import React, { useEffect, useState } from 'react';
import { View, SafeAreaView, Text } from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client";
import { useDispatch } from 'react-redux';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import FundSourceSelectList from '../../FundSourceSelect/FundSourceSelectList';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { coinsList } from '../../../utils/CoinData/CoinsList';
import { openUpdateIdentitySendModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { 
  SEND_MODAL_IDENTITY_UPDATE_CHAIN_INFO, 
  SEND_MODAL_IDENTITY_UPDATE_CMM_DATA_KEYS, 
  SEND_MODAL_IDENTITY_UPDATE_COMPLETE, 
  SEND_MODAL_IDENTITY_UPDATE_FRIENDLY_NAMES, 
  SEND_MODAL_IDENTITY_UPDATE_ID_BLOCKHEIGHT, 
  SEND_MODAL_IDENTITY_UPDATE_ID_RAW_TX_HEX, 
  SEND_MODAL_IDENTITY_UPDATE_REQUEST_HEX, 
  SEND_MODAL_IDENTITY_UPDATE_SUBJECT_ID, 
  SEND_MODAL_IDENTITY_UPDATE_TX_HEX, 
  SEND_MODAL_IDENTITY_UPDATE_UPDATES
} from '../../../utils/constants/sendModal';
import { usePrevious } from '../../../hooks/usePrevious';

const IdentityUpdatePaymentConfiguration = props => {
  const {
    deeplinkData,
    chainInfo,
    subjectIdentity,
    displayUpdates,
    friendlyNames,
    cmmDataKeys,
    subjectIdTxHex,
    updateIdTxHex,
    cancel
  } = props.route.params;

  const [req, setReq] = useState(primitives.IdentityUpdateRequest.fromJson(deeplinkData));

  const [loading, setLoading] = useState(false);

  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);
  const allSubWallets = useObjectSelector(state => state.coinMenus.allSubWallets);
  const sendModal = useObjectSelector(state => state.sendModal);

  const prevSendModal = usePrevious(sendModal);

  const onSelectFundSource = (source) => {
    openUpdateIdentitySendModal(source.option.coinObj, source.option.wallet, {
      [SEND_MODAL_IDENTITY_UPDATE_REQUEST_HEX]: req.toBuffer().toString('hex'),
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
    if (
      sendModal &&
      prevSendModal &&
      sendModal.type == null &&
      prevSendModal.type != null &&
      prevSendModal.data[SEND_MODAL_IDENTITY_UPDATE_COMPLETE]
    ) {
      cancel();
    }
  }, [sendModal]);

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
          testnet={req.details.isTestnet()}
          requestedCurrency={
            req.details.containsSystem() ?
              req.details.systemid.toAddress() :
              req.details.isTestnet() ?
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

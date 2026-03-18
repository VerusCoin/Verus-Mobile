import React, {useState, useEffect} from 'react';
import { View, SafeAreaView, Alert } from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client";
import { useDispatch } from 'react-redux';
import { openConvertOrCrossChainSendModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import BigNumber from 'bignumber.js';
import {
  SEND_MODAL_ADVANCED_FORM,
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_CONTINUE_IMMEDIATELY,
  SEND_MODAL_CONVERTTO_FIELD,
  SEND_MODAL_DISABLED_INPUTS,
  SEND_MODAL_EXPORTTO_FIELD,
  SEND_MODAL_SEND_COMPLETED,
  SEND_MODAL_MEMO_FIELD,
  SEND_MODAL_SHOW_CONVERTTO_FIELD,
  SEND_MODAL_SHOW_EXPORTTO_FIELD,
  SEND_MODAL_SHOW_IS_PRECONVERT,
  SEND_MODAL_SHOW_VIA_FIELD,
  SEND_MODAL_STRICT_AMOUNT,
  SEND_MODAL_TO_ADDRESS_FIELD,
  SEND_MODAL_VIA_FIELD,
  SEND_MODAL_MAPPING_FIELD,
  SEND_MODAL_VDXF_TAG,
} from '../../../utils/constants/sendModal';
import { API_GET_BALANCES, IS_PBAAS } from '../../../utils/constants/intervalConstants';
import { getInvoiceSourceOptions } from '../../../utils/api/channels/vrpc/callCreators';
import { satsToCoins } from '../../../utils/math';
import FundSourceSelectList from '../../FundSourceSelect/FundSourceSelectList';
import { usePrevious } from '../../../hooks/usePrevious';
import { conditionallyUpdateWallet } from '../../../actions/actionDispatchers';
import store from '../../../store';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { NavigationActions } from '@react-navigation/compat';

const InvoicePaymentConfiguration = props => {
  const {
    detailsBufferString,
    invoiceVersion,
    cancel,
    currencyDefinition,
    acceptedSystemsDefinitions,
    next,
    response,
    detailIndex
  } = props.route.params;

  const [conversionOptions, setConversionOptions] = useState({});

  const [loading, setLoading] = useState(false);

  const details = new primitives.VerusPayInvoiceDetails();
  details.fromBuffer(Buffer.from(detailsBufferString, 'hex'), 0, new primitives.BigNumber(invoiceVersion));

  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);
  
  const sendModal = useObjectSelector(state => state.sendModal);
  const prevSendModal = usePrevious(sendModal);
  
  const allSubWallets = useObjectSelector(state => state.coinMenus.allSubWallets)

  const dispatch = useDispatch()

  const updateConversionOptions = async () => {
    try {
      const { definitions, remainingSystems } = acceptedSystemsDefinitions;
      const supportedSystemIds = [...Object.keys(definitions), ...remainingSystems];
      const maxSlippage = satsToCoins(BigNumber(details.maxestimatedslippage)).toNumber();
  
      const sourceOptionsMap = await getInvoiceSourceOptions(
        details.requestedcurrencyid,
        satsToCoins(BigNumber(details.amount)).toNumber(),
        supportedSystemIds,
        activeCoinsForUser.filter(x => x.tags.includes(IS_PBAAS)).map(x => x.currency_id),
        maxSlippage
      );
      
      setConversionOptions(Object.fromEntries(sourceOptionsMap.entries()))
    } catch(e) {
      Alert.alert("Error fetching conversion options", e.message);
    }
  };

  useEffect(() => {
    for (const coin of activeCoinsForUser) {
      if (coin.tags.includes(IS_PBAAS)) {
        conditionallyUpdateWallet(store.getState(), dispatch, coin.id, API_GET_BALANCES)
      }
    }
  }, []);

  useEffect(() => {
    if (acceptedSystemsDefinitions && details.acceptsConversion()) {
      updateConversionOptions();
    }
  }, [acceptedSystemsDefinitions]);

  useEffect(() => {
    if (
      sendModal &&
      prevSendModal &&
      sendModal.type == null &&
      prevSendModal.type != null &&
      prevSendModal.data[SEND_MODAL_SEND_COMPLETED]
    ) {
      if (next != null) {
        next(response, [detailIndex])
      } else {
        cancel();
      }
    }
  }, [sendModal]);

  const onSelectFundSource = (source) => {
    const {
      amount,
      conversion,
      wallet,
      coinObj,
      exportTo,
      via
    } = source.option;

    openConvertOrCrossChainSendModal(coinObj, wallet, {
      [SEND_MODAL_TO_ADDRESS_FIELD]: details.acceptsAnyDestination() ? '' : details.destination.getAddressString(),
      [SEND_MODAL_AMOUNT_FIELD]: details.acceptsAnyAmount() ? '' : amount.toString(),
      [SEND_MODAL_MEMO_FIELD]: '',
      [SEND_MODAL_CONVERTTO_FIELD]: details.acceptsConversion() && conversion ? currencyDefinition.fullyqualifiedname : '',
      [SEND_MODAL_EXPORTTO_FIELD]: exportTo != null ? exportTo : '',
      [SEND_MODAL_VIA_FIELD]: details.acceptsConversion() && via != null ? via : '',
      [SEND_MODAL_SHOW_CONVERTTO_FIELD]: details.acceptsConversion() && conversion,
      [SEND_MODAL_SHOW_EXPORTTO_FIELD]: exportTo != null,
      [SEND_MODAL_SHOW_VIA_FIELD]: details.acceptsConversion() && via != null,
      [SEND_MODAL_ADVANCED_FORM]: true,
      [SEND_MODAL_SHOW_IS_PRECONVERT]: false,
      [SEND_MODAL_DISABLED_INPUTS]: {
        [SEND_MODAL_CONVERTTO_FIELD]: true,
        [SEND_MODAL_VIA_FIELD]: true,
        [SEND_MODAL_EXPORTTO_FIELD]: true,
        [SEND_MODAL_MAPPING_FIELD]: true,
        [SEND_MODAL_AMOUNT_FIELD]: !details.acceptsAnyAmount(),
        [SEND_MODAL_TO_ADDRESS_FIELD]: !details.acceptsAnyDestination(),
      },
      [SEND_MODAL_CONTINUE_IMMEDIATELY]: !details.acceptsAnyAmount() && !details.acceptsAnyDestination(),
      [SEND_MODAL_STRICT_AMOUNT]: !details.acceptsAnyAmount(),
      [SEND_MODAL_VDXF_TAG]: details.isTagged() ? details.tag.toXAddress() : ''
    })
  }

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <SafeAreaView style={Styles.defaultRoot}>
      <View style={{flex: 1, width: '100%'}}>
        <FundSourceSelectList
          animationType="slide"
          onSelect={onSelectFundSource}
          sourceOptions={conversionOptions}
          allSubWallets={allSubWallets}
          coinObjs={activeCoinsForUser}
          testnet={details.isTestnet()}
          allowAnyAmount={details.acceptsAnyAmount()}
          allowConversion={details.acceptsConversion()}
          expires={details.expires()}
          allowNonVerusSystems={details.acceptsNonVerusSystems()}
          acceptedSystems={details.acceptedsystems}
          requestedCurrency={details.requestedcurrencyid}
          amount={details.amount.toNumber()}
          excludeVerusBlockchain={details.excludesVerusBlockchain()}
        />
      </View>
    </SafeAreaView>
  );
};

export default InvoicePaymentConfiguration;

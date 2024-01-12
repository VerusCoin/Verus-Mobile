import React, {useState, useEffect} from 'react';
import { View, SafeAreaView, Alert } from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client";
import { useSelector } from 'react-redux';
import { openConvertOrCrossChainSendModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import BigNumber from 'bignumber.js';
import { SEND_MODAL_ADVANCED_FORM, SEND_MODAL_AMOUNT_FIELD, SEND_MODAL_CONTINUE_IMMEDIATELY, SEND_MODAL_CONVERTTO_FIELD, SEND_MODAL_DISABLED_INPUTS, SEND_MODAL_EXPORTTO_FIELD, SEND_MODAL_IS_PRECONVERT, SEND_MODAL_MEMO_FIELD, SEND_MODAL_PBAAS_CURRENCY_PASSTHROUGH, SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD, SEND_MODAL_PRICE_ESTIMATE, SEND_MODAL_SHOW_CONVERTTO_FIELD, SEND_MODAL_SHOW_EXPORTTO_FIELD, SEND_MODAL_SHOW_IS_PRECONVERT, SEND_MODAL_SHOW_VIA_FIELD, SEND_MODAL_STRICT_AMOUNT, SEND_MODAL_TO_ADDRESS_FIELD, SEND_MODAL_VIA_FIELD } from '../../../utils/constants/sendModal';
import { IS_PBAAS } from '../../../utils/constants/intervalConstants';
import { getInvoiceSourceOptions } from '../../../utils/api/channels/vrpc/callCreators';
import { satsToCoins } from '../../../utils/math';
import FundSourceSelectList from '../../FundSourceSelect/FundSourceSelectList';

const InvoicePaymentConfiguration = props => {
  const {
    deeplinkData, 
    sigtime, 
    cancel, 
    signerFqn, 
    currencyDefinition, 
    amountDisplay, 
    destinationDisplay,
    coinObj,
    chainInfo,
    acceptedSystemsDefinitions
  } = props.route.params;

  const [conversionOptions, setConversionOptions] = useState({});

  const [loading, setLoading] = useState(false);
  const inv = primitives.VerusPayInvoice.fromJson(deeplinkData);

  const activeCoinsForUser = useSelector(state => state.coins.activeCoinsForUser);
  
  const allSubWallets = useSelector(state => state.coinMenus.allSubWallets)

  const updateConversionOptions = async () => {
    try {
      const { definitions, remainingSystems } = acceptedSystemsDefinitions;
      const supportedSystemIds = [...Object.keys(definitions), ...remainingSystems];
      const maxSlippage = satsToCoins(BigNumber(inv.details.maxestimatedslippage)).toNumber();
  
      const sourceOptionsMap = await getInvoiceSourceOptions(
        inv.details.requestedcurrencyid,
        satsToCoins(BigNumber(inv.details.amount)).toNumber(),
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
    if (acceptedSystemsDefinitions && inv.details.acceptsConversion()) {
      updateConversionOptions();
    }
  }, [acceptedSystemsDefinitions]);

  const onSelectFundSource = (source) => {
    const {
      amount,
      network,
      conversion,
      viaCurrencyId,
      wallet,
      coinObj,
      exportTo
    } = source.option;

    openConvertOrCrossChainSendModal(coinObj, wallet, {
      [SEND_MODAL_TO_ADDRESS_FIELD]: inv.details.acceptsAnyDestination() ? '' : inv.details.destination.getAddressString(),
      [SEND_MODAL_AMOUNT_FIELD]: inv.details.acceptsAnyAmount() ? '' : amount.toString(),
      [SEND_MODAL_MEMO_FIELD]: '',
      [SEND_MODAL_CONVERTTO_FIELD]: inv.details.acceptsConversion() && conversion ? currencyDefinition.fullyqualifiedname : '',
      [SEND_MODAL_EXPORTTO_FIELD]: exportTo != null ? exportTo : '',
      [SEND_MODAL_VIA_FIELD]: inv.details.acceptsConversion() && viaCurrencyId != null ? viaCurrencyId : '',
      [SEND_MODAL_SHOW_CONVERTTO_FIELD]: inv.details.acceptsConversion() && conversion,
      [SEND_MODAL_SHOW_EXPORTTO_FIELD]: !inv.details.acceptsConversion() && !inv.details.expires() && exportTo != null,
      [SEND_MODAL_SHOW_VIA_FIELD]: inv.details.acceptsConversion() && viaCurrencyId != null,
      [SEND_MODAL_ADVANCED_FORM]: true,
      [SEND_MODAL_SHOW_IS_PRECONVERT]: false,
      [SEND_MODAL_DISABLED_INPUTS]: {
        [SEND_MODAL_CONVERTTO_FIELD]: true,
        [SEND_MODAL_VIA_FIELD]: true,
        [SEND_MODAL_AMOUNT_FIELD]: !inv.details.acceptsAnyAmount(),
        [SEND_MODAL_TO_ADDRESS_FIELD]: !inv.details.acceptsAnyDestination(),
      },
      [SEND_MODAL_CONTINUE_IMMEDIATELY]: !inv.details.acceptsAnyAmount() && !inv.details.acceptsAnyDestination(),
      [SEND_MODAL_STRICT_AMOUNT]: !inv.details.acceptsAnyAmount()
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
          invoice={inv.toJson()}
        />
      </View>
    </SafeAreaView>
  );
};

export default InvoicePaymentConfiguration;

import React, {useState, useEffect} from 'react';
import {Alert} from 'react-native';
import {primitives} from 'verusid-ts-client';
import {useDispatch} from 'react-redux';
import {openConvertOrCrossChainSendModal} from '../../../actions/actions/sendModal/dispatchers/sendModal';
import BigNumber from 'bignumber.js';
import {
  SEND_MODAL_ADVANCED_FORM,
  SEND_MODAL_INVOICE_CONTEXT,
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_CONTINUE_IMMEDIATELY,
  SEND_MODAL_CONVERTTO_FIELD,
  SEND_MODAL_DISABLED_INPUTS,
  SEND_MODAL_EXPORTTO_FIELD,
  SEND_MODAL_IS_BURN_CHANGE_PRICE,
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
import {
  API_GET_BALANCES,
  IS_PBAAS,
} from '../../../utils/constants/intervalConstants';
import {getInvoiceSourceOptions} from '../../../utils/api/channels/vrpc/callCreators';
import {satsToCoins} from '../../../utils/math';
import FundSourceSelectList from '../../FundSourceSelect/FundSourceSelectList';
import {usePrevious} from '../../../hooks/usePrevious';
import {conditionallyUpdateWallet} from '../../../actions/actionDispatchers';
import store from '../../../store';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import InvoicePaymentOptions from './InvoicePaymentOptions';
import {getVerusPayInvoicePaymentDestination} from '../../../utils/deeplink/verusPayBurnChangePrice';

const InvoicePaymentConfiguration = props => {
  const {
    detailsBufferString,
    invoiceVersion,
    cancel,
    currencyDefinition,
    acceptedSystemsDefinitions,
    next,
    response,
    detailIndex,
    renderInvoice,
    // The new invoice flow (InvoicePayFlow) renders the payment options itself.
    renderFlow,
    signerFqn,
    amountDisplay,
    destinationDisplay,
  } = props;

  const [conversionOptions, setConversionOptions] = useState({});
  const [conversionError, setConversionError] = useState(false);
  // Shown above "Review burn" when the payment cannot be prepared.
  const [reviewError, setReviewError] = useState(null);

  const details = new primitives.VerusPayInvoiceDetails();
  details.fromBuffer(
    Buffer.from(detailsBufferString, 'hex'),
    0,
    new primitives.BigNumber(invoiceVersion),
  );
  const isBurnChangePrice = details.isBurnChangePrice();

  const activeCoinsForUser = useObjectSelector(
    state => state.coins.activeCoinsForUser,
  );
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );

  const sendModal = useObjectSelector(state => state.sendModal);
  const prevSendModal = usePrevious(sendModal);

  const allSubWallets = useObjectSelector(
    state => state.coinMenus.allSubWallets,
  );

  const dispatch = useDispatch();

  const updateConversionOptions = async () => {
    setConversionError(false);
    try {
      const {definitions, remainingSystems} = acceptedSystemsDefinitions;
      const supportedSystemIds = [
        ...Object.keys(definitions),
        ...remainingSystems,
      ];
      const maxSlippage =
        details.maxestimatedslippage != null
          ? satsToCoins(BigNumber(details.maxestimatedslippage)).toNumber()
          : 0;

      const invoiceAmount =
        details.acceptsAnyAmount() || details.amount == null
          ? 0
          : satsToCoins(BigNumber(details.amount)).toNumber();

      const sourceOptionsMap = await getInvoiceSourceOptions(
        details.requestedcurrencyid,
        invoiceAmount,
        supportedSystemIds,
        activeCoinsForUser
          .filter(x => x.tags.includes(IS_PBAAS))
          .map(x => x.currency_id),
        maxSlippage,
      );

      setConversionOptions(Object.fromEntries(sourceOptionsMap.entries()));
    } catch (e) {
      if (renderFlow) setConversionError(true);
      else Alert.alert('Error fetching conversion options', e.message);
    }
  };

  useEffect(() => {
    for (const coin of activeCoinsForUser) {
      if (coin.tags.includes(IS_PBAAS)) {
        conditionallyUpdateWallet(
          store.getState(),
          dispatch,
          coin.id,
          API_GET_BALANCES,
        );
      }
    }
  }, []);

  useEffect(() => {
    if (
      acceptedSystemsDefinitions &&
      details.acceptsConversion() &&
      !isBurnChangePrice
    ) {
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
        next(response, [detailIndex]);
      } else {
        cancel();
      }
    }
  }, [sendModal]);

  const onSelectFundSource = source => {
    setReviewError(null);
    try {
      const {amount, conversion, wallet, coinObj, exportTo, via} =
        source.option;
      const allowsConversion =
        details.acceptsConversion() && !isBurnChangePrice;
      const destination = getVerusPayInvoicePaymentDestination(
        details,
        activeAccount,
        coinObj,
        wallet,
      );

      openConvertOrCrossChainSendModal(coinObj, wallet, {
        [SEND_MODAL_INVOICE_CONTEXT]: {
          requester: signerFqn,
          requestedCurrency: currencyDefinition.fullyqualifiedname,
          requestedAmount: amountDisplay,
          destinationDisplay,
          sourceLabel: wallet.name,
        },
        [SEND_MODAL_TO_ADDRESS_FIELD]: destination,
        [SEND_MODAL_AMOUNT_FIELD]: details.acceptsAnyAmount()
          ? ''
          : amount.toString(),
        [SEND_MODAL_MEMO_FIELD]: '',
        [SEND_MODAL_CONVERTTO_FIELD]:
          allowsConversion && conversion
            ? currencyDefinition.fullyqualifiedname
            : '',
        [SEND_MODAL_EXPORTTO_FIELD]: exportTo != null ? exportTo : '',
        [SEND_MODAL_VIA_FIELD]: allowsConversion && via != null ? via : '',
        [SEND_MODAL_SHOW_CONVERTTO_FIELD]: allowsConversion && conversion,
        [SEND_MODAL_SHOW_EXPORTTO_FIELD]: exportTo != null,
        [SEND_MODAL_SHOW_VIA_FIELD]: allowsConversion && via != null,
        [SEND_MODAL_ADVANCED_FORM]: true,
        [SEND_MODAL_SHOW_IS_PRECONVERT]: false,
        [SEND_MODAL_IS_BURN_CHANGE_PRICE]: isBurnChangePrice,
        [SEND_MODAL_DISABLED_INPUTS]: {
          [SEND_MODAL_CONVERTTO_FIELD]: true,
          [SEND_MODAL_VIA_FIELD]: true,
          [SEND_MODAL_EXPORTTO_FIELD]: true,
          [SEND_MODAL_MAPPING_FIELD]: true,
          [SEND_MODAL_AMOUNT_FIELD]: !details.acceptsAnyAmount(),
          [SEND_MODAL_TO_ADDRESS_FIELD]:
            !details.acceptsAnyDestination() || isBurnChangePrice,
        },
        [SEND_MODAL_CONTINUE_IMMEDIATELY]:
          !details.acceptsAnyAmount() &&
          (!details.acceptsAnyDestination() || isBurnChangePrice),
        [SEND_MODAL_STRICT_AMOUNT]: !details.acceptsAnyAmount(),
        [SEND_MODAL_VDXF_TAG]: details.isTagged()
          ? details.tag.toXAddress()
          : '',
      });
    } catch (e) {
      console.warn(e);
      setReviewError(
        `This ${
          isBurnChangePrice ? 'burn' : 'payment'
        } cannot be prepared from this address. Choose another address or try again.`,
      );
    }
  };

  const sourceList = (
    <FundSourceSelectList
      renderContent={sourceState =>
        renderFlow ? (
          renderFlow({
            ...sourceState,
            conversionError,
            retryConversions: updateConversionOptions,
          })
        ) : (
          <InvoicePaymentOptions
            {...sourceState}
            renderInvoice={renderInvoice}
            reviewError={reviewError}
            onSelect={onSelectFundSource}
          />
        )
      }
      animationType="slide"
      onSelect={onSelectFundSource}
      sourceOptions={conversionOptions}
      allSubWallets={allSubWallets}
      coinObjs={activeCoinsForUser}
      testnet={details.isTestnet()}
      allowAnyAmount={details.acceptsAnyAmount()}
      allowConversion={details.acceptsConversion() && !isBurnChangePrice}
      burnChangePrice={isBurnChangePrice}
      burnSystemId={currencyDefinition.systemid}
      expires={details.expires()}
      allowNonVerusSystems={details.acceptsNonVerusSystems()}
      acceptedSystems={details.acceptedsystems}
      requestedCurrency={details.requestedcurrencyid}
      amount={
        details.acceptsAnyAmount() || details.amount == null
          ? 0
          : details.amount.toNumber()
      }
      excludeVerusBlockchain={details.excludesVerusBlockchain()}
    />
  );

  return sourceList;
};

export default InvoicePaymentConfiguration;

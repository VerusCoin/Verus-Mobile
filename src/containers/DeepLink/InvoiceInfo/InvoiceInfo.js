import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import {Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {DeepLinkReviewScrollView} from '../components/RequestReview';
import {useSelector} from 'react-redux';
import {primitives} from 'verusid-ts-client';
import BigNumber from 'bignumber.js';
import AppButton from '../../../components/AppButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {blocksToTime, satsToCoins, unixToDate} from '../../../utils/math';
import {getSystemNameFromSystemId} from '../../../utils/CoinData/CoinData';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import {
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../../actions/actionDispatchers';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import {formatCurrency} from 'react-native-format-currency';
import AcknowledgeSheet from '../../../components/AcknowledgeSheet';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {API_GET_FIATPRICE} from '../../../utils/constants/intervalConstants';
import {USD} from '../../../utils/constants/currencies';
import {getCurrencyDisplay} from '../../SendWizard/wizardUtils';
import InvoicePayFlow from './InvoicePayFlow';
import {
  GENERIC_REQUEST_DELIVERY_TYPES,
  getGenericRequestDeliveryInfo,
} from '../../../utils/deeplink/genericRequestDelivery';
import {
  getPaidInvoiceKey,
  loadPaidInvoice,
  savePaidInvoice,
} from '../../../utils/deeplink/paidInvoiceStorage';
import RequestCard from '../components/RequestReview/RequestCard';
import DeepLinkRequestSheetScaffold from '../components/RequestReview/DeepLinkRequestSheetScaffold';
import DeepLinkVerusIdDetailsSheet from '../components/RequestReview/DeepLinkVerusIdDetailsSheet';
import InvoicePaymentConfiguration from '../InvoicePaymentConfiguration/InvoicePaymentConfiguration';
import {
  InvoiceCopyRow,
  InvoiceErrorLine,
  InvoiceRow,
  InvoiceSourceRow,
  useInvoiceStyles,
} from './InvoicePaymentParts';

const InvoiceInfo = props => {
  const {styles, compact} = useInvoiceStyles();
  const {
    detailsBufferString,
    invoiceVersion,
    isSigned,
    sigtime,
    cancel,
    signerFqn,
    signerSystemID,
    currencyDefinition,
    amountDisplay,
    destinationDisplay,
    coinObj,
    chainInfo,
    acceptedSystemsDefinitions,
    next,
    response,
    detailIndex,
    request,
    deliverPaidInvoiceResponse,
    completePaidInvoice,
    paidSignInMessage,
  } = props;
  const details = useMemo(() => {
    const invoice = new primitives.VerusPayInvoiceDetails();
    invoice.fromBuffer(
      Buffer.from(detailsBufferString, 'hex'),
      0,
      new primitives.BigNumber(invoiceVersion),
    );
    return invoice;
  }, [detailsBufferString, invoiceVersion]);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const accountHash = useSelector(
    state => state.authentication.activeAccount?.accountHash ?? null,
  );
  // An earlier payment of this invoice from this device, for a light warning
  // on Confirm. Paying again stays possible (owner, 2026-10-26).
  const paidInvoiceKey = useMemo(
    () =>
      signedIn
        ? getPaidInvoiceKey({
            request,
            detailIndex,
            detailsBufferString,
            sigtime,
            accountHash,
          })
        : null,
    [accountHash, detailIndex, detailsBufferString, request, sigtime, signedIn],
  );
  const [paidBefore, setPaidBefore] = useState(null);
  const [responseDelivery, setResponseDelivery] = useState({status: 'idle'});
  const redirectResponse =
    getGenericRequestDeliveryInfo(request).type ===
    GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT;
  const deliverResponse = async () => {
    if (!deliverPaidInvoiceResponse) return true;
    setResponseDelivery({status: 'sending'});
    try {
      const result = await deliverPaidInvoiceResponse();
      setResponseDelivery({status: 'success', type: result.type});
      return true;
    } catch (_) {
      setResponseDelivery({status: 'error'});
      return false;
    }
  };
  const onPaymentBroadcast = () => {
    if (!redirectResponse) void deliverResponse();
  };
  useEffect(() => {
    let active = true;
    setPaidBefore(null);
    loadPaidInvoice(paidInvoiceKey)
      .then(record => {
        if (active) setPaidBefore(record);
      })
      .catch(error => console.warn(error));
    return () => {
      active = false;
    };
  }, [paidInvoiceKey]);
  const onPaymentSent = useCallback(
    txid => {
      savePaidInvoice(paidInvoiceKey, txid).catch(error => console.warn(error));
    },
    [paidInvoiceKey],
  );
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const isTestAccount = useSelector(
    state =>
      state.authentication.activeAccount &&
      Object.keys(state.authentication.activeAccount.testnetOverrides || {})
        .length > 0,
  );
  const [sheet, setSheet] = useState(null);
  const [identitySheet, setIdentitySheet] = useState(null);
  const [wrongNetworkVisible, setWrongNetworkVisible] = useState(false);
  const activeCoins = useObjectSelector(state => state.coins.activeCoinsForUser);
  const allSubWallets = useObjectSelector(state => state.coinMenus.allSubWallets);
  const rates = useObjectSelector(state => state.ledger.rates);
  const displayCurrency = useObjectSelector(
    state => state.settings.generalWalletSettings.displayCurrency || USD,
  );
  const isBurn = details.isBurnChangePrice();
  const wrongNetwork =
    signedIn && Boolean(isTestAccount) !== details.isTestnet();
  const signerIdentityID =
    props.signerIdentityID ||
    (isSigned ? props.request?.signature?.identityID?.toIAddress() : null);
  const requesterLabel = signerFqn || signerIdentityID || 'Unknown signer';
  const signerChain = isSigned
    ? getSystemNameFromSystemId(signerSystemID)
    : null;
  const currency = currencyDefinition.fullyqualifiedname;
  const anyAmount = details.acceptsAnyAmount() || amountDisplay == null;
  const expiry = details.expires()
    ? blocksToTime(details.expiryheight.toNumber() - chainInfo.longestchain)
    : null;
  const networks = Object.values(acceptedSystemsDefinitions?.definitions || {});
  const otherNetworks = acceptedSystemsDefinitions?.remainingSystems || [];

  // A testnet invoice in a mainnet wallet, or the other way round.
  useEffect(() => {
    if (wrongNetwork) setWrongNetworkVisible(true);
  }, [wrongNetwork]);
  const invoiceNetwork = details.isTestnet() ? 'testnet' : 'mainnet';
  const allowList = details.isTestnet()
    ? (accounts || []).filter(
        account =>
          account.testnetOverrides?.[coinObj.mainnet_id] === coinObj.id,
      )
    : (accounts || []).filter(
        account => account.testnetOverrides?.[coinObj.id] == null,
      );
  // Signed out with no wallet for the invoice network: Unlock is disabled and
  // the footer says why.
  const noInvoiceNetworkWallet = !signedIn && allowList.length === 0;

  const unlockWallet = async () => {
    if (allowList.length === 0) return;

    try {
      await requestWalletUnlock({
        reason: 'invoice-request',
        title: 'Unlock wallet to continue',
        requestLabel: 'Invoice',
        accountHashes: allowList.map(account => account.accountHash),
        networkLabel: details.isTestnet() ? 'Testnet' : 'Mainnet',
      });
    } catch (e) {
      if (e?.code !== WALLET_UNLOCK_CANCELLED) {
        createAlert('Cannot continue', e?.message || 'Unable to unlock wallet.');
      }
    }
  };

  const openRequester = () => {
    const systemId = CoinDirectory.getBasicCoinObj(signerChain).system_id;
    setIdentitySheet({
      loadVerusId: async () => {
        const result = await getIdentity(systemId, signerIdentityID);
        if (result.error) throw new Error(result.error.message);
        return result.result;
      },
      loadFriendlyNames: identity => getFriendlyNameMap(systemId, identity),
    });
  };

  // The facts the payer's slip, Confirm and Sent show (InvoicePayFlow).
  const requestedCoin = activeCoins.find(
    coin => coin.currency_id === details.requestedcurrencyid,
  );
  const ticker =
    requestedCoin?.display_ticker ||
    getCurrencyDisplay(details.requestedcurrencyid, currency).ticker;
  const rate = requestedCoin
    ? (allSubWallets?.[requestedCoin.id] || [])
        .map(wallet => wallet.api_channels?.[API_GET_FIATPRICE])
        .map(channel => rates?.[channel]?.[requestedCoin.id]?.[displayCurrency])
        .find(value => value != null)
    : null;
  const invoiceFacts = {
    details,
    amountDisplay: anyAmount ? null : amountDisplay,
    ticker,
    currencyId: details.requestedcurrencyid,
    currencyFqn: currency,
    currencyName: currency,
    coinId: requestedCoin?.id || details.requestedcurrencyid,
    signer: isSigned ? requesterLabel : null,
    destinationDisplay: details.acceptsAnyDestination() ? null : destinationDisplay,
    acceptsConversion: details.acceptsConversion(),
    anyAmount,
    anyDestination: details.acceptsAnyDestination(),
    expiry,
    tag: details.isTagged() ? details.tag.toXAddress() : null,
    fiat:
      rate != null && !anyAmount
        ? formatCurrency({
            amount: BigNumber(amountDisplay).multipliedBy(rate).toFixed(2),
            code: displayCurrency,
          })[0]
        : null,
  };

  const requester = {request, signerFqn, signerIdentityID, signerSystemID, signerSystemName: signerChain, sigtime};
  const requesterSections = [{title: 'Invoice', rows: [
    {label: 'Currency', value: currency},
    {label: 'Supported networks', value: [...networks.map(network => network.fullyqualifiedname), ...otherNetworks].join('\n') || null},
    {label: 'Conversion', value: details.acceptsConversion() && !isBurn ? 'Supported' : null},
    {label: isBurn ? 'Burn output address' : 'Destination', value: details.acceptsAnyDestination() ? null : details.destination.getAddressString(), copy: true},
    {label: 'Tag', value: details.isTagged() ? details.tag.toXAddress() : null, copy: true},
    {label: 'Expires', value: expiry},
    {label: 'Amount', value: anyAmount ? 'You choose' : `${amountDisplay} ${currency}`},
    {label: 'Maximum estimated slippage', value: details.acceptsConversion() && !isBurn ? `${satsToCoins(BigNumber(details.maxestimatedslippage)).times(100).toString()}%` : null},
  ]}];

  const renderSheets = () => (
    <>
      <DeepLinkRequestSheetScaffold
        title={sheet === 'networks' ? 'Supported networks' : 'Invoice details'}
        visible={sheet != null}
        onClose={() => setSheet(null)}>
        {sheet === 'networks' ? (
          <>
            {networks.map(network => (
              <InvoiceRow
                key={network.currencyid}
                label={network.fullyqualifiedname}
              />
            ))}
            {otherNetworks.map(network => (
              <InvoiceCopyRow
                key={network}
                label="Network ID"
                value={network}
              />
            ))}
          </>
        ) : (
          <>
            <InvoiceRow label="Currency" value={currency} />
            <InvoiceRow
              label="Supported networks"
              onPress={() => setSheet('networks')}
            />
            <InvoiceCopyRow
              label={isBurn ? 'Burn output address' : 'Destination'}
              value={
                !details.acceptsAnyDestination()
                  ? details.destination.getAddressString()
                  : null
              }
            />
            {details.isTagged() && <InvoiceCopyRow label="Tag" value={details.tag.toXAddress()} />}
            {isSigned && (
              <InvoiceRow label="Signed" value={unixToDate(sigtime)} />
            )}
            {!!expiry && (
              <InvoiceRow label="Approximate expiry" value={expiry} />
            )}
            {details.acceptsConversion() && !isBurn && (
              <>
                <InvoiceRow label="Conversion" value="Supported" />
                <InvoiceRow
                  label="Maximum estimated slippage"
                  value={`${satsToCoins(BigNumber(details.maxestimatedslippage))
                    .times(100)
                    .toString()}%`}
                />
              </>
            )}
            <InvoiceRow
              label="Amount"
              value={anyAmount ? 'You choose' : `${amountDisplay} ${currency}`}
            />
          </>
        )}
      </DeepLinkRequestSheetScaffold>
      {identitySheet && (
        <DeepLinkVerusIdDetailsSheet
          {...identitySheet}
          visible
          onClose={() => setIdentitySheet(null)}
        />
      )}
      <AcknowledgeSheet
        confirmLabel="Close"
        message={`This invoice is for ${invoiceNetwork}. Your open wallet is on ${
          isTestAccount ? 'testnet' : 'mainnet'
        }. Open a ${invoiceNetwork} wallet and scan it again.`}
        onAcknowledged={cancel}
        onClose={() => setWrongNetworkVisible(false)}
        title={details.isTestnet() ? 'Testnet invoice' : 'Mainnet invoice'}
        visible={wrongNetworkVisible}
      />
    </>
  );

  const renderInvoice = ({
    selectedSource,
    onChooseSource,
    onReviewPayment,
    reviewError,
  } = {}) => (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <DeepLinkReviewScrollView
        showScrollCue
        requestCard
        style={styles.scroll}
        contentContainerStyle={styles.content}>
        <RequestCard action="wants you to pay" requester={requester} sections={requesterSections} />
        <Text selectable style={styles.amount}>
          {anyAmount ? `Amount in ${currency}` : `${amountDisplay} ${currency}`}
        </Text>
        {isBurn && (
          <View style={styles.notice}>
            <Text style={styles.text}>
              This permanently removes the amount from circulation. The burn
              output address does not receive it.
            </Text>
          </View>
        )}
        <InvoiceRow
          label={isBurn ? 'Burn output' : 'To'}
          value={
            details.acceptsAnyDestination()
              ? isBurn
                ? 'Your own address'
                : 'You choose'
              : destinationDisplay
          }
        />
        {!!expiry && (
          <InvoiceRow label="Expires in" value={`About ${expiry}`} />
        )}
        <InvoiceRow
          label="Invoice details"
          onPress={() => setSheet('details')}
        />
      </DeepLinkReviewScrollView>
      <SafeBottomActionStack horizontalSpacing={24} style={styles.footer}>
        {selectedSource && (
          <>
            {!compact && <Text style={styles.footnote}>Pay from</Text>}
            <InvoiceSourceRow
              selected
              title={`${selectedSource.option.conversion ? '≈ ' : ''}${
                anyAmount ? '' : `${selectedSource.option.amount} `
              }${selectedSource.option.coinObj.display_ticker} · ${
                selectedSource.option.wallet.name
              }`}
              detail={
                selectedSource.option.conversion
                  ? `Convert to ${currency} · ${selectedSource.networkLabel}`
                  : undefined
              }
              onPress={onChooseSource}
            />
          </>
        )}
        {noInvoiceNetworkWallet && (
          <Text style={styles.footnote}>
            {`This invoice needs a ${invoiceNetwork} wallet. Add one, then open the invoice again.`}
          </Text>
        )}
        <InvoiceErrorLine>{reviewError}</InvoiceErrorLine>
        <AppButton
          disabled={wrongNetwork || noInvoiceNetworkWallet}
          onPress={
            signedIn
              ? selectedSource
                ? onReviewPayment
                : onChooseSource
              : unlockWallet
          }>
          {signedIn
            ? selectedSource
              ? isBurn
                ? 'Review burn'
                : 'Review payment'
              : 'Choose how to pay'
            : 'Unlock wallet'}
        </AppButton>
        <AppButton variant="secondary" onPress={cancel}>
          Cancel
        </AppButton>
      </SafeBottomActionStack>
      {renderSheets()}
    </SafeAreaView>
  );

  if (!signedIn || wrongNetwork) return renderInvoice();
  // Burn invoices keep their own review in the old send window.
  if (isBurn) {
    return <InvoicePaymentConfiguration {...props} renderInvoice={renderInvoice} />;
  }

  const onPaid = async () => {
    if (responseDelivery.status === 'sending') return;
    if (responseDelivery.status === 'idle' && !(await deliverResponse())) return;
    if (completePaidInvoice) return completePaidInvoice();
    return next != null ? next(response, [detailIndex]) : cancel();
  };
  const responseMessage =
    responseDelivery.status === 'sending'
    ? 'Sending response…'
    : responseDelivery.status === 'success' &&
      responseDelivery.type === GENERIC_REQUEST_DELIVERY_TYPES.POST
    ? paidSignInMessage
    : redirectResponse && responseDelivery.status === 'idle' && response?.details?.length
    ? 'Tap Done to return to the requester.'
    : null;
  return (
    <>
      <InvoicePaymentConfiguration
        {...props}
        renderFlow={({cards, loading, conversionError, retryConversions}) => (
          <InvoicePayFlow
            onHeaderVisibilityChange={props.onHeaderVisibilityChange}
            onOpenInAnotherApp={props.onOpenInAnotherApp}
            flow={{
              invoice: invoiceFacts,
              requester,
              requesterSections,
              cards,
              loading,
              conversionError,
              onRetryConversions: retryConversions,
              onExit: cancel,
              onPaid,
              onPaymentSent,
              onPaymentBroadcast,
              responseMessage,
              responsePending: responseDelivery.status === 'sending',
              responseWarning:
                responseDelivery.status === 'error'
                  ? redirectResponse
                    ? 'The response could not be opened.'
                    : 'The response could not be sent to the requester.'
                  : null,
              paidBefore,
              onOpenDetails: () => setSheet('details'),
              onOpenRequester:
                signerChain && signerIdentityID ? openRequester : undefined,
            }}
          />
        )}
      />
      {renderSheets()}
    </>
  );
};

export default InvoiceInfo;

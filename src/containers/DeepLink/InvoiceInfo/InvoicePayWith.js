import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import TextAction from '../../../components/TextAction';
import FadedScrollView from '../../../components/FadedScrollView';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import {fontStyle} from '../../../globals/fonts';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';
import {estimateConversion} from '../../../utils/api/channels/vrpc/requests/estimateConversion';
import {API_GET_FIATPRICE, API_SEND} from '../../../utils/constants/intervalConstants';
import {USD} from '../../../utils/constants/currencies';
import {getVerusPayInvoicePaymentDestination} from '../../../utils/deeplink/verusPayBurnChangePrice';
import {coinsToSats, truncateDecimal} from '../../../utils/math';
import {getSubWalletCardType} from '../../../utils/subwallet/cardPresentation';
import {useSendWizard} from '../../SendWizard/SendWizardContext';
import ImpactChip from '../../SendWizard/components/ImpactChip';
import PriceRouteSheet from '../../SendWizard/components/PriceRouteSheet';
import {SourceCardSheet} from '../../SendWizard/components/SelectionSheets';
import {
  formatEstimatedAmount,
  getConversionPriceSummary,
  getImpactBadgeLabel,
} from '../../SendWizard/components/impactFormat';
import {
  ErrorMessage,
  WIZARD_CONTENT_INSET,
  WIZARD_CONTENT_TOP_INSET,
  WizardScreen,
} from '../../SendWizard/components/WizardUI';
import {useInvoiceFlow} from '../../SendWizard/invoiceFlow';
import {IMPACT_LEVEL} from '../../SendWizard/priceImpact';
import {getSampleAmount} from '../../SendWizard/usePriceImpact';
import {ADDRESS_TYPE, buildSendTarget} from '../../SendWizard/wizardUtils';
import InvoiceSlip from './InvoiceSlip';
import RequestCard from '../components/RequestReview/RequestCard';
import OpenInAnotherWalletAction from '../components/RequestReview/OpenInAnotherWalletAction';

// A source as Receive's address chooser names it.
export const getPayFromLabel = wallet => {
  const cardType = getSubWalletCardType(wallet);
  return cardType === 'VerusID' || cardType === 'Address' ? wallet.name : cardType;
};

const formatCost = (amount, ticker, conversion) =>
  `${conversion ? '≈ ' : ''}${
    conversion
      ? formatEstimatedAmount(amount || 0)
      : truncateDecimal(BigNumber(amount || 0), 8)
  } ${ticker}`;

// A basket that is the requested or the paying currency itself is no detour:
// the conversion goes straight into or out of it.
const getVia = (option, invoice) =>
  option.viaCurrencyId &&
  ![invoice.currencyId, option.coinObj.currency_id, option.coinObj.id].includes(
    option.viaCurrencyId,
  )
    ? option.viaCurrencyId
    : null;

// The first step of an invoice payment: the slip that was scanned, then every
// way to pay it with what it costs. Owner-approved option A (2026-10-21).
// One row per currency (owner, 2026-10-22): the cheapest basket is chosen,
// and the row shows Send's price impact chip, which opens "Price and route"
// with every basket. A currency on several cards opens the address chooser. With
// only one way to pay, the step is skipped.
const InvoicePayWith = () => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const flow = useInvoiceFlow();
  const {state, setAmount, setMarketPrice, setRecipient, setSource} =
    useSendWizard();
  const activeAccount = useObjectSelector(
    stateValue => stateValue.authentication.activeAccount,
  );
  const displayCurrency = useSelector(
    stateValue =>
      stateValue.settings.generalWalletSettings.displayCurrency || USD,
  );
  const rates = useObjectSelector(stateValue => stateValue.ledger.rates);
  const [cardGroup, setCardGroup] = useState(null);
  const [cardSheetVisible, setCardSheetVisible] = useState(false);
  const [priceGroup, setPriceGroup] = useState(null);
  const [priceSheetVisible, setPriceSheetVisible] = useState(false);
  const [chosenRoutes, setChosenRoutes] = useState({});
  const [markets, setMarkets] = useState({});
  const requestedMarkets = useRef(new Set());
  const [payError, setPayError] = useState(null);
  const skipped = useRef(false);
  const {cards = [], conversionError, invoice, loading, onRetryConversions} = flow;

  // Currency first, then the baskets it can go through, cheapest first. Each
  // basket keeps the cards that can pay through it.
  const groups = useMemo(() => {
    const byKey = new Map();
    cards.forEach(card => {
      const {coinObj, conversion, amount, exportTo} = card.option;
      const key = `${coinObj.id}|${conversion ? 1 : 0}|${exportTo || ''}`;
      if (!byKey.has(key)) {
        byKey.set(key, {key, coin: coinObj, conversion, routes: new Map()});
      }
      const via = conversion ? getVia(card.option, invoice) : null;
      const routeKey = via || 'direct';
      const routes = byKey.get(key).routes;
      if (!routes.has(routeKey)) {
        routes.set(routeKey, {
          key: routeKey,
          via,
          viaName: via ? card.option.via : null,
          amount,
          cards: [],
        });
      }
      routes.get(routeKey).cards.push(card);
    });
    return [...byKey.values()].map(group => ({
      ...group,
      routes: [...group.routes.values()].sort((a, b) =>
        BigNumber(a.amount || 0).comparedTo(BigNumber(b.amount || 0)),
      ),
    }));
  }, [cards, invoice]);
  const routeOf = useCallback(
    group =>
      group.routes.find(route => route.key === chosenRoutes[group.key]) ||
      group.routes[0],
    [chosenRoutes],
  );
  const direct = groups.filter(group => !group.conversion);
  const converted = groups.filter(group => group.conversion);

  const rateOf = useCallback(
    (coin, wallet) => {
      const fiatChannel = wallet?.api_channels?.[API_GET_FIATPRICE];
      return fiatChannel == null
        ? null
        : rates?.[fiatChannel]?.[coin.id]?.[displayCurrency] ?? null;
    },
    [displayCurrency, rates],
  );
  const marketKey = (group, route) => `${group.key}|${route.key}`;

  // The market price of each chosen basket, from a small sample trade, as
  // Send measures it: the requested currency per unit of the paying one.
  useEffect(() => {
    if (invoice.anyAmount) return;
    converted.forEach(group => {
      const route = routeOf(group);
      const key = marketKey(group, route);
      if (requestedMarkets.current.has(key)) return;
      requestedMarkets.current.add(key);
      const wallet = route.cards[0]?.option.wallet;
      const channel = wallet?.api_channels?.[API_SEND];
      const sample = getSampleAmount(rateOf(group.coin, wallet));
      Promise.resolve()
        .then(() =>
          estimateConversion(
            channel?.split('.')[2] || group.coin.system_id || group.coin.id,
            group.coin.currency_id || group.coin.id,
            invoice.currencyId,
            sample,
            route.via || undefined,
            false,
          ),
        )
        .then(result => {
          const output = BigNumber(result?.result?.estimatedcurrencyout);
          return !result?.error && output.isFinite() && output.isGreaterThan(0)
            ? output.dividedBy(sample).toString()
            : null;
        })
        .catch(() => null)
        .then(price => setMarkets(current => ({...current, [key]: price})));
    });
  }, [converted, invoice.anyAmount, invoice.currencyId, rateOf, routeOf]);

  // What the chosen basket costs against the market price.
  const priceOf = group => {
    const route = routeOf(group);
    const market = markets[marketKey(group, route)];
    const summary = invoice.anyAmount
      ? {}
      : getConversionPriceSummary({
          amount: route.amount,
          displayCurrency,
          marketPrice: market,
          output: invoice.amountDisplay,
          pay: true,
          rate: rateOf(group.coin, route.cards[0]?.option.wallet),
          sourceTicker: group.coin.display_ticker,
          targetTicker: invoice.ticker,
        });
    return {route, market, ...summary};
  };

  const pay = useCallback(
    (card, {replace = false} = {}) => {
      const {option} = card;
      const coin = option.coinObj;
      const wallet = option.wallet;
      const channel = wallet.api_channels?.[API_SEND];
      let destination;
      try {
        destination = getVerusPayInvoicePaymentDestination(
          invoice.details,
          activeAccount,
          coin,
          wallet,
        );
      } catch (destinationError) {
        setPayError(destinationError.message);
        return;
      }
      setPayError(null);

      const sourceNetworkId = channel?.split('.')[2] || coin.system_id || coin.id;
      const sendTarget = buildSendTarget({}, coin, sourceNetworkId);
      const directRoute = sendTarget.routes[0];
      const target = option.conversion
        ? {
            id: invoice.currencyId,
            coinId: invoice.coinId,
            transactionCurrency: invoice.currencyId,
            fullyqualifiedname: invoice.currencyFqn,
            convertToFqn: invoice.currencyFqn,
            name: invoice.currencyName,
            ticker: invoice.ticker,
            isConversion: true,
            routes: [],
          }
        : sendTarget;
      const route = option.conversion || option.exportTo
        ? {
            ...directRoute,
            key: `invoice:${option.viaCurrencyId || 'direct'}:${option.exportTo || 'local'}`,
            exportTo: option.exportTo || null,
            exportToFqn: option.exportTo || null,
            via: getVia(option, invoice),
            viaFqn: getVia(option, invoice) ? option.via || null : null,
            isCrossChain: Boolean(option.exportTo),
            addressType: ADDRESS_TYPE.VERUS,
          }
        : directRoute;
      const group = groups.find(item =>
        item.routes.some(route => route.cards.includes(card)),
      );
      const chosenRoute = group?.routes.find(item => item.cards.includes(card));
      const severalCards = chosenRoute?.cards.length > 1;
      const market = group && chosenRoute ? markets[marketKey(group, chosenRoute)] : null;

      setSource(
        {
          sourceCoin: coin,
          sourceSubWallet: wallet,
          sourceBalance: String(card.balanceDisplay === '-' ? 0 : card.balanceDisplay),
          channel,
          payFromLabel: severalCards ? getPayFromLabel(wallet) : null,
        },
        target,
        route,
      );
      if (option.conversion && market) setMarketPrice(market);
      if (!invoice.anyAmount) {
        const amount = BigNumber(option.amount);
        setAmount(
          amount.toFixed(),
          coinsToSats(amount).toString(),
          null,
          amount.toFixed(),
          false,
        );
      }
      setRecipient(destination);

      const next = invoice.anyAmount
        ? 'SendWizardAmount'
        : invoice.anyDestination
        ? 'SendWizardRecipient'
        : 'SendWizardConfirm';
      if (replace) navigation.replace(next);
      else navigation.navigate(next);
    },
    [
      activeAccount,
      groups,
      invoice,
      markets,
      navigation,
      setAmount,
      setMarketPrice,
      setRecipient,
      setSource,
    ],
  );

  // Nothing to choose: one card, no conversion. Confirm takes this step's place.
  useEffect(() => {
    if (skipped.current || loading || conversionError) return;
    if (invoice.acceptsConversion || cards.length !== 1) return;
    skipped.current = true;
    pay(cards[0], {replace: true});
  }, [cards, conversionError, invoice.acceptsConversion, loading, pay]);

  const choose = group => {
    const route = routeOf(group);
    if (route.cards.length === 1) pay(route.cards[0]);
    else {
      setCardGroup({...group, cards: route.cards});
      setCardSheetVisible(true);
    }
  };

  const openPrice = group => {
    setPriceGroup(group);
    setPriceSheetVisible(true);
  };

  const renderGroup = group => {
    const ticker = group.coin.display_ticker;
    const {route, impact, level} = group.conversion
      ? priceOf(group)
      : {route: routeOf(group)};
    const balance = route.cards.reduce(
      (total, card) =>
        total.plus(card.balanceDisplay === '-' ? 0 : BigNumber(card.balanceDisplay)),
      BigNumber(0),
    );
    const from =
      route.cards.length > 1
        ? null
        : getPayFromLabel(route.cards[0].option.wallet);
    const detail = [from, `Balance\u00a0${truncateDecimal(balance, 4)}\u00a0${ticker}`].filter(Boolean).join(
      ' · ',
    );
    // As on Send's Amount step: a chip when the impact is at least 0.1% or
    // there is more than one basket; "Details" for unknown or non-positive impact.
    const showChip =
      group.conversion &&
      !invoice.anyAmount &&
      (group.routes.length > 1 ||
        (impact != null && level !== IMPACT_LEVEL.NONE));
    const chipLabel =
      impact == null || impact.isLessThanOrEqualTo(0)
        ? 'Details'
        : getImpactBadgeLabel(impact, true);
    const cost = invoice.anyAmount
      ? ''
      : formatCost(route.amount, ticker, group.conversion);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Pay with ${group.coin.display_name}, ${cost}, ${detail}${
          showChip ? `, price impact ${chipLabel}` : ''
        }`}
        accessibilityActions={
          showChip ? [{name: 'priceRoute', label: 'Price and route'}] : undefined
        }
        onAccessibilityAction={event => {
          if (event.nativeEvent.actionName === 'priceRoute') openPrice(group);
        }}
        key={group.key}
        onPress={() => choose(group)}
        style={({pressed}) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.logo}>
          <AssetCoinLogo coinId={group.coin.id} size={38} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[theme.typography.titleRow, styles.name, {color: theme.colors.textPrimary}]}>
              {group.coin.display_name}
            </Text>
            {cost ? (
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                numberOfLines={1}
                style={[styles.cost, {color: theme.colors.textPrimary}]}>
                {cost}
              </Text>
            ) : null}
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detail, {color: theme.colors.textSecondary}]}>
              {detail}
            </Text>
            {showChip ? (
              <ImpactChip
                accessibilityLabel={`Price impact ${chipLabel}. Opens price and route`}
                hitSlop={8}
                label={chipLabel}
                level={level}
                onPress={() => openPrice(group)}
                style={styles.chip}
              />
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  // "Price and route" for one currency: every basket with what it costs, the
  // cheapest first, and the chosen basket's price facts.
  const priceSheet = (() => {
    if (!priceGroup) return null;
    const group = groups.find(item => item.key === priceGroup.key) || priceGroup;
    const {route, market, impact, level, loss} = priceOf(group);
    const ticker = group.coin.display_ticker;
    const toSheetRoute = item => ({
      key: item.key,
      via: item.via,
      viaFqn: item.viaName,
    });
    return {
      group,
      props: {
        baskets: group.routes.map((item, index) => {
          return {
            route: toSheetRoute(item),
            subtitle: `≈ ${formatEstimatedAmount(item.amount || 0)} ${ticker}`,
            badgeLabel: index === 0 ? 'Best price' : null,
            isBest: index === 0,
          };
        }),
        cryptoAmount: route.amount,
        displayCurrency,
        estimatedOutput: invoice.amountDisplay,
        priceImpact: {impact, level, loss, marketPrice: market || null},
        rate: rateOf(group.coin, route.cards[0]?.option.wallet),
        route: toSheetRoute(route),
        sourceCoin: group.coin,
        target: {ticker: invoice.ticker, isConversion: true, routes: []},
      },
    };
  })();

  const groupTitle = title => (
    <Text style={[styles.groupTitle, {color: theme.colors.textSecondary}]}>
      {title}
    </Text>
  );

  return (
    <WizardScreen scroll={false}>
      <FadedScrollView
        containerStyle={styles.viewport}
        contentContainerStyle={styles.content}
        fadeBackgroundColor={theme.colors.background}>
        {flow.onOpenInAnotherApp ? (
          <OpenInAnotherWalletAction
            compact
            onPress={flow.onOpenInAnotherApp}
            style={styles.otherAppAction}
          />
        ) : null}
        <RequestCard
          action="wants you to pay"
          requester={flow.requester}
          sections={flow.requesterSections}
          style={styles.requestCard}
        />
        <View style={styles.slip}>
          <InvoiceSlip
            amount={invoice.amountDisplay ?? 'Any amount'}
            destination={invoice.destinationDisplay}
            fiat={invoice.fiat}
            signer={invoice.signer}
            unit={invoice.amountDisplay == null ? '' : invoice.ticker}
          />
        </View>
        {payError ? <ErrorMessage>{payError}</ErrorMessage> : null}
        {loading && groups.length === 0 ? (
          <SkeletonLoader accessibilityLabel="Finding ways to pay">
            {[0, 1].map(index => (
              <View key={index} style={styles.row}>
                <SkeletonBlock height={38} radius={19} width={38} />
                <View style={[styles.copy, styles.skeletonCopy]}>
                  <SkeletonBlock height={16} width="55%" />
                  <SkeletonBlock height={13} width="75%" />
                </View>
              </View>
            ))}
          </SkeletonLoader>
        ) : groups.length === 0 && !conversionError ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, {color: theme.colors.textPrimary}]}>
              No way to pay this invoice
            </Text>
            <Text style={[styles.emptyBody, {color: theme.colors.textSecondary}]}>
              No address has enough of a currency this invoice accepts.
            </Text>
          </View>
        ) : (
          <>
            {direct.length ? groupTitle('Pay directly') : null}
            {direct.map(renderGroup)}
            {converted.length || conversionError ? groupTitle('Pay with conversion') : null}
            {converted.map(renderGroup)}
            {conversionError ? (
              <View>
                <ErrorMessage>Conversion options didn’t load.</ErrorMessage>
                <TextAction onPress={onRetryConversions}>
                  Try again
                </TextAction>
              </View>
            ) : null}
          </>
        )}
      </FadedScrollView>
      {priceSheet ? (
        <PriceRouteSheet
          {...priceSheet.props}
          onClose={() => setPriceSheetVisible(false)}
          onClosed={() => setPriceGroup(null)}
          onSelect={item =>
            setChosenRoutes(current => ({
              ...current,
              [priceSheet.group.key]: item.key,
            }))
          }
          onUseSuggestion={() => {}}
          pay
          visible={priceSheetVisible}
        />
      ) : null}
      <SourceCardSheet
        cards={(cardGroup?.cards || []).map(card => ({
          card: card.option.wallet,
          coin: card.option.coinObj,
          balance: card.balanceDisplay === '-' ? '0' : card.balanceDisplay,
          invoiceCard: card,
        }))}
        selectedId={state.sourceSubWallet?.id}
        visible={cardSheetVisible}
        onClose={() => setCardSheetVisible(false)}
        onClosed={() => setCardGroup(null)}
        onSelect={source => pay(source.invoiceCard)}
      />
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  viewport: {flex: 1},
  content: {paddingTop: WIZARD_CONTENT_TOP_INSET, paddingBottom: 24},
  otherAppAction: {marginRight: WIZARD_CONTENT_INSET},
  requestCard: {marginHorizontal: WIZARD_CONTENT_INSET},
  slip: {marginHorizontal: WIZARD_CONTENT_INSET, marginBottom: 8},
  groupTitle: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingTop: 16,
    paddingBottom: 4,
    fontSize: 14,
    lineHeight: 20,
    ...fontStyle('semiBold'),
  },
  row: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {opacity: 0.7},
  logo: {width: 38, height: 38, marginRight: 16},
  copy: {flex: 1, minWidth: 0},
  skeletonCopy: {gap: 8},
  titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  // The name keeps its width (up to half the row); the cost shrinks first.
  name: {flexShrink: 0, maxWidth: '50%'},
  cost: {flexShrink: 1, minWidth: 0, marginLeft: 12, textAlign: 'right', fontSize: 16, lineHeight: 22, ...fontStyle('semiBold')},
  detailRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 4},
  detail: {flex: 1, fontSize: 14, lineHeight: 20, ...fontStyle('regular')},
  // The chip keeps the row's rhythm; its hit slop keeps a 44-point target.
  chip: {minHeight: 20, marginLeft: 8},
  empty: {paddingHorizontal: 24, paddingTop: 32, alignItems: 'center'},
  emptyTitle: {fontSize: 17, lineHeight: 22, textAlign: 'center', ...fontStyle('semiBold')},
  emptyBody: {fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8, ...fontStyle('regular')},
});

export default InvoicePayWith;

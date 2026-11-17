import React, {useState} from 'react';
import {Platform, ScrollView, StyleSheet, Text, View} from 'react-native';
import BigNumber from 'bignumber.js';
import InfoSheet from '../../components/InfoSheet';
import {InfoSheetRow} from '../../components/InfoSheetSection';
import StatusBadge from '../../components/StatusBadge';
import {useOnboardingTheme} from '../../theme/onboarding';
import {formatLaunchWhen} from '../../utils/preconversion/launchFacts';
import {FlatRow} from '../SendWizard/components/WizardUI';
import {getCurrencyDisplay} from '../SendWizard/wizardUtils';
import {FocusedTransactionRow} from './Overview/Overview';
import TransactionDetailsSheet, {
  formatTransactionDate,
} from './Overview/TransactionDetailsSheet';

const MONOSPACE_FONT = Platform.select({ios: 'Menlo', default: 'monospace'});

// A reserve that is not one of the wallet's assets takes the daemon's name.
const tickerOf = (currencyId, names) =>
  getCurrencyDisplay(currencyId, names?.[currencyId]).ticker;
const formatAmount = (amount, currencyId, names) =>
  `${BigNumber(amount).decimalPlaces(8, BigNumber.ROUND_DOWN).toFormat()} ${tickerOf(currencyId, names)}`;
const formatAmounts = (items, names) =>
  items.map(item => formatAmount(item.amount, item.currencyId, names)).join('\n');

// The facts that matter less before a pre-conversion: identifiers, the start
// block, what the currency holds and its supply.
const LaunchDetailsSheet = ({coin, facts, onClose, visible}) => {
  const reserves = facts.reserves
    .map(reserve =>
      reserve.weight == null
        ? tickerOf(reserve.currencyId, facts.names)
        : `${tickerOf(reserve.currencyId, facts.names)} ${BigNumber(reserve.weight).times(100).decimalPlaces(2).toFormat()}%`,
    )
    .join('\n');

  return (
    <InfoSheet onClose={onClose} title="Launch details" visible={visible}>
      <InfoSheetRow
        copy
        label="Currency ID"
        value={facts.currencyId}
        valueStyle={styles.identifier}
      />
      {facts.startBlock ? (
        <InfoSheetRow
          label="Launch block"
          value={BigNumber(facts.startBlock).toFormat()}
        />
      ) : null}
      {reserves ? <InfoSheetRow label="Holds" value={reserves} /> : null}
      {facts.initialSupply ? (
        <InfoSheetRow
          label="Supply at launch"
          value={`${BigNumber(facts.initialSupply).toFormat()} ${coin.display_ticker}`}
        />
      ) : null}
      {facts.maximums.length ? (
        <InfoSheetRow label="Maximum" value={formatAmounts(facts.maximums, facts.names)} />
      ) : null}
    </InfoSheet>
  );
};

// The asset screen of a currency before its launch: when it launches, the
// minimum it needs, and each pre-conversion this wallet sent to it. The
// pre-converted funds arrive at the launch, at the launch price.
const PrelaunchAssetPanel = ({coin, prelaunch, showBalance}) => {
  const theme = useOnboardingTheme();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const {facts, preconversions, totals} = prelaunch;
  // One pre-conversion already shows its amount in its row. A total helps
  // only when there are several.
  const showTotal = (preconversions?.length || 0) > 1;

  const openTransaction = item => {
    setTransaction({
      address: item.destination,
      amount: BigNumber(item.amount).decimalPlaces(8, BigNumber.ROUND_DOWN).toFixed(),
      copyAmount: BigNumber(item.amount).toFixed(),
      coinId: getCurrencyDisplay(item.currencyId).coinId,
      confirmed: !item.pending,
      label: 'You pre-converted',
      pending: item.pending,
      ticker: tickerOf(item.currencyId, facts.names),
      timestamp: item.timestamp,
      txid: item.txid,
    });
    setTransactionOpen(true);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inset}>
          <StatusBadge label="Pre-launch" style={styles.badge} />
          <View style={[styles.rows, {borderTopColor: theme.colors.border}]}>
            {showTotal ? (
              <FlatRow
                label="You pre-converted"
                numberOfLines={0}
                value={showBalance ? formatAmounts(totals, facts.names) : 'Balance hidden'}
              />
            ) : null}
            <FlatRow label="Launches" value={formatLaunchWhen(facts) || '—'} />
            {facts.minimums.length ? (
              <FlatRow
                label="Needed to launch"
                numberOfLines={0}
                value={formatAmounts(facts.minimums, facts.names)}
              />
            ) : null}
            <FlatRow label="Details" onPress={() => setDetailsOpen(true)} />
          </View>
        </View>
        {preconversions == null ? (
          <Text style={[theme.typography.bodySm, styles.message, {color: theme.colors.textSecondary}]}>
            Your pre-conversions could not be loaded.
          </Text>
        ) : (
          preconversions.map(item => (
            <FocusedTransactionRow
              key={`${item.txid}:${item.vout}:${item.currencyId}`}
              amount={BigNumber(item.amount).decimalPlaces(8, BigNumber.ROUND_DOWN).toFormat()}
              amountSign=""
              counterparty="Pre-conversion"
              counterpartyIsAddress={false}
              fiatValue={null}
              incoming={false}
              onPress={() => openTransaction(item)}
              pending
              showBalance={showBalance}
              statusLabel={item.pending ? 'Pending' : 'Waiting for launch'}
              ticker={tickerOf(item.currencyId, facts.names)}
              timestamp={formatTransactionDate(item.timestamp)}
            />
          ))
        )}
      </ScrollView>
      <LaunchDetailsSheet
        coin={coin}
        facts={facts}
        onClose={() => setDetailsOpen(false)}
        visible={detailsOpen}
      />
      <TransactionDetailsSheet
        details={transaction}
        showBalance={showBalance}
        onClose={() => setTransactionOpen(false)}
        onClosed={() => setTransaction(null)}
        visible={transactionOpen}
      />
    </>
  );
};

const styles = StyleSheet.create({
  content: {paddingBottom: 24},
  inset: {paddingHorizontal: 16},
  badge: {alignSelf: 'flex-start', marginTop: 4},
  rows: {marginTop: 16, marginBottom: 16, borderTopWidth: StyleSheet.hairlineWidth},
  message: {paddingHorizontal: 16},
  identifier: {fontFamily: MONOSPACE_FONT, fontSize: 12, lineHeight: 17},
});

export default PrelaunchAssetPanel;

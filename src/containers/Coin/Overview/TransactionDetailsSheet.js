import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {ExternalLink} from 'lucide-react-native';
import InfoSheet from '../../../components/InfoSheet';
import {InfoSheetRow} from '../../../components/InfoSheetSection';
import SignedOutActionRow from '../../../components/SignedOutActionRow';
import StatusBadge, {STATUS_BADGE_TONE} from '../../../components/StatusBadge';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {openUrl} from '../../../utils/linking';
import {TransferNode} from '../../SendWizard/components/TransferSummary';

const MONOSPACE_FONT = Platform.select({ios: 'Menlo', default: 'monospace'});

export const formatTransactionDate = timestamp => {
  const numericTimestamp = Number(timestamp);
  if (timestamp == null || !Number.isFinite(numericTimestamp)) return null;

  const date = new Date(
    numericTimestamp < 1000000000000
      ? numericTimestamp * 1000
      : numericTimestamp,
  );
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Some light wallet transaction IDs arrive as comma-separated bytes.
export const decodeTxid = txid => {
  if (txid == null) return null;
  const parts = String(txid).split(',');
  if (parts.length < 2) return String(txid);
  try {
    return Buffer.from(parts.map(Number)).toString('hex');
  } catch (e) {
    return String(txid);
  }
};

// Opened from a Coin Overview history row. It follows the Sent step: the
// amount as a transfer node, then one row per fact. The explorer row shows
// only when the coin has an explorer.
const TransactionDetailsSheet = ({details, onClose, onClosed, showBalance, visible}) => {
  const theme = useOnboardingTheme();
  const addresses = details?.address
    ? String(details.address).split(' & ')
    : [];
  const confirmationCount = details?.confirmations;
  const hasConfirmationCount = (typeof confirmationCount === 'number' || typeof confirmationCount === 'string') &&
    String(confirmationCount).trim() !== '' &&
    Number.isSafeInteger(Number(confirmationCount)) && Number(confirmationCount) >= 0;

  return (
    <InfoSheet
      headerAccessory={
        details?.pending ? (
          <StatusBadge label="Pending" tone={STATUS_BADGE_TONE.WARNING} />
        ) : details?.confirmed ? (
          <StatusBadge label="Confirmed" tone={STATUS_BADGE_TONE.SUCCESS} />
        ) : null
      }
      onClose={onClose}
      onClosed={onClosed}
      subtitle={formatTransactionDate(details?.timestamp)}
      title="Transaction"
      visible={visible}>
      {details ? (
        <View testID="transaction-details-sheet">
          <View style={styles.summary}>
            <TransferNode
              amount={details.amount}
              coinId={details.coinId}
              copyValue={details.copyAmount}
              fiat={details.fiat}
              hideAmounts={!showBalance}
              label={details.label}
              ticker={details.ticker}
            />
          </View>
          <View style={[styles.rows, {borderTopColor: theme.colors.border}]}>
            {details.registrationName ? (
              <InfoSheetRow longPressCopy copyValue={details.registrationName} label="VerusID" value={details.registrationName} />
            ) : null}
            {addresses.length || details.destinationLabel ? (
              <InfoSheetRow
                longPressCopy
                copyValue={addresses.length ? addresses.join('\n') : details.destinationLabel}
                copy={addresses.length === 1}
                label={addresses.length && details.destinationLabel ? `To ${details.destinationLabel}` : 'To'}
                value={addresses.length ? addresses.join('\n') : details.destinationLabel}
                valueStyle={addresses.length ? styles.identifier : undefined}
              />
            ) : null}
            {hasConfirmationCount ? (
              <InfoSheetRow longPressCopy copyValue={String(confirmationCount)} label="Confirmations" value={String(confirmationCount)} />
            ) : null}
            {details.fee != null ? (
              <InfoSheetRow
                longPressCopy
                copyValue={details.copyFee}
                label="Network fee"
                value={details.fee}
                valueHidden={!showBalance}
                valueUnit={details.feeTicker}
              />
            ) : null}
            {details.memo ? (
              <InfoSheetRow longPressCopy copyValue={details.memo} copy label="Message" value={details.memo} />
            ) : null}
            {details.txid ? (
              <InfoSheetRow
                longPressCopy
                copyValue={details.txid}
                copy
                ellipsizeMode="middle"
                label="Transaction ID"
                numberOfLines={1}
                selectable={false}
                value={details.txid}
                valueStyle={styles.identifier}
              />
            ) : null}
          </View>
          {details.explorerUrl ? (
            <SignedOutActionRow
              IconComponent={ExternalLink}
              label="View in explorer"
              onPress={() => openUrl(details.explorerUrl)}
              testID="transaction-details-explorer"
            />
          ) : null}
        </View>
      ) : null}
    </InfoSheet>
  );
};

const styles = StyleSheet.create({
  summary: {paddingBottom: 12},
  rows: {borderTopWidth: StyleSheet.hairlineWidth},
  // The Sent step's ID size: a full R-address fits one line on an iPhone SE.
  identifier: {fontFamily: MONOSPACE_FONT, fontSize: 12, lineHeight: 17},
});

export default TransactionDetailsSheet;

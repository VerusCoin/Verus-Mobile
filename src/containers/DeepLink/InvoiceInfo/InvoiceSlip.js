import React, {useState} from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import Svg, {Line, Path} from 'react-native-svg';
import StatusBadge from '../../../components/StatusBadge';
import {fontStyle} from '../../../globals/fonts';
import {VerusPayTextLogo} from '../../../images/customIcons';
import {paymentRequestSlipStyles as styles} from '../../../styles';
import {PAYMENT_REQUEST_PAPER as paper} from '../../../styles/components/paymentRequestSlip.styles';
import {getTicketOutline} from '../../../utils/ticketOutline';

const STUB_HEIGHT = 68;
const STUB_HEIGHT_COMPACT = 62;

// The payer's side of a VerusPay invoice: the same paper slip that "Request
// ready" shows to the requester (owner choice, 2026-10-21), without the QR.
// The stub names the VerusID that signed it, larger than the rest, because a
// name only shows for a signed invoice (owner, 2026-10-22). An unsigned
// invoice has the "Unsigned" badge and shows its destination instead.
const InvoiceSlip = ({amount, unit, fiat, signer, destination}) => {
  // Small windows use the slip's compact face, as on Request ready.
  const compact = useWindowDimensions().height <= 667;
  const [size, setSize] = useState({width: 0, height: 0});
  const [perforation, setPerforation] = useState(0);
  const {width: w, height: h} = size;
  const p = perforation;
  const outline = getTicketOutline(w, h, p, undefined, signer ? 0 : undefined);

  return (
    <View
      accessible
      accessibilityLabel={`Invoice for ${amount} ${unit}${
        signer ? '' : ', unsigned'
      }`}
      onLayout={event => setSize(event.nativeEvent.layout)}
      style={styles.frame}>
      {w > 0 && h > 0 && p > 0 ? (
        <Svg
          accessible={false}
          height={h}
          pointerEvents="none"
          style={styles.outline}
          width={w}>
          <Path
            d={outline}
            fill={paper.background}
            stroke={paper.outline}
            strokeWidth={1}
          />
          {!signer && <Line
            x1={25}
            x2={w - 25}
            y1={p}
            y2={p}
            stroke={paper.perforation}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeDasharray="1 6"
          />}
        </Svg>
      ) : null}
      <View
        onLayout={event => setPerforation(event.nativeEvent.layout.height)}
        style={[styles.face, compact && styles.faceCompact]}>
        <View style={styles.top}>
          <VerusPayTextLogo
            accessibilityLabel="VerusPay"
            height={20}
            width={103}
          />
          {signer ? null : (
            <StatusBadge label="Unsigned" tone="neutral" variant="paper" />
          )}
        </View>
        <View style={styles.amountRow}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.4}
            numberOfLines={1}
            style={[styles.amount, compact && styles.amountCompact]}>
            {amount}
          </Text>
          <Text numberOfLines={1} style={styles.unit}>
            {unit}
          </Text>
        </View>
        {fiat ? <Text style={styles.estimate}>≈ {fiat}</Text> : null}
      </View>
      {!signer && <View style={[localStyles.stub, compact && localStyles.stubCompact]}>
        <Text style={localStyles.stubLabel}>To</Text>
        <Text
          ellipsizeMode="middle"
          numberOfLines={1}
          style={[
            localStyles.stubValue,
            !signer && localStyles.stubIdentifier,
            !signer && styles.identifier,
          ]}>
          {destination}
        </Text>
      </View>}
    </View>
  );
};

const localStyles = StyleSheet.create({
  stub: {
    height: STUB_HEIGHT,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  stubCompact: {height: STUB_HEIGHT_COMPACT},
  stubLabel: {
    color: paper.secondary,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  // The gift card's name size (17-point semibold), so the requester reads as
  // the slip's second fact after the amount.
  stubValue: {
    color: paper.primary,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.2,
    ...fontStyle('semiBold'),
  },
  stubIdentifier: {fontSize: 14, lineHeight: 22, letterSpacing: 0, ...fontStyle('regular')},
});

export default InvoiceSlip;

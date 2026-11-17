import React, {useState} from 'react';
import {Text, useWindowDimensions, View} from 'react-native';
import Svg, {Line, Path} from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import StatusBadge from '../../components/StatusBadge';
import {ONBOARDING_SMALL_DEVICE_MAX_HEIGHT} from '../../hooks/useOnboardingSmallDeviceLayout';
import {VerusPayTextLogo} from '../../images/customIcons';
import {paymentRequestSlipStyles as styles} from '../../styles';
import {PAYMENT_REQUEST_PAPER as paper} from '../../styles/components/paymentRequestSlip.styles';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {getTicketOutline} from '../../utils/ticketOutline';

const PaymentRequestSlip = ({isSmall, qrRef, snapshot}) => {
  const {height: windowHeight} = useWindowDimensions();
  const compactWindow = windowHeight <= ONBOARDING_SMALL_DEVICE_MAX_HEIGHT;
  const compact = isSmall || compactWindow;
  const showVerusIcon = snapshot.conversion && snapshot.showVerusIcon;
  const [size, setSize] = useState({width: 0, height: 0});
  const [perforation, setPerforation] = useState(0);
  const {width: w, height: h} = size;
  const p = perforation;
  // Two true half-round cut-outs, rather than circles painted over the paper.
  // Size the amount from the slip width so a long amount stays on one line,
  // and keep the unit smaller than the number (Inter bold digits ~0.64 em,
  // the semibold unit ~0.62 em per character, 8 pt gap, 22 pt side padding).
  const amountText = String(snapshot.displayAmount ?? snapshot.amountText ?? '');
  const unitText = String(snapshot.displayUnit ?? snapshot.currency ?? '');
  const baseAmountSize = compact ? 38 : 44;
  const amountRoom = Math.max(0, w - 44 - 8);
  const fitAmount = unitSize =>
    Math.floor(
      (amountRoom - unitText.length * unitSize * 0.62) /
        (Math.max(amountText.length, 1) * 0.64),
    );
  let unitSize = 20;
  let amountSize = w > 0 ? Math.min(baseAmountSize, fitAmount(unitSize)) : baseAmountSize;
  if (w > 0 && amountSize < unitSize * 1.4) {
    unitSize = Math.max(12, Math.round(amountSize * 0.6));
    amountSize = Math.min(baseAmountSize, fitAmount(unitSize));
  }
  const amountSizeStyle =
    amountSize < baseAmountSize
      ? {fontSize: amountSize, lineHeight: amountSize + 6, letterSpacing: -0.5}
      : null;
  const unitSizeStyle =
    unitSize < 20 ? {fontSize: unitSize, lineHeight: unitSize + 6} : null;
  const outline = getTicketOutline(w, h, p);

  return (
    <View
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
          <Line
            x1={25}
            x2={w - 25}
            y1={p}
            y2={p}
            stroke={paper.perforation}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeDasharray="1 6"
          />
        </Svg>
      ) : null}
      <View
        onLayout={event => setPerforation(event.nativeEvent.layout.height)}
        style={[styles.face, compact && styles.faceCompact, compactWindow && styles.faceTight]}>
        <View style={styles.top}>
          {snapshot.conversion ? (
            <>
              <VerusPayTextLogo
                accessibilityLabel="VerusPay"
                height={20}
                width={103}
              />
              <StatusBadge
                label={snapshot.allowConversion ? 'Conversions allowed' : 'No conversions'}
                tone={snapshot.allowConversion ? 'success' : 'neutral'}
                variant="paper"
              />
            </>
          ) : (
            <View style={styles.asset}>
              <AssetCoinLogo coinId={snapshot.coinId} size={20} />
              <Text style={styles.assetName}>{snapshot.assetName}</Text>
            </View>
          )}
        </View>
        <View style={[styles.amountRow, compactWindow && styles.amountRowCompact]}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.25}
            numberOfLines={1}
            style={[styles.amount, compact && styles.amountCompact, amountSizeStyle]}>
            {amountText}
          </Text>
          <Text numberOfLines={1} style={[styles.unit, unitSizeStyle]}>
            {unitText}
          </Text>
        </View>
        {snapshot.fiatEstimate ? (
          <Text style={styles.estimate}>{snapshot.fiatEstimate}</Text>
        ) : null}
      </View>
      <View style={[styles.stub, compactWindow && styles.stubCompact]}>
        <View style={styles.qrTile}>
          <QRCode
            getRef={ref => { qrRef.current = ref; }}
            logo={showVerusIcon ? require('../../images/customIcons/Verus.png') : undefined}
            logoBackgroundColor={paper.qrBackground}
            logoBorderRadius={80}
            logoSize={showVerusIcon ? 48 : undefined}
            size={compact ? 160 : 200}
            value={snapshot.qrString}
          />
        </View>
        <Text
          ellipsizeMode="middle"
          numberOfLines={1}
          style={[styles.address, compactWindow && styles.addressCompact, !snapshot.identityName && styles.identifier]}>
          {snapshot.identityName || snapshot.address}
        </Text>
      </View>
    </View>
  );
};

export default PaymentRequestSlip;

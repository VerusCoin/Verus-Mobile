import React, {useState} from 'react';
import {StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import StatusBadge from '../../../../components/StatusBadge';
import {fontStyle} from '../../../../globals/fonts';
import {getGiftCardContentText} from '../../../../utils/giftCard/giftCardPresentation';
import {getTicketOutline} from '../../../../utils/ticketOutline';

const WALLET_CARD_WIDTH = 360;
const WALLET_CARD_HEIGHT = 227;
const CARD_ASPECT_RATIO = WALLET_CARD_WIDTH / WALLET_CARD_HEIGHT;
// The card material. The "Claiming funds" screen draws a small card with it.
export const GIFT_CARD_FRONT = '#26313A';
export const GIFT_CARD_STROKE = 'rgba(255,255,255,0.2)';
const CARD_FRONT = GIFT_CARD_FRONT;
const CARD_TEXT = '#F4F1E9';
const CARD_TEXT_MUTED = 'rgba(244,241,233,0.72)';
// The muted text at the 0.55 opacity of a pending amount.
const CARD_TEXT_PENDING = 'rgba(244,241,233,0.4)';
const COMPACT_CARD_WIDTH = 330;

// The gift card as one fixed face: name and status on top, contents at the
// bottom. It keeps the earlier flip card's material; its outline, amount and
// unit match the payment slip (owner, 2026-10-22).
const GiftCardFixedCard = ({presentation, style}) => {
  const {height: windowHeight, width: windowWidth} = useWindowDimensions();
  // Drawn in points from the measured size, so the corners and notches are the
  // payment slip's exact size; the notches sit at half height.
  const [size, setSize] = useState({width: 0, height: 0});
  // Narrow windows, and short ones like the payment slip's compact face, so
  // both show the same amount size on an iPhone SE.
  const compact =
    windowWidth - 40 < COMPACT_CARD_WIDTH || windowHeight <= 667;
  const {
    contentsPending,
    label,
    otherContents,
    pendingExtras,
    primaryContent,
    statusLabel,
    statusTone,
  } = presentation;
  const hasContent =
    primaryContent.type === 'currency' || primaryContent.type === 'identity';
  const otherText = otherContents.map(getGiftCardContentText).join(', ');
  const pendingText = pendingExtras.map(getGiftCardContentText).join(', ');
  const contentsText = [primaryContent, ...otherContents]
    .map(getGiftCardContentText)
    .join(', ');
  let contentsLabel = primaryContent.value;

  if (hasContent) {
    contentsLabel = contentsPending ? `Pending: ${contentsText}` : contentsText;
  }
  if (pendingText) contentsLabel = `${contentsLabel}. Pending: ${pendingText}`;

  return (
    <View
      accessible
      accessibilityLabel={`${label}. ${statusLabel}. ${contentsLabel}.`}
      onLayout={event => setSize(event.nativeEvent.layout)}
      style={[styles.frame, style]}>
      {size.width > 0 && size.height > 0 ? (
        <Svg
          accessible={false}
          height={size.height}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={size.width}>
          <Path
            d={getTicketOutline(size.width, size.height, size.height / 2)}
            fill={CARD_FRONT}
            stroke={GIFT_CARD_STROKE}
            strokeWidth="1"
          />
        </Svg>
      ) : null}
      <View style={styles.content}>
        <View style={styles.topline}>
          <Text numberOfLines={1} style={styles.name}>
            {label}
          </Text>
          <StatusBadge label={statusLabel} tone={statusTone} variant="card" />
        </View>

        <View style={styles.contents}>
          {hasContent ? (
            <View
              style={[styles.valueRow, contentsPending && styles.pending]}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                numberOfLines={1}
                style={[styles.value, compact && styles.valueCompact]}>
                {primaryContent.value}
              </Text>
              <Text numberOfLines={1} style={styles.unit}>
                {primaryContent.label}
              </Text>
            </View>
          ) : (
            <Text numberOfLines={1} style={styles.emptyText}>
              {primaryContent.value}
            </Text>
          )}
          <View style={styles.moreLine}>
            {otherText || pendingText ? (
              <Text
                numberOfLines={1}
                style={[styles.moreText, contentsPending && styles.pending]}>
                {`+ ${otherText}`}
                {pendingText ? (
                  <Text style={styles.pendingExtra}>
                    {otherText ? `, ${pendingText}` : pendingText}
                  </Text>
                ) : null}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: 20,
    shadowColor: '#07101F',
    shadowOffset: {width: 0, height: 14},
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  content: {
    flex: 1,
    paddingTop: 20,
    paddingRight: 22,
    paddingBottom: 18,
    paddingLeft: 24,
  },
  topline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    minWidth: 0,
    flexShrink: 1,
    color: CARD_TEXT,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    ...fontStyle('semiBold'),
  },
  contents: {
    marginTop: 'auto',
    gap: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  value: {
    minWidth: 0,
    flexShrink: 1,
    color: CARD_TEXT,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.8,
    ...fontStyle('bold'),
  },
  valueCompact: {
    fontSize: 38,
    lineHeight: 44,
  },
  unit: {
    flexShrink: 0,
    maxWidth: '45%',
    color: CARD_TEXT_MUTED,
    fontSize: 20,
    lineHeight: 26,
    ...fontStyle('semiBold'),
  },
  emptyText: {
    color: CARD_TEXT_MUTED,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    ...fontStyle('semiBold'),
  },
  moreLine: {
    minHeight: 34,
    justifyContent: 'center',
  },
  moreText: {
    color: CARD_TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  pending: {
    opacity: 0.55,
  },
  pendingExtra: {
    color: CARD_TEXT_PENDING,
  },
});

export default GiftCardFixedCard;

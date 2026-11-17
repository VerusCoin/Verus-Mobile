import React, {useEffect, useMemo} from 'react';
import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {ChevronDown, ChevronRight} from 'lucide-react-native';
import CardMaterial from '../../components/CardMaterial';
import CopyAction from '../../components/CopyAction';
import PrivacyBlurredText from '../../components/PrivacyBlurredText';
import StatusBadge from '../../components/StatusBadge';
import {fontStyle} from '../../globals/fonts';
import useReduceMotion from '../../hooks/useReduceMotion';
import {useOnboardingTheme} from '../../theme/onboarding';
import {buildOrderedAssetStack} from '../../utils/subwallet/assetStack';
import {truncateMiddle} from '../../utils/subwallet/cardPresentation';

const WHITE = '#FFFFFF';
const QUIET = 'rgba(255,255,255,0.86)';
const MONO = Platform.select({ios: 'Menlo', default: 'monospace'});

const CardBalance = ({
  card,
  showBalance,
  hero = false,
  compact,
  neutral = false,
  bar = false,
}) => {
  const theme = useOnboardingTheme();
  const color = neutral ? theme.colors.textPrimary : WHITE;
  const quiet = neutral ? theme.colors.textSecondary : QUIET;
  // As in the approved mockup: on a strip the sync badge sits left of the
  // amount on one line; on the front card it takes the fiat line.
  const syncBadge =
    !bar && card.syncStatus ? (
      <StatusBadge
        label={card.syncStatus}
        variant="card"
        style={[
          styles.sync,
          hero ? {marginTop: compact ? 4 : 5} : styles.stripSync,
        ]}
      />
    ) : null;
  const inlineSync = !hero && syncBadge != null;
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        hero ? styles.heroBalance : styles.stripBalance,
        inlineSync && styles.stripBalanceSync,
      ]}>
      {inlineSync ? syncBadge : null}
      <PrivacyBlurredText
        adjustsFontSizeToFit
        blurRadius={hero ? 10 : 5}
        color={color}
        containerStyle={[styles.balanceFrame, inlineSync && styles.shrink]}
        hidden={!showBalance && card.balance != null && !card.hasError}
        minimumFontScale={hero ? 0.6 : 0.8}
        numberOfLines={1}
        style={[
          styles.stripAmount,
          bar && theme.typography.titleRowCompact,
          hero && styles.heroAmount,
          hero && compact && styles.heroAmountCompact,
        ]}>
        {card.amountText}
      </PrivacyBlurredText>
      {syncBadge != null ? (
        inlineSync ? null : syncBadge
      ) : !bar && card.fiatText != null ? (
        <PrivacyBlurredText
          blurRadius={5}
          color={quiet}
          hidden={!showBalance}
          numberOfLines={1}
          containerStyle={hero ? {marginTop: compact ? 4 : 5} : undefined}
          style={[styles.stripFiat, hero && theme.typography.labelSm]}>
          {card.fiatText}
        </PrivacyBlurredText>
      ) : null}
    </View>
  );
};

const StackCard = ({
  item,
  index,
  count,
  compact,
  single,
  progress,
  sheetOpen,
  onCloseSheet,
  onSelect,
  onMore,
  moreRef,
  asset,
  reduceMotion,
}) => {
  const theme = useOnboardingTheme();
  const front = index === count - 1;
  const slice = compact ? 48 : 52;
  const radius = compact ? 22 : 24;
  const frontHeight = single ? (compact ? 70 : 74) : compact ? 126 : 140;
  const y = useSharedValue(index * slice);
  const height = useSharedValue(front ? frontHeight : slice + radius);
  const fade = useSharedValue(1);
  useEffect(() => {
    const target = index * slice;
    const nextHeight = front ? frontHeight : slice + radius;
    if (reduceMotion) {
      y.value = target;
      height.value = nextHeight;
      fade.value = 0;
      fade.value = withTiming(1, {
        duration: 140,
        reduceMotion: ReduceMotion.Never,
      });
    } else {
      y.value = withTiming(target, {duration: 400});
      height.value = withTiming(nextHeight, {duration: 400});
    }
  }, [fade, front, frontHeight, height, index, radius, reduceMotion, slice, y]);
  const animatedStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [height.value, 48]),
    opacity: fade.value * (front ? 1 : 1 - progress.value),
    transform: [
      {
        translateY:
          y.value * (1 - progress.value) + (compact ? 4 : 6) * progress.value,
      },
    ],
  }));
  const normalStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - progress.value * 3),
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, (progress.value - 0.3) / 0.7),
  }));
  const neutral = Boolean(item.hidden);
  const card = neutral ? asset.summary(item.hidden) : item.card;
  const title = neutral ? `${item.hidden.length} more` : card.title;
  const color = neutral ? theme.colors.textPrimary : WHITE;
  const label = `${title}${front ? ', selected' : ''}, ${card.balanceLabel}`;

  return (
    <Animated.View
      pointerEvents={sheetOpen && !front ? 'none' : 'auto'}
      accessibilityElementsHidden={sheetOpen && !front}
      importantForAccessibility={
        sheetOpen && !front ? 'no-hide-descendants' : 'auto'
      }
      style={[
        styles.card,
        {
          borderRadius: radius,
          zIndex: index + 1,
          shadowColor: theme.isDark ? '#000000' : '#080E1C',
          shadowOpacity: theme.isDark ? 0.5 : 0.2,
          backgroundColor: neutral
            ? theme.isDark
              ? '#213755'
              : '#E6EBF2'
            : card.colors[0],
        },
        animatedStyle,
      ]}>
      <View
        style={[
          styles.materialClip,
          {
            borderRadius: radius,
            backgroundColor: neutral
              ? theme.isDark
                ? '#213755'
                : '#E6EBF2'
              : card.colors[0],
          },
        ]}>
        {!neutral ? (
          <CardMaterial
            colors={card.colors}
            radius={radius}
            height={frontHeight}
          />
        ) : null}
        <Animated.View
          pointerEvents={sheetOpen ? 'none' : 'auto'}
          accessibilityElementsHidden={sheetOpen}
          importantForAccessibility={sheetOpen ? 'no-hide-descendants' : 'auto'}
          style={[StyleSheet.absoluteFill, normalStyle]}>
          <Pressable
            ref={neutral ? moreRef : undefined}
            accessible={!front}
            accessibilityElementsHidden={front}
            importantForAccessibility={front ? 'no-hide-descendants' : 'auto'}
            accessibilityLabel={label}
            accessibilityRole={front ? undefined : 'button'}
            accessibilityHint={
              neutral
                ? 'Opens Choose an address.'
                : front
                ? undefined
                : 'Selects this address.'
            }
            disabled={front}
            onPress={neutral ? onMore : () => onSelect(card.wallet)}
            style={({pressed}) => [
              styles.strip,
              {height: slice},
              pressed && styles.pressed,
            ]}>
            <Text
              numberOfLines={1}
              ellipsizeMode="middle"
              style={[
                theme.typography.titleRow,
                styles.title,
                front && styles.frontTitle,
                {color},
              ]}>
              {title}
            </Text>
            {!front ? (
              <CardBalance
                card={card}
                compact={compact}
                showBalance={asset.showBalance}
                neutral={neutral}
              />
            ) : null}
            {neutral ? (
              <ChevronRight
                size={18}
                color={theme.colors.textSubtle}
                style={styles.moreChevron}
              />
            ) : null}
          </Pressable>
          {front ? (
            <>
              <View
                accessible
                accessibilityLabel={single ? title : label}
                style={styles.frontFacts}>
                <View style={[styles.quietRow, {top: compact ? 36 : 38}]}>
                  <Text
                    numberOfLines={1}
                    style={[
                      theme.typography.captionDense,
                      styles.quiet,
                      card.type !== 'VerusID' && styles.address,
                    ]}>
                    {card.type === 'VerusID'
                      ? 'VerusID'
                      : truncateMiddle(card.identifier)}
                  </Text>
                  {card.network ? (
                    <Text
                      numberOfLines={1}
                      style={[theme.typography.captionDense, styles.network]}>
                      {card.network} network
                    </Text>
                  ) : null}
                </View>
                {!single ? (
                  <View style={[styles.hero, {top: compact ? 56 : 60}]}>
                    <CardBalance
                      card={card}
                      compact={compact}
                      hero
                      showBalance={asset.showBalance}
                    />
                  </View>
                ) : card.syncStatus ? (
                  <StatusBadge
                    label={card.syncStatus}
                    variant="card"
                    style={styles.singleSync}
                  />
                ) : null}
              </View>
              <CopyAction
                accessibilityLabel={
                  card.type === 'VerusID'
                    ? `Copy ${card.identifier} VerusID`
                    : 'Copy address'
                }
                copiedAccessibilityLabel={
                  card.type === 'VerusID' ? 'VerusID copied' : 'Address copied'
                }
                color={WHITE}
                copiedColor={WHITE}
                iconSize={20}
                value={card.identifier === '-' ? '' : card.identifier}
                style={[styles.copy, {top: (slice - 44) / 2}]}
              />
            </>
          ) : null}
        </Animated.View>
        {front ? (
          <Animated.View
            pointerEvents={sheetOpen ? 'auto' : 'none'}
            accessibilityElementsHidden={!sheetOpen}
            importantForAccessibility={
              sheetOpen ? 'auto' : 'no-hide-descendants'
            }
            style={[StyleSheet.absoluteFill, barStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${title}, selected, ${
                !asset.showBalance && card.balance != null && !card.hasError
                  ? 'Balance hidden'
                  : card.amountText
              }. Shows all cards.`}
              onPress={onCloseSheet}
              style={({pressed}) => [styles.bar, pressed && styles.pressed]}>
              <Text
                numberOfLines={1}
                ellipsizeMode="middle"
                style={[
                  theme.typography.titleRowCompact,
                  styles.title,
                  {color: WHITE},
                ]}>
                {title}
              </Text>
              <CardBalance card={card} showBalance={asset.showBalance} bar />
              <ChevronDown size={18} color={WHITE} style={styles.moreChevron} />
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
};

const AssetCardStack = props => {
  const {asset, compact} = props;
  const reduceMotion = useReduceMotion();
  const items = useMemo(() => {
    return buildOrderedAssetStack({
      cards: asset.cards,
      balances: asset.balances,
      selectedId: asset.selected?.id,
      pins: asset.stackPreferences.pins,
      lastUsedId: asset.stackPreferences.lastUsedId,
      compact,
    });
  }, [asset.balances, asset.cards, asset.selected?.id, asset.stackPreferences, compact]);
  const single = asset.cards.length === 1;
  const height =
    Math.max(0, items.length - 1) * (compact ? 48 : 52) +
    (single ? (compact ? 70 : 74) : compact ? 126 : 140);
  return (
    <View style={[styles.stack, {height}]}>
      {items.map((item, index) => (
        <StackCard
          {...props}
          item={item}
          index={index}
          count={items.length}
          key={item.key}
          single={single}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {marginHorizontal: 20},
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    shadowOffset: {width: 0, height: -3},
    shadowRadius: 6,
    elevation: 4,
  },
  materialClip: {flex: 1, overflow: 'hidden'},
  strip: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20},
  title: {flex: 1, minWidth: 0, marginRight: 8},
  frontTitle: {marginRight: 36},
  stripBalance: {maxWidth: '54%', alignItems: 'flex-end'},
  balanceFrame: {maxWidth: '100%'},
  stripAmount: {
    fontSize: 15,
    lineHeight: 19,
    ...fontStyle('bold'),
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  stripFiat: {
    fontSize: 12,
    lineHeight: 16,
    ...fontStyle('medium'),
    textAlign: 'right',
  },
  sync: {paddingVertical: 1, paddingHorizontal: 6},
  stripSync: {marginRight: 10, flexShrink: 0},
  stripBalanceSync: {flexDirection: 'row', alignItems: 'center'},
  shrink: {flexShrink: 1},
  frontFacts: {...StyleSheet.absoluteFillObject},
  quietRow: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 8,
  },
  quiet: {flexShrink: 1, color: QUIET},
  address: {fontFamily: MONO},
  network: {
    marginLeft: 'auto',
    flexShrink: 1,
    color: QUIET,
    textAlign: 'right',
  },
  hero: {position: 'absolute', left: 20, right: 20},
  heroBalance: {alignItems: 'flex-start'},
  heroAmount: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    textAlign: 'left',
  },
  heroAmountCompact: {fontSize: 28, lineHeight: 34},
  copy: {position: 'absolute', right: 8},
  singleSync: {position: 'absolute', right: 20, top: 38},
  bar: {
    height: 48,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreChevron: {marginLeft: 6},
  pressed: {backgroundColor: 'rgba(0,0,0,0.12)'},
});

export default AssetCardStack;

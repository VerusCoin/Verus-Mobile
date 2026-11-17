/*
  VerusIdCard
  - The light card at the top of the VerusID page (owner-approved "D revised",
    2026-10-22): the name with CopyAction, the network, and a status badge
    only when the VerusID is not active. The i-address is in Details.
  - surfaceMuted fill, 24-point radius, no border, no shadow, no mark.
*/
import React, {useMemo} from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import CopyAction from '../../../../components/CopyAction';
import StatusBadge from '../../../../components/StatusBadge';
import {ONBOARDING_SMALL_DEVICE_MAX_HEIGHT} from '../../../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {getVerusIdStateBadge} from '../../../../utils/verusid/describeVerusIdState';

const ZERO_WIDTH_SPACE = '​';

// The first name part is the VerusID itself; the rest names its parent and
// network. A zero-width space after each dot lets a long name wrap there.
export const splitVerusIdName = name => {
  const value = String(name || '');
  const dot = value.indexOf('.');

  if (dot < 0) return {leaf: value, rest: ''};

  return {
    leaf: value.slice(0, dot),
    rest: value.slice(dot).replace(/\./g, `.${ZERO_WIDTH_SPACE}`),
  };
};

// For names inside sentences or shared row text. Keep the existing dot-wrap
// treatment and the unmodified name for values, copy and accessibility.
export const wrapVerusIdNames = text => typeof text === 'string'
  ? text.replace(/[^\s()]+@/g, name => {
    const {leaf, rest} = splitVerusIdName(name);
    return leaf + rest;
  }) : text;

export const VerusIdName = ({name, style, leafColor, restColor, ...props}) => {
  const {leaf, rest} = splitVerusIdName(name);

  return (
    <Text accessibilityLabel={name} style={[style, {color: restColor}]} {...props}>
      <Text style={{color: leafColor}}>{leaf}</Text>
      {rest}
    </Text>
  );
};

// Results may omit a network already named in the VerusID. Other cards keep it.
const VerusIdCard = ({name, networkName, state, showNetwork = true}) => {
  const theme = useOnboardingTheme();
  const {height: windowHeight} = useWindowDimensions();
  const compact = windowHeight <= ONBOARDING_SMALL_DEVICE_MAX_HEIGHT;
  const badge = getVerusIdStateBadge(state);
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.nameRow}>
        <VerusIdName
          accessibilityRole="header"
          leafColor={theme.colors.textPrimary}
          name={name}
          restColor={theme.colors.textSecondary}
          style={[
            compact
              ? theme.typography.headlineCompact
              : theme.typography.headlineMd,
            styles.name,
          ]}
        />
        <CopyAction
          accessibilityLabel="Copy VerusID name"
          copiedAccessibilityLabel="VerusID name copied"
          style={styles.copy}
          value={name}
        />
      </View>
      {showNetwork || badge ? <View style={styles.networkRow}>
        {showNetwork ? <Text
          numberOfLines={1}
          style={[
            theme.typography.bodySm,
            styles.network,
            {color: theme.colors.textSecondary},
          ]}>
          {networkName}
        </Text> : null}
        {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
      </View> : null}
    </View>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    card: {
      borderRadius: theme.rounded.xl,
      backgroundColor: theme.colors.surfaceMuted,
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 18,
    },
    nameRow: {flexDirection: 'row', alignItems: 'flex-start'},
    name: {flex: 1, minWidth: 0},
    // The 44-point copy target centers on the first line of the name.
    copy: {marginTop: -4, marginRight: -12, marginLeft: 4},
    networkRow: {
      minHeight: 24,
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    network: {flexShrink: 1},
  });

export default VerusIdCard;

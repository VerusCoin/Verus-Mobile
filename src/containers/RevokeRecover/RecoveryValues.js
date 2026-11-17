import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '../../theme/app';
import {convertFqnToDisplayFormat} from '../../utils/fullyqualifiedname';

const displayName = name =>
  convertFqnToDisplayFormat(name).replace(/\.VRSCTEST@$/i, '@');

export const identityName = result =>
  result?.fullyqualifiedname
    ? displayName(result.fullyqualifiedname)
    : result?.identity?.identityaddress || 'VerusID';

export const friendlyAuthority = (address, names) => {
  const name = names?.[address];
  if (typeof name === 'string') return displayName(name);
  if (name?.fullyqualifiedname) return displayName(name.fullyqualifiedname);
  return address;
};

export const IdentityContext = ({name, networkName, status, address}) => {
  const theme = useAppTheme();
  return (
    <View
      style={[styles.identity, {backgroundColor: theme.colors.surfaceMuted}]}>
      <Text
        selectable
        style={[
          theme.typography.titleSheet,
          {color: theme.colors.textPrimary},
        ]}>
        {name}
      </Text>
      <Text
        style={[theme.typography.caption, {color: theme.colors.textSecondary}]}>
        {networkName}
      </Text>
      {address ? (
        <Text
          selectable
          style={[styles.technical, {color: theme.colors.textSecondary}]}>
          {address}
        </Text>
      ) : null}
      {status ? (
        <Text
          style={[
            theme.typography.labelMd,
            {color: theme.colors.textSecondary},
          ]}>
          {status}
        </Text>
      ) : null}
    </View>
  );
};

export const RecoveryValue = ({label, value, technical = false}) => {
  const theme = useAppTheme();
  return (
    <View style={styles.value}>
      <Text
        style={[theme.typography.labelMd, {color: theme.colors.textSecondary}]}>
        {label}
      </Text>
      <Text
        selectable
        style={[
          theme.typography.caption,
          technical && styles.technical,
          {color: theme.colors.textPrimary},
        ]}>
        {value || 'Not set'}
      </Text>
    </View>
  );
};

// A snapshot of the values passed to transaction preparation, not live form state.
export const recoveryValues = ({
  targetId,
  primaryAddr,
  recoveryAddr,
  revocationAddr,
  privateAddr,
  friendlyNames,
}) => {
  const current = targetId?.identity || {};
  return {
    primary: primaryAddr || (current.primaryaddresses || []).join('\n'),
    recovery: friendlyAuthority(
      recoveryAddr || current.recoveryauthority,
      friendlyNames,
    ),
    revocation: friendlyAuthority(
      revocationAddr || current.revocationauthority,
      friendlyNames,
    ),
    zAddress: privateAddr || current.privateaddress,
  };
};

const RecoveryValues = ({values, title = 'Recovery values'}) => {
  const theme = useAppTheme();
  if (!values) return null;
  return (
    <View style={styles.values}>
      <Text
        accessibilityRole="header"
        style={[
          theme.typography.titleSheet,
          {color: theme.colors.textPrimary},
        ]}>
        {title}
      </Text>
      <RecoveryValue
        label="Primary R-address"
        value={values.primary}
        technical
      />
      <View style={styles.value}>
        <Text
          style={[
            theme.typography.labelMd,
            {color: theme.colors.textSecondary},
          ]}>
          Authorities
        </Text>
        {['recovery', 'revocation'].map(key => (
          <View key={key} style={styles.authorityRow}>
            <Text
              style={[
                theme.typography.caption,
                styles.authorityLabel,
                {color: theme.colors.textSecondary},
              ]}>
              {key === 'recovery' ? 'Recovery' : 'Revocation'}
            </Text>
            <Text
              selectable
              style={[
                theme.typography.caption,
                styles.authorityValue,
                {color: theme.colors.textPrimary},
              ]}>
              {values[key] || 'Not set'}
            </Text>
          </View>
        ))}
      </View>
      <RecoveryValue
        label="Z-address"
        value={values.zAddress}
        technical={!!values.zAddress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  identity: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 3,
    marginBottom: 18,
  },
  values: {gap: 16, marginBottom: 18},
  value: {gap: 5},
  technical: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },
  authorityRow: {flexDirection: 'row', gap: 10, alignItems: 'baseline'},
  authorityLabel: {width: 80, flexShrink: 0},
  authorityValue: {flex: 1, minWidth: 0},
});

export default RecoveryValues;

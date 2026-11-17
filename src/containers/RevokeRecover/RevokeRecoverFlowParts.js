import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {ActivityIndicator} from 'react-native-paper';
import {Check, Square} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {revokeRecoverFlowStyles as styles} from '../../styles';
import {useAppTheme} from '../../theme/app';

export const RevokeRecoverNotice = ({children, tone = 'warning'}) => {
  const theme = useAppTheme();
  const danger = tone === 'danger';
  const color = danger ? theme.colors.danger : theme.colors.warning;
  const backgroundColor = danger
    ? theme.colors.dangerBackground
    : theme.colors.warningBackground;

  return (
    <View style={[styles.notice, {backgroundColor}]}>
      <MaterialCommunityIcons
        color={color}
        name={danger ? 'alert-octagon-outline' : 'alert-outline'}
        size={21}
      />
      <Text style={[styles.noticeCopy, {color: theme.colors.textSecondary}]}>
        {children}
      </Text>
    </View>
  );
};

export const RevokeRecoverLoadingState = ({body, title}) => {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={styles.loading}>
      <View
        style={[
          styles.loadingIcon,
          {backgroundColor: theme.colors.surfaceMuted},
        ]}>
        <ActivityIndicator
          animating
          color={theme.isDark ? theme.colors.textPrimary : theme.colors.primary}
          size="large"
        />
      </View>
      {title ? (
        <Text
          style={[
            theme.typography.headlineMd,
            styles.loadingTitle,
            {color: theme.colors.textPrimary},
          ]}>
          {title}
        </Text>
      ) : null}
      <Text
        style={[
          theme.typography.bodyMd,
          styles.loadingBody,
          {color: theme.colors.textSecondary},
        ]}>
        {body}
      </Text>
    </View>
  );
};

export const RevokeRecoverReviewGroup = ({children, title}) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.reviewGroup, {borderColor: theme.colors.border}]}>
      {title ? (
        <Text style={[styles.reviewHeading, {color: theme.colors.textPrimary}]}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
};

export const RevokeRecoverReviewRow = ({label, technical = false, value}) => {
  const theme = useAppTheme();

  if (value == null || value === '') return null;

  return (
    <View style={[styles.reviewRow, {borderTopColor: theme.colors.border}]}>
      <Text style={[styles.reviewLabel, {color: theme.colors.textSecondary}]}>
        {label}
      </Text>
      <Text
        selectable={technical}
        style={[
          styles.reviewValue,
          technical && styles.reviewTechnicalValue,
          {color: theme.colors.textPrimary},
        ]}>
        {value}
      </Text>
    </View>
  );
};

export const RevokeRecoverAcknowledgement = ({label, onValueChange, value}) => {
  const theme = useAppTheme();

  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{checked: value}}
      onPress={() => onValueChange(!value)}
      style={styles.acknowledgement}>
      {value ? (
        <Check
          size={24}
          color={theme.isDark ? theme.colors.textPrimary : theme.colors.primary}
        />
      ) : (
        <Square size={24} color={theme.colors.textSubtle} />
      )}
      <Text
        style={[
          styles.acknowledgementCopy,
          {color: theme.colors.textSecondary},
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

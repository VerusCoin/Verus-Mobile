import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAppTheme} from '../theme/app';
import OnboardingBackButton from './OnboardingBackButton';

const ServiceManagerHeader = ({
  addAccessibilityLabel,
  children,
  onAdd,
  onBack,
  showDivider = false,
  title,
}) => {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: theme.colors.background},
        showDivider && {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={styles.titleRow}>
        <OnboardingBackButton onPress={onBack} style={styles.backButton} />
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[
            theme.typography.headlineMd,
            styles.title,
            {color: theme.colors.textPrimary},
          ]}>
          {title}
        </Text>
        {onAdd ? (
          <TouchableOpacity
            accessibilityLabel={addAccessibilityLabel}
            accessibilityRole="button"
            onPress={onAdd}
            style={styles.action}>
            <MaterialCommunityIcons
              color={theme.colors.textPrimary}
              name="plus"
              size={20}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.action} />
        )}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  titleRow: {
    // 20-point content inset + 4 - 8 button offset = 16-point target inset.
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginLeft: -8,
    marginRight: 8,
  },
  title: {
    minWidth: 0,
    flex: 1,
  },
  action: {
    width: 44,
    height: 44,
    marginLeft: 'auto',
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
});

export default ServiceManagerHeader;

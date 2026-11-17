import React from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {fontStyle} from '../../../../../globals/fonts';
import {useOnboardingTheme} from '../../../../../theme/onboarding';

const SignedInVerusIdOverview = ({controller}) => {
  const theme = useOnboardingTheme();
  const {linkedIds, onScrollChange} = controller.props;
  const identities = Object.keys(linkedIds)
    .flatMap(chain =>
      Object.keys(linkedIds[chain] || {}).map(iAddress => ({
        chain,
        iAddress,
        name: linkedIds[chain][iAddress],
      })),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      onScroll={event => onScrollChange?.(event.nativeEvent.contentOffset.y > 1)}
      scrollEventThrottle={16}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, {color: theme.colors.textPrimary}]}>Your VerusIDs</Text>
        <View style={[styles.countPill, {backgroundColor: theme.colors.surfaceMuted}]}>
          <Text style={[styles.countText, {color: theme.colors.textSecondary}]}>{identities.length}</Text>
        </View>
      </View>
      {identities.map(identity => (
        <TouchableOpacity
          key={`${identity.chain}:${identity.iAddress}`}
          activeOpacity={0.78}
          accessibilityRole="button"
          onPress={() => controller.openVerusIdDetailsModal(identity.chain, identity.iAddress)}
          style={[
            styles.row,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}>
          <View style={styles.rowCopy}>
            <Text numberOfLines={1} style={[styles.name, {color: theme.colors.textPrimary}]}>
              {identity.name}
            </Text>
            <View style={[styles.networkPill, {backgroundColor: theme.colors.surfaceMuted}]}>
              <Text style={[styles.networkText, {color: theme.colors.primary}]}>{identity.chain}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSubtle} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 64},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  sectionTitle: {...fontStyle('bold'), fontSize: 16, lineHeight: 20},
  countPill: {marginLeft: 8, minWidth: 24, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7},
  countText: {...fontStyle('semiBold'), fontSize: 12, lineHeight: 16},
  row: {minHeight: 76, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: {width: 0, height: 4}, elevation: 2},
  rowCopy: {flex: 1, minWidth: 0},
  name: {...fontStyle('bold'), fontSize: 18, lineHeight: 23},
  networkPill: {alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 7},
  networkText: {...fontStyle('bold'), fontSize: 10, lineHeight: 12},
});

export default SignedInVerusIdOverview;

import React, {useCallback, useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BookUser, Gift} from 'lucide-react-native';
import signedInCopy from '../../copy/signedIn';
import {useOnboardingTheme} from '../../theme/onboarding';
import {loadAddressBook} from '../../utils/addressBook/addressBook';
import {requestServiceStoredData} from '../../utils/auth/authBox';
import {GIFT_CARD_SERVICE_ID} from '../../utils/constants/services';
import {normalizeGiftCardServiceData} from '../../utils/giftCard/giftCard';

const GRID_COLUMNS = 2;
const TILE_ICON_SIZE = 24;

// Same source as GiftCardService: the stored service data, normalized.
const loadGiftCardCount = async () => {
  const serviceData = normalizeGiftCardServiceData(
    await requestServiceStoredData(GIFT_CARD_SERVICE_ID),
  );
  return Object.keys(serviceData.cards).length;
};

const loadAddressCount = async () => (await loadAddressBook()).length;

// The count stays null until the first load ends, so a tile does not show its
// purpose line and then change to a count.
const useFocusedCount = loadCount => {
  const [count, setCount] = useState(null);

  const refreshCount = useCallback(() => {
    let active = true;
    loadCount()
      .then(nextCount => {
        if (active) setCount(nextCount);
      })
      .catch(() => {
        if (active) setCount(0);
      });
    return () => {
      active = false;
    };
  }, [loadCount]);

  useEffect(refreshCount, [refreshCount]);
  useFocusEffect(refreshCount);

  return count;
};

const getGiftCardLine = count => {
  if (count == null) return null;
  if (count === 0) return signedInCopy.services.giftCardsPurpose;
  return count === 1 ? '1 card' : `${count} cards`;
};

const getAddressBookLine = count => {
  if (count == null) return null;
  return count > 0
    ? `${count} saved`
    : signedInCopy.services.addressBookPurpose;
};

const ServiceTile = ({Icon, line, onPress, theme, title}) => (
  <TouchableOpacity
    accessibilityLabel={line ? `${title}. ${line}` : title}
    accessibilityRole="button"
    activeOpacity={0.8}
    onPress={onPress}
    style={[styles.tile, {backgroundColor: theme.colors.surfaceMuted}]}>
    <Icon
      color={theme.isDark ? theme.colors.textPrimary : theme.colors.primary}
      size={TILE_ICON_SIZE}
    />
    <View style={styles.tileText}>
      <Text
        style={[theme.typography.titleRow, {color: theme.colors.textPrimary}]}>
        {title}
      </Text>
      <Text
        style={[
          theme.typography.caption,
          {
            minHeight: theme.typography.caption.lineHeight,
            color: theme.colors.textSecondary,
          },
        ]}>
        {line}
      </Text>
    </View>
  </TouchableOpacity>
);

const SignedInServicesHome = ({navigation}) => {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const giftCardCount = useFocusedCount(loadGiftCardCount);
  const addressCount = useFocusedCount(loadAddressCount);

  const services = [
    {
      key: 'gift-cards',
      title: signedInCopy.services.giftCards,
      Icon: Gift,
      line: getGiftCardLine(giftCardCount),
      onPress: () =>
        navigation.navigate('Service', {service: GIFT_CARD_SERVICE_ID}),
    },
    {
      key: 'address-book',
      title: signedInCopy.services.addressBook,
      Icon: BookUser,
      line: getAddressBookLine(addressCount),
      onPress: () => navigation.navigate('AddressBook'),
    },
  ];
  const rows = [];
  for (let index = 0; index < services.length; index += GRID_COLUMNS) {
    rows.push(services.slice(index, index + GRID_COLUMNS));
  }

  // The tab mounts hidden after sign-in, where a native SafeAreaView measures
  // no top inset until its first visit; context insets are known up front.
  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <View style={[styles.header, {backgroundColor: theme.colors.background}]}>
        <Text
          style={[
            theme.typography.headlineMd,
            {color: theme.colors.textPrimary},
          ]}>
          {signedInCopy.services.title}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {rows.map(row => (
          <View key={row[0].key} style={styles.gridRow}>
            {row.map(service => (
              <ServiceTile
                key={service.key}
                Icon={service.Icon}
                line={service.line}
                onPress={service.onPress}
                theme={theme}
                title={service.title}
              />
            ))}
            {row.length < GRID_COLUMNS ? (
              <View style={styles.gridFiller} />
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1},
  header: {paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16},
  grid: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 32,
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridFiller: {flex: 1},
  tile: {
    flex: 1,
    minHeight: 140,
    padding: 16,
    borderRadius: 18,
    justifyContent: 'space-between',
  },
  tileText: {paddingTop: 18},
});

export default SignedInServicesHome;

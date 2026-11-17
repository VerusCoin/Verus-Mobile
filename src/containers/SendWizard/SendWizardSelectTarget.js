import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {CONVERSION_DISABLED} from '../../../env/index';
import AppSearchField, {APP_SEARCH_MIN_ITEMS} from '../../components/AppSearchField';
import SkeletonLoader, {SkeletonRow} from '../../components/SkeletonLoader';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {getConversionPaths} from '../../utils/api/routers/getConversionPaths';
import {getLaunchFacts} from '../../utils/preconversion/launchFacts';
import {useChainHeight} from '../../utils/preconversion/usePrelaunch';
import {useSendWizard} from './SendWizardContext';
import {
  ErrorMessage,
  WIZARD_CONTENT_INSET,
  WIZARD_CONTENT_TOP_INSET,
  WizardScreen,
} from './components/WizardUI';
import {TargetNetworkSheet} from './components/SelectionSheets';
import {
  buildTargetOptions,
  getTargetLaunchDefinition,
  isConversionChannel,
  isPopularTarget,
} from './wizardUtils';

const SendWizardSelectTarget = () => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const {state, setTarget} = useSendWizard();
  const {sourceCoin, channel} = state;
  const [paths, setPaths] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [pendingTarget, setPendingTarget] = useState(null);
  const [networkSheetVisible, setNetworkSheetVisible] = useState(false);
  const sourceNetworkId =
    channel?.split('.')[2] || sourceCoin?.system_id || sourceCoin?.id;
  // A launch counts its start block on the chain the pre-conversion is sent on.
  const height = useChainHeight(sourceNetworkId);

  useEffect(() => {
    if (!sourceCoin || !channel) {
      setLoading(false);
      return undefined;
    }

    if (!isConversionChannel(channel)) {
      setPaths({});
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(null);
    getConversionPaths(sourceCoin, channel, {
      src: sourceCoin.currency_id || sourceCoin.id,
    })
      .then(result => {
        if (active) setPaths(result || {});
      })
      .catch(pathError => {
        if (active) {
          setPaths({});
          setError(pathError.message || 'Conversion routes are unavailable.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [channel, sourceCoin]);

  const options = useMemo(
    () =>
      buildTargetOptions(
        paths,
        sourceCoin,
        CONVERSION_DISABLED,
        sourceNetworkId,
      ),
    [paths, sourceCoin, sourceNetworkId],
  );
  const conversionOptions = useMemo(
    () => options.filter(option => option.isConversion),
    [options],
  );
  const searchable = conversionOptions.length >= APP_SEARCH_MIN_ITEMS;
  const filtered = useMemo(() => {
    const normalized = searchable ? query.trim().toLowerCase() : '';
    if (!normalized) return conversionOptions;
    return conversionOptions.filter(option =>
      [
        option.name,
        option.ticker,
        option.id,
        option.fullyqualifiedname,
        ...(option.networkOptions || []).flatMap(network => [
          network.name,
          network.ticker,
          network.id,
          network.fullyqualifiedname,
          network.networkName,
        ]),
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalized)),
    );
  }, [conversionOptions, query, searchable]);
  // A currency before its launch has its own section: it has no price yet, and
  // the funds wait until the launch.
  const prelaunch = filtered.filter(option => option.isPrelaunch);
  const popular = filtered.filter(
    option => !option.isPrelaunch && isPopularTarget(option),
  );
  const other = filtered.filter(
    option => !option.isPrelaunch && !isPopularTarget(option),
  );
  const launchLine = option => {
    const facts = getLaunchFacts(getTargetLaunchDefinition(option), {
      height,
      secondsPerBlock: sourceCoin?.seconds_per_block,
    });
    return facts?.countdown ? `Launches ${facts.countdown}` : 'Pre-launch';
  };

  // `afterSheet` tells Amount it opens right after a sheet closed. On Android
  // the keyboard needs a nudge in that case.
  const chooseRoute = (target, route, afterSheet = false) => {
    setPendingTarget(null);
    setTarget(target, route);
    navigation.navigate('SendWizardAmount', afterSheet ? {afterSheet: true} : undefined);
  };

  const chooseNetwork = (target, afterSheet = false) => {
    const directRoute = target.routes.find(route => !route.via) || target.routes[0];
    chooseRoute(target, directRoute, afterSheet);
  };

  const chooseTarget = target => {
    const networkOptions = target.networkOptions || [target];
    if (networkOptions.length > 1) {
      setPendingTarget(target);
      setNetworkSheetVisible(true);
      return;
    }

    chooseNetwork(networkOptions[0]);
  };

  // "Pre-convert" on a pre-launch asset names the target before the wizard
  // opens. Select it once; Back from Amount then shows the whole list.
  const presetApplied = useRef(false);
  useEffect(() => {
    if (presetApplied.current || loading || !state.presetTargetId) return;
    presetApplied.current = true;
    const preset = conversionOptions.find(option =>
      [option.id, option.transactionCurrency].includes(state.presetTargetId),
    );
    if (preset) chooseTarget(preset);
    // Runs once, when the routes have loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, conversionOptions, state.presetTargetId]);

  const renderOption = option => (
    <Pressable
      key={option.id}
      onPress={() => chooseTarget(option)}
      style={({pressed}) => [styles.optionRow, pressed && styles.pressed]}>
      <View style={styles.optionLogo}>
        <AssetCoinLogo
          coinId={option.coinId || option.id}
          showBadge={!option.isGrouped}
          size={38}
        />
      </View>
      <View style={styles.optionCopy}>
        <Text
          numberOfLines={1}
          style={[theme.typography.titleRow, {color: theme.colors.textPrimary}]}>
          {option.name}
        </Text>
        {option.isPrelaunch ? (
          <Text
            numberOfLines={1}
            style={[
              theme.typography.bodySm,
              styles.optionSubtitle,
              {color: theme.colors.textSecondary},
            ]}>
            {launchLine(option)}
          </Text>
        ) : null}
      </View>
      {(option.networkOptions || []).length > 1 ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={theme.colors.textSubtle}
        />
      ) : null}
    </Pressable>
  );

  if (!sourceCoin) {
    return (
      <WizardScreen contentContainerStyle={styles.fallbackContent}>
        <ErrorMessage style={styles.fallbackError}>Go back and choose an asset and address.</ErrorMessage>
      </WizardScreen>
    );
  }

  return (
    <WizardScreen scroll={false}>
      {searchable ? (
        <AppSearchField
          accessibilityLabel="Search currencies"
          onChangeText={setQuery}
          placeholder="Search currencies"
          resultCount={filtered.length}
          style={styles.searchSpacing}
          value={query}
        />
      ) : null}
      {loading ? (
        <SkeletonLoader accessibilityLabel="Loading transfer options" style={styles.skeleton}>
          <SkeletonRow labelWidth="18%" valueWidth="78%" />
          <SkeletonRow labelWidth="18%" valueWidth="66%" />
          <SkeletonRow labelWidth="18%" valueWidth="72%" />
        </SkeletonLoader>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            !searchable && styles.contentWithoutSearch,
          ]}>
          <ErrorMessage>{error}</ErrorMessage>
          {popular.length > 0 ? (
            <View style={styles.section}>
              <Text style={[theme.typography.labelCaps, styles.sectionLabel, {color: theme.colors.textSecondary}]}>Popular conversions</Text>
              {popular.map(renderOption)}
            </View>
          ) : null}
          {prelaunch.length > 0 ? (
            <View style={styles.section}>
              <Text style={[theme.typography.labelCaps, styles.sectionLabel, {color: theme.colors.textSecondary}]}>Pre-launch</Text>
              {prelaunch.map(renderOption)}
            </View>
          ) : null}
          {other.length > 0 ? (
            <View style={styles.section}>
              <Text style={[theme.typography.labelCaps, styles.sectionLabel, {color: theme.colors.textSecondary}]}>More conversions</Text>
              {other.map(renderOption)}
            </View>
          ) : null}
          {popular.length === 0 && other.length === 0 && prelaunch.length === 0 ? (
            <Text style={[styles.empty, {color: theme.colors.textSecondary}]}>
              {searchable && query.trim()
                ? 'No matching conversion options.'
                : 'No conversion routes available.'}
            </Text>
          ) : null}
        </ScrollView>
      )}
      <TargetNetworkSheet
        target={pendingTarget}
        options={pendingTarget?.networkOptions || []}
        visible={networkSheetVisible}
        onClose={() => setNetworkSheetVisible(false)}
        onClosed={() => setPendingTarget(null)}
        onSelect={network => chooseNetwork(network, true)}
      />
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  fallbackContent: {paddingTop: WIZARD_CONTENT_TOP_INSET},
  fallbackError: {marginVertical: 0},
  content: {paddingBottom: 32},
  contentWithoutSearch: {paddingTop: WIZARD_CONTENT_TOP_INSET},
  skeleton: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingTop: 20,
  },
  searchSpacing: {
    marginTop: WIZARD_CONTENT_TOP_INSET,
    marginHorizontal: WIZARD_CONTENT_INSET,
    marginBottom: 14,
  },
  section: {marginBottom: 24},
  sectionLabel: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  // Option rows match the wallet (Home) asset rows.
  optionRow: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLogo: {width: 38, height: 38, marginRight: 16},
  optionCopy: {flex: 1, minWidth: 0},
  optionSubtitle: {marginTop: 2},
  pressed: {opacity: 0.7},
  empty: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingVertical: 32,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    ...fontStyle('regular'),
  },
});

export default SendWizardSelectTarget;

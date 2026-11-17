import AppSwitch from '../../components/AppSwitch';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AcknowledgeSheet from '../../components/AcknowledgeSheet';
import AppButton from '../../components/AppButton';
import TextAction from '../../components/TextAction';
import InfoSheet from '../../components/InfoSheet';
import AppSearchField, {APP_SEARCH_MIN_ITEMS} from '../../components/AppSearchField';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {
  assetKey, assetNetworkKey, getManagedAssetBalance,
  isAssetShown, isMainAsset, isTestnetAccount, removalKey,
} from '../../utils/assets/assetIdentity';
import {getAssetPresentation, resolvedAssetCoin} from '../../utils/assets/assetPresentation';
import {
  addManagedAsset, assetContextIsCurrent, captureAssetContext,
  getNewAssetHoldings, loadAssetManagement, removeManagedAsset, setAssetHomeVisibility,
  restoreManagedAsset,
} from '../../utils/assets/assetManagementService';
import {getRemovedAssets} from '../../utils/assets/removedAssets';
import AssetDetailsSheet from './AssetDetailsSheet';
import {buildAssetManagerData} from './assetManagerData';
import {
  AssetFooter, AssetLoadingRows, AssetLogo, AssetScreen, AssetScrollView,
} from './AssetManagementComponents';
import {createManageAssetsStyles} from './manageAssets.styles';

const FILTERS = [{id: 'all', label: 'All'}, {id: 'home', label: 'On Home'}, {id: 'hidden', label: 'Hidden'}];
const matchesQuery = (query, values) => !query.trim() || values.filter(Boolean)
  .some(value => String(value).toLowerCase().includes(query.trim().toLowerCase()));

const useAssetData = () => {
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const activeCoins = useObjectSelector(state => state.coins.activeCoinsForUser || []);
  const management = useObjectSelector(state => state.assetManagement);
  const cards = useObjectSelector(state => state.coinMenus.allSubWallets);
  const balances = useObjectSelector(state => state.ledger.balances);
  const showBalance = useObjectSelector(state => state.coins.showBalance);
  const discoveries = useObjectSelector(getNewAssetHoldings);
  const removedAssets = useObjectSelector(getRemovedAssets);
  const data = useMemo(() => buildAssetManagerData({activeAccount, activeCoins,
    testAccount: isTestnetAccount(activeAccount)}), [activeAccount, activeCoins]);
  useEffect(() => {
    loadAssetManagement().catch(() => {});
  }, []);
  return {...data, activeAccount, cards, balances, management, discoveries, removedAssets, showBalance};
};

const useAssetAction = () => {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const pendingRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const run = useCallback(async (coin, action, task, failure) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const context = captureAssetContext();
    setPending({key: assetKey(coin), action});
    setError(null);
    try {
      await task(context);
    } catch (_) {
      if (mounted.current && assetContextIsCurrent(context)) setError({message: failure, key: assetKey(coin), action});
    } finally {
      pendingRef.current = false;
      if (mounted.current && assetContextIsCurrent(context)) setPending(null);
    }
  }, []);
  const perform = useCallback((coin, shown) => shown == null
    ? run(coin, 'add', context => addManagedAsset({coin, context}), 'Couldn’t add this asset. Try again.')
    : run(coin, 'home', context => setAssetHomeVisibility(coin, shown, context), 'Couldn’t save the Home setting. Try again.'), [run]);
  const remove = useCallback(coin => run(coin, 'remove', context => removeManagedAsset({coin, context}),
    'Couldn’t remove this asset. Try again.'), [run]);
  const restore = useCallback(entry => run(entry.coin, 'restore', context => restoreManagedAsset({entry, context}),
    'Could not add this asset. Try again.'), [run]);
  return {pending, error, perform, remove, restore};
};

const formatAmount = ({total, complete}, showBalance, ticker) => !showBalance ? 'Balance hidden'
  : total == null ? 'Balance unavailable' : `${complete ? '' : '≥ '}${total.toFormat()} ${ticker}`;

const removalMessage = ({total, complete}, showBalance, ticker) => {
  if (showBalance && complete && total?.isGreaterThan(0)) {
    return `Your balance of ${total.toFormat()} ${ticker} stays on the blockchain. The wallet stops showing it until you add it back from Removed assets.`;
  }
  if (showBalance && complete && total?.isZero()) return 'The wallet stops showing it until you add it back from Removed assets.';
  return 'Any funds stay on the blockchain. The wallet stops showing it until you add it back from Removed assets.';
};

const SectionHeader = ({title, detail, styles}) => (
  <View style={styles.sectionHeader}>
    <Text accessibilityRole="header" style={styles.sectionLabel}>{title}</Text>
    <Text style={styles.sectionDetail}>{detail}</Text>
  </View>
);

const ErrorMessage = ({error, styles}) => error ? (
  <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error}>
    <Text style={styles.errorText}>{error}</Text>
  </View>
) : null;

const AssetRow = ({coin, presentation, description, action, disabled, onPress, styles}) => {
  const content = <>
    <AssetLogo presentation={presentation} styles={styles} />
    <View style={styles.rowCopy}>
      <Text numberOfLines={2} style={styles.rowName}>{presentation.name}</Text>
      {description ? <Text numberOfLines={2} style={styles.rowDescription}>{description}</Text> : null}
    </View>
  </>;
  return (
    <View style={styles.assetRow} testID={`manage-asset-row-${coin.id}`}>
      {onPress ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${presentation.name}, ${description}`}
        accessibilityHint="Shows details and Remove from wallet" accessibilityState={{disabled: Boolean(disabled)}}
        activeOpacity={0.74} disabled={disabled} onPress={onPress} style={styles.rowPress} testID={`manage-asset-open-${coin.id}`}>
        {content}
      </TouchableOpacity> : content}
      {action}
    </View>
  );
};

const RemovedAssetRows = ({entries, pending, error, onAddBack, styles}) => entries.map(entry => {
  const presentation = getAssetPresentation(entry.coin, {systemId: entry.lookupSystemId});
  const description = [presentation.ticker, presentation.networkLabel, presentation.identifier]
    .find(value => value?.trim() && value.trim().toLowerCase() !== presentation.name.trim().toLowerCase());
  const key = assetKey(entry.coin);
  const adding = pending?.key === key && pending.action === 'restore';
  return <View key={entry.key}>
    <AssetRow coin={entry.coin} presentation={presentation} description={description} styles={styles}
      action={<TextAction accessibilityLabel={`Add back ${presentation.name} (${presentation.networkLabel})`}
        accessibilityState={{busy: adding}} disabled={pending != null}
        onPress={() => onAddBack(entry)} style={styles.restoreAction} testID={`asset-add-back-${entry.coin.id}`}>
        {adding ? 'Adding…' : 'Add back'}
      </TextAction>} />
    {error?.action === 'restore' && error.key === key ?
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.restoreError}>
        <Text style={styles.errorText}>{error.message}</Text>
      </View> : null}
  </View>;
});

const Manager = ({navigation}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  const data = useAssetData();
  const {pending, error, perform, remove, restore} = useAssetAction();
  const [removedVisible, setRemovedVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  // The selected asset outlives both sheets, so their content stays in place
  // while they animate closed.
  const [selected, setSelected] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const removeRequested = useRef(false);
  const holdingOf = coin => getManagedAssetBalance(coin, data.cards[coin.id], data.balances, data.management.snapshots);
  const selectedPresentation = selected && getAssetPresentation(selected, {cards: data.cards[selected.id]});
  const selectedHolding = selected && holdingOf(selected);
  const openDetails = coin => {
    removeRequested.current = false;
    setSelected(coin);
    setDetailsVisible(true);
  };
  const requestRemove = () => {
    removeRequested.current = true;
    setDetailsVisible(false);
  };
  const detailsClosed = () => {
    if (removeRequested.current) setConfirmVisible(true);
    removeRequested.current = false;
  };
  // The search and the tabs show only from 7 assets. The count ignores the
  // selected tab and the search text, so they do not disappear while the user
  // uses them. Without them, the list shows every asset. When they hide, the
  // query and the tab go back to their defaults, so they return unchanged.
  // Activation publishes the coin before the saved removed mark is cleared.
  // That mark owns list membership until restoration succeeds. Keep an ongoing
  // removal visible so its existing “Removing…” feedback does not change.
  const activeAssets = data.activeAssets.filter(coin =>
    !data.management.removed[removalKey(coin)] ||
    (pending?.action === 'remove' && pending.key === assetKey(coin)));
  const searchable = activeAssets.length + data.discoveries.length >= APP_SEARCH_MIN_ITEMS;
  const activeQuery = searchable ? query : '';
  const activeFilter = searchable ? filter : 'all';
  useEffect(() => {
    if (!searchable) {
      setQuery('');
      setFilter('all');
    }
  }, [searchable]);
  useEffect(() => {
    if (data.removedAssets.length === 0) setRemovedVisible(false);
  }, [data.removedAssets.length]);
  const assets = activeAssets.map(coin => ({coin,
    presentation: getAssetPresentation(coin, {cards: data.cards[coin.id]}),
  })).filter(({coin, presentation}) => {
    const shown = isAssetShown(coin, data.management.preferences);
    return (activeFilter === 'all' || (activeFilter === 'home' ? shown : !shown)) &&
      matchesQuery(activeQuery, presentation.searchTerms);
  });
  const discoveries = activeFilter === 'all' ? data.discoveries.map(holding => ({...holding,
    presentation: getAssetPresentation(resolvedAssetCoin(holding.result), {systemId: holding.systemId}),
  })).filter(holding => matchesQuery(activeQuery, [...holding.presentation.searchTerms,
    holding.result.currencyDefinition.fullyqualifiedname])) : [];
  const removedAssets = activeFilter === 'hidden' ? data.removedAssets.filter(entry =>
    matchesQuery(activeQuery, getAssetPresentation(entry.coin, {systemId: entry.lookupSystemId}).searchTerms)) : [];

  return (
    <AssetScreen title="Manage assets" onBack={() => navigation.goBack()} testID="manage-assets-screen"
      header={searchable ? <View style={styles.headerContent}>
        <AppSearchField accessibilityLabel="Search your assets" placeholder="Search your assets" value={query} onChangeText={setQuery} testID="manage-assets-search" />
        <View style={styles.filters}>
          <View style={styles.tabs}>{FILTERS.map(item => (
            <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected: filter === item.id}} key={item.id} onPress={() => setFilter(item.id)} style={[styles.tab, filter === item.id && styles.tabSelected]}>
              <Text style={filter === item.id ? styles.tabLabelSelected : styles.tabLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}</View>
        </View>
      </View> : null}
      footer={<AssetFooter styles={styles}><AppButton onPress={() => navigation.navigate('ManageAssetsDirectory')} testID="manage-assets-add-asset">Add asset</AppButton></AssetFooter>}>
      <ErrorMessage styles={styles} error={(error?.action !== 'restore' ? error?.message : null) || (data.management.loadError ? 'Couldn’t load your saved assets. Your Home settings are unchanged.' : null)} />
      <AssetScrollView styles={styles} contentContainerStyle={!searchable && styles.listWithoutSearch} testID="manage-assets-list">
        {!data.management.ready ? <AssetLoadingRows styles={styles} /> : <>
          {(activeFilter !== 'hidden' || assets.length > 0) ? <SectionHeader title="Your assets" detail="Show on Home" styles={styles} /> : null}
          {assets.map(({coin, presentation}) => {
            const removing = pending?.key === assetKey(coin) && pending.action === 'remove';
            const amount = removing ? 'Removing…' : formatAmount(holdingOf(coin), data.showBalance, presentation.ticker);
            return <AssetRow key={assetKey(coin)} coin={coin} presentation={presentation} description={amount} styles={styles}
              disabled={pending != null} onPress={isMainAsset(coin, data.activeAccount) ? null : () => openDetails(coin)}
              action={<TouchableOpacity style={styles.switchAction}
                accessibilityRole="switch"
                accessibilityLabel={`Show ${presentation.name} on Home (${presentation.ticker})`}
                accessibilityState={{checked: isAssetShown(coin, data.management.preferences), busy: pending?.key === assetKey(coin), disabled: pending != null}}
                disabled={pending != null}
                onPress={() => perform(coin, !isAssetShown(coin, data.management.preferences))}
                testID={`asset-home-switch-${coin.id}`}>
                <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><AppSwitch
                accessible={false}
                trackColor={{false: theme.colors.borderStrong, true: theme.colors.primary}}
                ios_backgroundColor={theme.colors.borderStrong}
                value={isAssetShown(coin, data.management.preferences)}
                /></View>
              </TouchableOpacity>} />;
          })}
          {assets.length === 0 && removedAssets.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>{activeQuery ? 'No matching assets' : activeFilter === 'hidden' ? 'No hidden assets' : activeFilter === 'home' ? 'No assets on Home' : 'No managed assets'}</Text></View> : null}
          {discoveries.length > 0 ? <>
            <SectionHeader title="New assets found" detail={String(discoveries.length)} styles={styles} />
            {discoveries.map(holding => {
              const {name, ticker, networkLabel} = holding.presentation;
              return <View key={holding.key} style={styles.assetRow}>
                <AssetLogo presentation={holding.presentation} styles={styles} />
                <View style={styles.rowCopy}>
                  <Text numberOfLines={2} style={styles.rowName}>{name}</Text>
                  <Text numberOfLines={2} style={styles.rowDescription}>{data.showBalance ? `${holding.balance.toFormat()} ${ticker}` : 'Balance hidden'}</Text>
                </View>
                <TextAction accessibilityRole="button" accessibilityLabel={`Review ${name} (${networkLabel})`} style={styles.rowAction}
                  onPress={() => navigation.navigate('AddAssetByIdentifier', {holdingKey: holding.key, assetScope: captureAssetContext()})}>
                  Review
                </TextAction>
              </View>;
            })}
          </> : null}
          {removedAssets.length > 0 ? <>
            <SectionHeader title="Removed assets" detail={String(removedAssets.length)} styles={styles} />
            <RemovedAssetRows entries={removedAssets} pending={pending} error={error} onAddBack={restore} styles={styles} />
          </> : null}
          {!searchable && data.removedAssets.length > 0 ?
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Removed assets, ${data.removedAssets.length}`}
              onPress={() => setRemovedVisible(true)} style={styles.removedEntry} testID="manage-assets-removed">
              <Text style={styles.removedEntryLabel}>Removed assets</Text>
              <Text style={styles.removedEntryCount}>{data.removedAssets.length}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSubtle} />
            </TouchableOpacity> : null}
        </>}
      </AssetScrollView>
      <InfoSheet title="Removed assets" visible={removedVisible} onClose={() => setRemovedVisible(false)}>
        <RemovedAssetRows entries={data.removedAssets} pending={pending} error={error} onAddBack={restore} styles={styles} />
      </InfoSheet>
      <AssetDetailsSheet
        amount={selected ? formatAmount(selectedHolding, data.showBalance, selectedPresentation.ticker) : null}
        coin={selected}
        onClose={() => setDetailsVisible(false)}
        onClosed={detailsClosed}
        onRemove={requestRemove}
        presentation={selectedPresentation}
        visible={detailsVisible} />
      <AcknowledgeSheet
        confirmLabel="Remove"
        dismissLabel="Not now"
        message={selected ? removalMessage(selectedHolding, data.showBalance, selectedPresentation.ticker) : ''}
        onAcknowledged={() => remove(selected)}
        onClose={() => setConfirmVisible(false)}
        testID="asset-remove-confirm"
        title={selected ? `Remove ${selectedPresentation.name}?` : ''}
        visible={confirmVisible} />
    </AssetScreen>
  );
};

const Directory = ({navigation}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  const data = useAssetData();
  const {pending, error, perform} = useAssetAction();
  const [query, setQuery] = useState('');
  const active = new Set(data.activeAssets.map(assetKey));
  const assets = data.catalogue.map(coin => ({coin, presentation: getAssetPresentation(coin)}))
    .filter(({presentation}) => matchesQuery(query, presentation.searchTerms));
  return (
    <AssetScreen title="Add asset" onBack={() => navigation.goBack()} testID="manage-assets-directory"
      header={<View style={styles.headerContent}><AppSearchField accessibilityLabel="Search catalogue or paste identifier" placeholder="Search catalogue or paste identifier" value={query} onChangeText={setQuery} testID="manage-assets-directory-search" /></View>}>
      <ErrorMessage error={error?.message} styles={styles} />
      <AssetScrollView styles={styles} testID="manage-assets-directory-list">
        <TouchableOpacity accessibilityRole="button" style={styles.customEntry} testID="manage-assets-add-custom"
          onPress={() => navigation.navigate('AddAssetByIdentifier', {identifier: query.trim(), assetScope: captureAssetContext()})}>
          <View style={styles.customEntryCopy}>
            <Text style={styles.rowName}>Add custom asset</Text>
            <Text style={styles.rowDescription}>Verus currency or ERC-20 token</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionLabel}>{query.trim() ? 'Search results' : 'Common assets'}</Text>
        </View>
        {assets.map(({coin, presentation}) => {
          const added = active.has(assetKey(coin));
          return <AssetRow key={assetKey(coin)} coin={coin} presentation={presentation} styles={styles} description={presentation.ticker}
            action={<TextAction accessibilityRole="button" accessibilityLabel={`${added ? 'Added' : 'Add'} ${presentation.name} (${presentation.ticker})`}
              accessibilityState={{disabled: added || pending != null || !data.management.ready, busy: pending?.key === assetKey(coin)}}
              disabled={added || pending != null || !data.management.ready} onPress={() => perform(coin)} style={styles.rowAction}>
              {added ? 'Added' : pending?.key === assetKey(coin) ? 'Adding…' : 'Add'}
            </TextAction>} />;
        })}
        {assets.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No matching assets</Text><Text style={styles.rowDescription}>Try another name or add a custom asset.</Text></View> : null}
        <Text style={styles.helper}>Adding an asset shows it on Home.</Text>
      </AssetScrollView>
    </AssetScreen>
  );
};

const useWalletViewKey = () => useObjectSelector(state => `${state.authentication.activeAccount?.accountHash}:${state.authentication.sessionEpoch}:${assetNetworkKey(state.authentication.activeAccount)}`);
const ManageAssets = props => <Manager key={useWalletViewKey()} {...props} />;
export const ManageAssetsDirectory = props => <Directory key={useWalletViewKey()} {...props} />;
export default ManageAssets;

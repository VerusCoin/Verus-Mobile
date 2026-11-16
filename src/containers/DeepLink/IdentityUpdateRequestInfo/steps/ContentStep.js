/*
  ContentStep (Step 2)
  - 2026-02-05: Created as a full-screen content changes review.
  - 2026-02-06: Filter displayUpdates to only pass CMM and private-info groups.
    Authority/status changes are already shown in the High Risk step.
  - 2026-03-06: Updated content-removal framing  so the step focuses on current
    identity publication state instead of permanent deletion.
  - 2026-06-18: Replaced the generic accordion renderer with a focused
    card/filter review layout for identity content changes.
*/
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import {ContentMultiMapRemoveKey} from 'verus-typescript-primitives';
import CopyAction from '../../../../components/CopyAction';
import InfoSheet from '../../../../components/InfoSheet';
import {InfoSheetRow} from '../../../../components/InfoSheetSection';
import {buildContentReview} from '../../../../utils/identityUpdate/contentReview';
import {useRequestBackHandler} from '../../useRequestNavigation';
import PrivateAddressChangeValues from '../components/PrivateAddressChangeValues';
import VerusIdContentChangeCard, {
  buildVerusIdContentChangeItems,
  contentChangeMatchesFilter,
  getCmmDataKeyLabel,
  getFullContentChangeKey,
  normalizeCmmDisplayUpdates,
} from '../../../../components/VerusIdContentChangeCard';
import {verusIdObjectDataStyles as contentStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {
  VERUSID_CMM_INFO,
  VERUSID_PRIVATE_ADDRESS,
  VERUSID_PRIVATE_INFO,
} from '../../../../utils/constants/verusidObjectData';

const FILTER_OPTIONS = [
  {id: 'all', label: 'All'},
  {id: 'add', label: 'Adds'},
  {id: 'remove', label: 'Removes'},
  {id: 'protect', label: 'Private'},
];

const getPrivateInfoTitle = key =>
  key === VERUSID_PRIVATE_ADDRESS.key ? VERUSID_PRIVATE_ADDRESS.label : key;

const SummaryTile = ({darkMode, label, tone, value}) => (
  <View
    style={[
      contentStyles.contentSummaryTile,
      darkMode && contentStyles.contentSummaryTileDark,
      tone === 'add' && contentStyles.contentSummaryAddTile,
      darkMode && tone === 'add' && contentStyles.contentSummaryAddTileDark,
      tone === 'remove' && contentStyles.contentSummaryRemoveTile,
      darkMode &&
        tone === 'remove' &&
        contentStyles.contentSummaryRemoveTileDark,
    ]}>
    <Text
      style={[
        contentStyles.contentSummaryNumber,
        darkMode && contentStyles.contentSummaryNumberDark,
        tone === 'add' && contentStyles.contentSummaryAddNumber,
        darkMode && tone === 'add' && contentStyles.contentSummaryAddNumberDark,
        tone === 'remove' && contentStyles.contentSummaryRemoveNumber,
        darkMode &&
          tone === 'remove' &&
          contentStyles.contentSummaryRemoveNumberDark,
      ]}>
      {value}
    </Text>
    <Text
      style={[
        contentStyles.contentSummaryLabel,
        darkMode && contentStyles.contentSummaryLabelDark,
      ]}>
      {label}
    </Text>
  </View>
);

const FilterButton = ({active, darkMode, label, onPress}) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityState={{selected: active}}
    activeOpacity={0.72}
    onPress={onPress}
    style={[
      contentStyles.contentFilterButton,
      active && contentStyles.contentFilterButtonActive,
      darkMode && active && contentStyles.contentFilterButtonActiveDark,
    ]}>
    <Text
      numberOfLines={1}
      style={[
        contentStyles.contentFilterLabel,
        darkMode && contentStyles.contentFilterLabelDark,
        active && contentStyles.contentFilterLabelActive,
        darkMode && active && contentStyles.contentFilterLabelActiveDark,
      ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const getPrivateInfoFallbackTitle = items => {
  if (items.length === 1) return items[0].title;

  return VERUSID_PRIVATE_INFO.label;
};

// A copyable value takes the shared CopyAction at the end of its line. The
// negative margins keep the 44-point target inside the row padding, so the
// row height does not change.
const privateInfoRowStyles = StyleSheet.create({
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    flex: 1,
    minWidth: 0,
  },
  copyAction: {
    marginVertical: -12,
    marginRight: -12,
  },
});

const PrivateInfoRow = ({darkMode, divider, item, showTitle}) => {
  const theme = useOnboardingTheme();
  const valueText = item.description ? (
    <Text
      selectable
      style={[
        contentStyles.privateInfoFallbackItemDescription,
        darkMode && contentStyles.privateInfoFallbackItemDescriptionDark,
        item.key === VERUSID_PRIVATE_ADDRESS.key &&
          contentStyles.privateInfoFallbackIdentifier,
        !!item.copyValue && privateInfoRowStyles.value,
      ]}>
      {item.description}
    </Text>
  ) : null;

  return (
    <View
      style={[
        contentStyles.privateInfoFallbackItem,
        divider && contentStyles.privateInfoFallbackItemDivider,
        divider && darkMode && contentStyles.privateInfoFallbackDividerDark,
      ]}>
      {showTitle && (
        <Text
          numberOfLines={2}
          style={[
            contentStyles.privateInfoFallbackItemTitle,
            darkMode && contentStyles.privateInfoFallbackItemTitleDark,
          ]}>
          {item.title}
        </Text>
      )}
      {item.highRiskType === 'private-address' ? (
        <PrivateAddressChangeValues change={item} />
      ) : valueText && item.copyValue ? (
        <View style={privateInfoRowStyles.valueRow}>
          {valueText}
          <CopyAction
            accessibilityLabel={`Copy ${String(item.title).toLowerCase()}`}
            color={theme.colors.textSubtle}
            copiedAccessibilityLabel={`${item.title} copied`}
            copiedColor={theme.colors.success}
            style={privateInfoRowStyles.copyAction}
            value={item.copyValue}
          />
        </View>
      ) : (
        valueText
      )}
    </View>
  );
};

const PrivateInfoFallback = ({darkMode, items}) => {
  if (items.length === 0) return null;

  return (
    <View
      style={[
        contentStyles.privateInfoFallback,
        darkMode && contentStyles.privateInfoFallbackDark,
      ]}>
      <Text
        style={[
          contentStyles.privateInfoFallbackTitle,
          darkMode && contentStyles.privateInfoFallbackTitleDark,
        ]}>
        {getPrivateInfoFallbackTitle(items)}
      </Text>
      {items.map((item, index) => (
        <PrivateInfoRow
          key={item.key}
          darkMode={darkMode}
          divider={index < items.length - 1}
          item={item}
          // One item already gives the group its title.
          showTitle={items.length > 1}
        />
      ))}
    </View>
  );
};

const getAvailableFilterOptions = ({
  addCount,
  privateCount,
  removeCount,
  totalContentCount,
}) => {
  if (totalContentCount < 4) return [];

  const categoryCounts = {
    add: addCount,
    remove: removeCount,
    protect: privateCount,
  };
  const usefulFilterIds = Object.keys(categoryCounts).filter(
    key => categoryCounts[key] > 0 && categoryCounts[key] < totalContentCount,
  );

  if (usefulFilterIds.length === 0) return [];

  return FILTER_OPTIONS.filter(option =>
    option.id === 'all' ? true : usefulFilterIds.includes(option.id),
  );
};

const VerusIdContentChanges = ({
  cmmItems,
  cmmUpdates,
  darkMode,
  filterOptions,
  privateInfoItems,
}) => {
  const [filter, setFilter] = useState('all');
  const [uploadReview, setUploadReview] = useState(null);
  const closeUploadReview = useCallback(() => {
    setUploadReview(previous => previous && {...previous, visible: false});
  }, []);
  useRequestBackHandler(closeUploadReview, false, 2,
    uploadReview != null && uploadReview.visible !== false);
  const showFilters = filterOptions.length > 0;
  const filterIsAvailable = filterOptions.some(option => option.id === filter);
  const activeFilter = showFilters && filterIsAvailable ? filter : 'all';

  useEffect(() => {
    if (filter !== activeFilter) {
      setFilter('all');
    }
  }, [activeFilter, filter]);

  const visibleItems = useMemo(
    () =>
      cmmItems.filter(item => contentChangeMatchesFilter(item, activeFilter)),
    [activeFilter, cmmItems],
  );
  const visiblePrivateInfoItems = useMemo(
    () =>
      activeFilter === 'all' || activeFilter === 'protect'
        ? privateInfoItems
        : [],
    [activeFilter, privateInfoItems],
  );
  const hasVisibleItems =
    visibleItems.length > 0 || visiblePrivateInfoItems.length > 0;

  return (
    <View style={contentStyles.contentReviewBody}>
      {showFilters && (
        <View
          style={[
            contentStyles.contentFilterContainer,
            darkMode && contentStyles.contentFilterContainerDark,
          ]}>
          {filterOptions.map(option => (
            <FilterButton
              key={option.id}
              active={filter === option.id}
              darkMode={darkMode}
              label={option.label}
              onPress={() => setFilter(option.id)}
            />
          ))}
        </View>
      )}

      {visibleItems.map(item => {
        const updateEntry = cmmUpdates[item.updateKey ?? item.key];
        return (
          <VerusIdContentChangeCard
            key={item.key}
            item={item}
            darkMode={darkMode}
            panelTone={true}
            updateEntry={updateEntry}
            visibilityLabel={item.changeType === 'removed' ? null :
              item.isEncrypted ? 'Encrypted upload' : item.isEncryptedKey ? 'Encrypted credential' : 'Public'}
            onPress={updateEntry?.signData
              ? () => setUploadReview({title: item.title, upload: updateEntry.signData})
              : undefined}>
            {item.showOperationDetails === false ? null : updateEntry?.signData ? (
              // The card shows what is uploaded. Its sheet keeps every
              // technical field under its own heading.
              <UploadContentReview upload={updateEntry.signData} technical="hide" />
            ) : item.removeMeta && updateEntry?.rawData != null ? (
              <UploadContentReview
                upload={updateEntry.rawData}
                isUpload={false}
                label="Removal data"
                shownRemovalHash={updateEntry.removalUi ? item.removeMeta.valueHash : undefined}
                shownRemovalKey={getFullContentChangeKey(item, updateEntry)}
              />
            ) : updateEntry?.rawData != null ? (
              <ContentValuesReview value={updateEntry.rawData} />
            ) : null}
          </VerusIdContentChangeCard>
        );
      })}

      <InfoSheet
        visible={uploadReview != null && uploadReview.visible !== false}
        title={uploadReview?.title || 'Upload content'}
        onClose={closeUploadReview}
        onClosed={() => setUploadReview(null)}>
        {uploadReview && <UploadContentReview upload={uploadReview.upload} copy technical="group" />}
      </InfoSheet>

      <PrivateInfoFallback
        darkMode={darkMode}
        items={visiblePrivateInfoItems}
      />

      {!hasVisibleItems && (
        <View
          style={[
            contentStyles.contentReviewEmptyState,
            darkMode && contentStyles.contentReviewEmptyStateDark,
          ]}>
          <Text
            style={[
              contentStyles.contentReviewEmptyText,
              darkMode && contentStyles.contentReviewEmptyTextDark,
            ]}>
            No changes match this filter
          </Text>
        </View>
      )}
    </View>
  );
};

const ContentValuesReview = ({value}) => {
  const theme = useOnboardingTheme();
  const values = Array.isArray(value) ? value : [value];
  return (
    <View style={{gap: theme.spacing.lg}}>
      {values.map((entry, index) => (
        <UploadContentReview
          key={index}
          upload={entry}
          isUpload={false}
          showTitle={values.length > 1}
          label={values.length > 1 ? `Value ${index + 1} of ${values.length}` : 'Content to add'}
        />
      ))}
    </View>
  );
};

// Read the original content. Keep every field and warning visible, including
// exact encoded bytes. The sheet adds shared copy actions without changing data.
// `technical`: "show" keeps metadata fields in place, "hide" leaves them out
// (only where a sheet shows them), "group" lists them last under a heading.
const UploadContentReview = ({upload, copy = false, isUpload = true, label = 'Upload content', showTitle = false, shownRemovalHash, shownRemovalKey, technical = 'show'}) => {
  const theme = useOnboardingTheme();
  // The heading owns the value number. Rows keep only their nested field path.
  const reviewLabel = showTitle ? 'Content' : label;
  const review = useMemo(() => buildContentReview(upload, {
    isUpload, label: reviewLabel, omitRootLabel: true,
  }), [upload, isUpload, reviewLabel]);
  const fields = review.fields.filter(field => {
    // Match the removal object's own fields, never unrelated nested data.
    if (shownRemovalHash && field.id.endsWith(`${ContentMultiMapRemoveKey.vdxfid}:valuehash`) &&
        field.copyValue === shownRemovalHash) return false;
    if (shownRemovalKey && field.id.endsWith(`${ContentMultiMapRemoveKey.vdxfid}:entrykey`) &&
        field.copyValue === shownRemovalKey) return false;
    return true;
  });
  const contentFields = technical === 'show' ? fields : fields.filter(field => field.kind !== 'metadata');
  const technicalFields = fields.filter(field => field.kind === 'metadata');
  const renderField = field => (
    <InfoSheetRow
      key={field.id}
      label={field.path ? `${field.path} › ${field.label}` : field.label}
      value={field.value}
      copy={copy}
      copyValue={field.copyValue}
      selectable={!field.escaped}
      valueStyle={field.kind === 'encoded' ? [contentStyles.cmmCardKeyId, theme.isDark && contentStyles.cmmCardKeyIdDark] : undefined}
    />
  );
  return (
    <View style={{gap: theme.spacing.sm}}>
      {showTitle && (
        <Text accessibilityRole="header" style={[theme.typography.titleRow, {color: theme.colors.textPrimary}]}>
          {label}
        </Text>
      )}
      {review.warnings.map(warning => (
        <Text key={warning} style={[theme.typography.bodySm, {color: theme.colors.warningText}]}>
          {warning}
        </Text>
      ))}
      {contentFields.map(renderField)}
      {technical === 'group' && technicalFields.length > 0 && (
        <Text accessibilityRole="header" style={[theme.typography.titleRow, {color: theme.colors.textPrimary, marginTop: theme.spacing.sm}]}>
          Technical details
        </Text>
      )}
      {technical === 'group' && technicalFields.map(renderField)}
    </View>
  );
};

const ContentStep = ({
  requestCard,
  subjectIdentity,
  displayUpdates,
  cmmDataKeys,
  styles,
}) => {
  const theme = useOnboardingTheme();
  const darkMode = theme.isDark;
  const cmmUpdates = useMemo(
    () =>
      normalizeCmmDisplayUpdates(displayUpdates[VERUSID_CMM_INFO.key] || {}),
    [displayUpdates],
  );
  const getCmmDataKey = useMemo(
    () => iAddr => getCmmDataKeyLabel(iAddr, cmmDataKeys),
    [cmmDataKeys],
  );
  const cmmItems = useMemo(
    () =>
      buildVerusIdContentChangeItems({
        verusId: subjectIdentity,
        cmmUpdates,
        getCmmDataKey,
        changedOnly: true,
      }).filter(item => item.changeType),
    [cmmUpdates, getCmmDataKey, subjectIdentity],
  );
  const privateInfoItems = useMemo(() => {
    const privateUpdates = displayUpdates[VERUSID_PRIVATE_INFO.key] || {};

    return Object.entries(privateUpdates)
      .filter(([, entry]) => Boolean(entry))
      .map(([key, entry]) => ({
        ...entry,
        key,
        title: getPrivateInfoTitle(key),
        description: entry.data,
        copyValue: entry.copyValue,
      }));
  }, [displayUpdates]);
  const totalContentCount = cmmItems.length + privateInfoItems.length;
  const addCount =
    cmmItems.filter(item => item.changeType === 'added' || item.changeType === 'appended').length +
    privateInfoItems.length;
  const removeCount = cmmItems.filter(
    item => item.changeType === 'removed',
  ).length;
  // Private address changes are not content values a removal can affect.
  const hasMixedCmmChanges =
    removeCount > 0 && cmmItems.some(item => item.changeType === 'added' || item.changeType === 'appended');
  const privateCount =
    cmmItems.filter(item => contentChangeMatchesFilter(item, 'protect'))
      .length + privateInfoItems.length;
  const filterOptions = useMemo(
    () =>
      getAvailableFilterOptions({
        addCount,
        privateCount,
        removeCount,
        totalContentCount,
      }),
    [addCount, privateCount, removeCount, totalContentCount],
  );

  return (
    <View style={contentStyles.contentReviewRoot}>
      <View style={[styles.header, contentStyles.contentReviewHeader, {paddingTop: 4, paddingHorizontal: 24, paddingBottom: 0}]}>
        {requestCard}
        {totalContentCount > 1 && (
          <View style={contentStyles.contentSummaryRow}>
            <SummaryTile
              darkMode={darkMode}
              label="content changes"
              value={totalContentCount}
            />
            <SummaryTile
              darkMode={darkMode}
              label="new or added"
              tone="add"
              value={addCount}
            />
            <SummaryTile
              darkMode={darkMode}
              label="will remove"
              tone="remove"
              value={removeCount}
            />
          </View>
        )}
      </View>

      <ScrollView
        style={contentStyles.contentReviewScroll}
        contentContainerStyle={contentStyles.contentReviewScrollContent}>
        {hasMixedCmmChanges && (
          <Text style={[styles.subtitle, contentStyles.contentReviewNote]}>
            A removal can also affect values added in the same update.
          </Text>
        )}
        <VerusIdContentChanges
          cmmItems={cmmItems}
          cmmUpdates={cmmUpdates}
          darkMode={darkMode}
          filterOptions={filterOptions}
          privateInfoItems={privateInfoItems}
        />
      </ScrollView>
    </View>
  );
};

export default ContentStep;

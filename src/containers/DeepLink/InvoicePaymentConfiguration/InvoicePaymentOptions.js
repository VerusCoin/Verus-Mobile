import React, {useEffect, useState} from 'react';
import {ScrollView, useWindowDimensions, View} from 'react-native';
import {Text} from 'react-native-paper';
import AppButton from '../../../components/AppButton';
import AppSearchField, {
  APP_SEARCH_MIN_ITEMS,
} from '../../../components/AppSearchField';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SkeletonLoader, {
  SkeletonSection,
} from '../../../components/SkeletonLoader';
import {
  InvoiceSourceRow,
  useInvoiceStyles,
} from '../InvoiceInfo/InvoicePaymentParts';

const InvoicePaymentOptions = ({
  cards,
  loading,
  renderInvoice,
  reviewError,
  onSelect,
}) => {
  const {styles} = useInvoiceStyles();
  const {height} = useWindowDimensions();
  const [selectedId, setSelectedId] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const selectedSource = cards.find(card => card.id === selectedId);

  useEffect(() => {
    if (
      selectedId == null &&
      cards.length === 1 &&
      !cards[0].option.conversion
    ) {
      setSelectedId(cards[0].id);
    }
  }, [cards, selectedId]);

  // The search field shows only from 7 payment sources. `cards` is the whole
  // list, so the count ignores the search text and the field does not
  // disappear while the user types. When it hides, the search text resets.
  const searchable = cards.length >= APP_SEARCH_MIN_ITEMS;
  const activeSearch = searchable ? search.trim().toLowerCase() : '';

  useEffect(() => {
    if (!searchable) setSearch('');
  }, [searchable]);

  const filteredCards = cards.filter(card =>
    card.searchTerms.some(term =>
      String(term).toLowerCase().includes(activeSearch),
    ),
  );
  const draft = cards.find(card => card.id === draftId);
  const open = () => {
    setSearch('');
    setDraftId(selectedSource?.id || null);
    setVisible(true);
  };

  return (
    <>
      {renderInvoice({
        selectedSource,
        onChooseSource: open,
        loadingSources: loading,
        onReviewPayment: () => selectedSource && onSelect(selectedSource),
        reviewError,
      })}
      <BottomSheetModal
        visible={visible}
        onClose={() => setVisible(false)}
        maxHeight="82%">
        <View style={[styles.sheet, {maxHeight: height * 0.72}]}>
          <Text accessibilityRole="header" style={styles.stepTitle}>
            Pay with
          </Text>
          {searchable && (
            <AppSearchField
              accessibilityLabel="Search payment sources"
              placeholder="Search currencies and addresses"
              value={search}
              onChangeText={setSearch}
              resultCount={filteredCards.length}
              style={styles.selectionSection}
            />
          )}
          <ScrollView
            style={styles.sheetScroll}
            keyboardShouldPersistTaps="handled">
            {loading && cards.length === 0 ? (
              <SkeletonLoader accessibilityLabel="Finding payment sources">
                <SkeletonSection rows={2} />
              </SkeletonLoader>
            ) : cards.length === 0 ? (
              <View style={styles.state}>
                <Text style={styles.selectionTitle}>
                  No available payment source
                </Text>
                <Text style={styles.text}>
                  No supported address has enough balance for this invoice.
                </Text>
              </View>
            ) : filteredCards.length === 0 ? (
              <Text style={styles.text}>No matching currencies or addresses.</Text>
            ) : (
              [false, true].map(conversion => {
                const group = filteredCards.filter(
                  card => !!card.option.conversion === conversion,
                );
                return (
                  group.length > 0 && (
                    <View key={String(conversion)}>
                      <Text style={styles.groupLabel}>
                        {conversion ? 'Pay with conversion' : 'Pay directly'}
                      </Text>
                      {group.map(card => (
                        <InvoiceSourceRow
                          key={card.id}
                          title={`${conversion ? '≈ ' : ''}${
                            card.option.amount ? `${card.option.amount} ` : ''
                          }${card.option.coinObj.display_ticker}`}
                          detail={`${card.option.wallet.name} · Balance ${
                            card.balanceDisplay
                          } ${card.option.coinObj.display_ticker}${
                            card.networkLabel ===
                            card.option.coinObj.display_ticker
                              ? ''
                              : ` · ${card.networkLabel}`
                          }`}
                          selected={draftId === card.id}
                          onPress={() => setDraftId(card.id)}
                        />
                      ))}
                    </View>
                  )
                );
              })
            )}
            {draft?.option.conversion && (
              <Text style={styles.footnote}>
                {draft.option.via ? `Via ${draft.option.via}. ` : ''}Conversion
                estimate. Network fee shown at review.
              </Text>
            )}
          </ScrollView>
          <AppButton
            disabled={
              cards.length > 0 && !cards.some(card => card.id === draftId)
            }
            onPress={() => {
              setSelectedId(draftId);
              setVisible(false);
            }}>
            {draft
              ? `Use ${draft.option.coinObj.display_ticker}${
                  draft.option.conversion ? ' with conversion' : ''
                }`
              : cards.length === 0
              ? 'Back to invoice'
              : 'Use this address'}
          </AppButton>
        </View>
      </BottomSheetModal>
    </>
  );
};

export default InvoicePaymentOptions;

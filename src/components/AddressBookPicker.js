import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {Button, List, Modal, Portal, Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {createSignedInStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';
import {
  addressBookRecordMatchesContext,
  loadAddressBook,
} from '../utils/addressBook/addressBook';

const AddressBookPicker = ({asset, disabled = false, network, onSelect}) => {
  const theme = useOnboardingTheme();
  const styles = createSignedInStyles(theme);
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) return;

    let active = true;
    setLoading(true);
    setError(null);
    loadAddressBook()
      .then(result => {
        if (active) setRecords(result);
      })
      .catch(e => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [visible]);

  const compatibleRecords = useMemo(
    () =>
      records
        .filter(record => addressBookRecordMatchesContext(record, {asset, network}))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [asset, network, records],
  );

  return (
    <>
      <Button
        compact
        disabled={disabled}
        icon="book-account-outline"
        accessibilityLabel="Choose from Address Book"
        onPress={() => setVisible(true)}>
        Address Book
      </Button>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={{
            backgroundColor: theme.colors.sheet,
            margin: theme.spacing.md,
            borderRadius: theme.rounded.xl,
            paddingTop: theme.spacing.lg,
            paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
            maxHeight: '82%',
          }}>
          <Text
            style={[
              theme.typography.titleSheet,
              {color: theme.colors.textPrimary, paddingHorizontal: theme.spacing.lg},
            ]}>
            Choose a recipient
          </Text>
          {loading ? (
            <Text style={[styles.subtitle, {padding: theme.spacing.lg}]}>Loading…</Text>
          ) : error ? (
            <Text style={[styles.subtitle, {padding: theme.spacing.lg}]}>{error}</Text>
          ) : compatibleRecords.length === 0 ? (
            <Text style={[styles.subtitle, {padding: theme.spacing.lg}]}>
              No saved addresses match this Asset and network.
            </Text>
          ) : (
            <ScrollView style={{marginTop: theme.spacing.md}}>
              {compatibleRecords.map((record, index) => (
                <React.Fragment key={record.id}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => {
                      setVisible(false);
                      onSelect(record);
                    }}>
                    <List.Item
                      title={record.label}
                      description={record.address}
                      titleStyle={styles.rowTitle}
                      descriptionStyle={styles.rowDescription}
                      style={styles.row}
                      right={props => (
                        <List.Icon
                          {...props}
                          icon="chevron-right"
                          color={theme.colors.textSubtle}
                        />
                      )}
                    />
                  </TouchableOpacity>
                  {index < compatibleRecords.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </React.Fragment>
              ))}
            </ScrollView>
          )}
        </Modal>
      </Portal>
    </>
  );
};

export default AddressBookPicker;

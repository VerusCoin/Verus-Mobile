/*
  ListSelectionModal
  - Modal with searchable list selection
  - Updated 2026-01-22: Converted to modern SemiModal with search bar
*/

import React, { Component } from "react";
import SemiModal from "../SemiModal";
import { List } from "react-native-paper"
import { TouchableOpacity, FlatList, View, TextInput as RNTextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native"
import Colors from "../../globals/colors";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

class ListSelectionModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchQuery: '',
      searchFocused: false,
    };
  }

  handleSelect = (item) => {
    const { onSelect, cancel } = this.props;
    this.setState({ searchQuery: '' });
    if (onSelect) {
      onSelect(item);
      cancel();
    }
  }

  getFilteredData = () => {
    const { data } = this.props;
    const { searchQuery } = this.state;

    if (!searchQuery.trim()) {
      return data;
    }

    const query = searchQuery.toLowerCase().trim();
    return data.filter((item) => 
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.key?.toLowerCase().includes(query)
    );
  }

  render() {
    const { visible, cancel, selectedKey, title, flexHeight } = this.props;
    const { searchQuery, searchFocused } = this.state;
    const filteredData = this.getFilteredData();

    return (
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={cancel}
        title={title}
        flexHeight={flexHeight ? flexHeight : 0.01}
        contentContainerStyle={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          flex: 0,
          width: '100%',
          alignSelf: 'flex-end',
          maxHeight: '80%',
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <View style={styles.container}>
            {/* Search bar */}
            <View style={styles.searchContainer}>
              <View
                style={[
                  styles.searchInputContainer,
                  searchFocused && styles.searchInputFocused,
                ]}
              >
                <RNTextInput
                  value={searchQuery}
                  onChangeText={(text) => this.setState({ searchQuery: text })}
                  onFocus={() => this.setState({ searchFocused: true })}
                  onBlur={() => this.setState({ searchFocused: false })}
                  placeholder="Search currencies"
                  placeholderTextColor="#999"
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  style={styles.searchInput}
                />
                <View style={styles.searchIcon}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#999" />
                </View>
              </View>
            </View>

          {/* Currency list */}
          <FlatList
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderItem={({ item }) => {
                const isSelected = item.key === selectedKey;
                return (
                  <TouchableOpacity 
                    onPress={() => this.handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <List.Item
                      title={item.title}
                      description={item.description}
                      titleStyle={styles.itemTitle}
                      descriptionStyle={styles.itemDescription}
                      right={(props) => (
                        <List.Icon 
                          {...props} 
                          icon="check" 
                          color={isSelected ? Colors.primaryColor : 'transparent'}
                        />
                      )}
                      style={styles.listItem}
                    />
                  </TouchableOpacity>
                );
              }}
              data={filteredData}
              keyExtractor={(item) => item.key}
              keyExtractor={(item, index) => item.key || `item-${index}`}
          />
          </View>
        </KeyboardAvoidingView>
      </SemiModal>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    height: 44,
  },
  searchInputFocused: {
    backgroundColor: '#FFF',
    borderColor: Colors.primaryColor,
    shadowColor: Colors.primaryColor,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#000',
  },
  searchIcon: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
  },
  listContainer: {
    maxHeight: 500,
  },
  listContent: {
    paddingBottom: 8,
  },
  listItem: {
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default ListSelectionModal;

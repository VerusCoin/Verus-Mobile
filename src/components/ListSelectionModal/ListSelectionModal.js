/*
  ListSelectionModal
  - Modal with searchable list selection
  - Updated 2026-01-22: Converted to modern SemiModal with search bar
*/

import React, { Component } from "react";
import SemiModal from "../SemiModal";
import { List } from "react-native-paper"
import { TouchableOpacity, FlatList, View, TextInput as RNTextInput, KeyboardAvoidingView, Platform } from "react-native"
import { listSelectionModalStyles as styles } from "../../styles";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

class ListSelectionModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchQuery: '',
      searchFocused: false,
    };
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.visible &&
      !this.props.visible &&
      (this.state.searchQuery.length > 0 || this.state.searchFocused)
    ) {
      this.setState({ searchQuery: '', searchFocused: false });
    }
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
    const { data, showSearch } = this.props;
    const { searchQuery } = this.state;
    const dataList = Array.isArray(data) ? data : [];

    if (!showSearch || !searchQuery.trim()) {
      return dataList;
    }

    const query = searchQuery.toLowerCase().trim();
    return dataList.filter((item) => 
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.key?.toString().toLowerCase().includes(query)
    );
  }

  render() {
    const {
      visible,
      cancel,
      selectedKey,
      title,
      flexHeight,
      showSearch = false,
      searchPlaceholder = "Search",
      keyExtractor,
    } = this.props;
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
            {showSearch && (
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
                    placeholder={searchPlaceholder}
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
            )}

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
              keyExtractor={keyExtractor || ((item, index) => (
                item?.key != null ? item.key.toString() : `item-${index}`
              ))}
          />
          </View>
        </KeyboardAvoidingView>
      </SemiModal>
    );
  }
}

export default ListSelectionModal;

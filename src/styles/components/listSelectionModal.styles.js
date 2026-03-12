/*
  ListSelectionModal.styles 
  - Shared styles for the searchable list-selection modal.
*/
import { StyleSheet } from 'react-native';
import Colors from '../../globals/colors';

// Codex GPT-5: keep the list-selection search UI reusable without keeping styles in the component file.
export default StyleSheet.create({
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

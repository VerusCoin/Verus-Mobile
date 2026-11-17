/*
  ListSelectionModal.styles 
  - Shared styles for the searchable list-selection modal.
*/
import { StyleSheet } from 'react-native';

// keep the list-selection search UI reusable without keeping styles in the component file.
export default StyleSheet.create({
  container: {
    flex: 0,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
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

/*
  IdentityPickerSheet.styles 
  - Styles for the authentication identity picker bottom sheet.
*/
import { StyleSheet } from 'react-native';
import Colors from '../../globals/colors';

// Codex GPT-5: keep the authentication identity picker presentation centralized for reuse.
export default StyleSheet.create({
  description: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
  networkGroup: {
    marginBottom: 20,
  },
  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  networkHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  identityCardSelected: {
    backgroundColor: '#F0F9F1',
    borderWidth: 1,
    borderColor: Colors.verusGreenColor,
  },
  identityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  identityTextSection: {
    flex: 1,
  },
  identityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  identityNameSelected: {
    color: Colors.verusGreenColor,
  },
  identityAddress: {
    fontSize: 12,
    color: '#888',
  },
  chevron: {
    marginLeft: 8,
  },
  scrollView: {
    maxHeight: 400,
  },
});

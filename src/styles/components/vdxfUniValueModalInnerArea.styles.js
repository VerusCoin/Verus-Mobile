/*
  VdxfUniValueModalInnerArea.styles 
  - Styles for the content multimap remove-action detail modal.
*/
import { StyleSheet } from 'react-native';
import Colors from '../../globals/colors';

// Codex GPT-5: keep the remove-action renderer focused on content selection instead of styling.
export default StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.secondaryColor,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  section: {
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.quinaryColor,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionBody: {
    color: Colors.verusDarkGray,
    fontSize: 14,
    lineHeight: 20,
  },
});

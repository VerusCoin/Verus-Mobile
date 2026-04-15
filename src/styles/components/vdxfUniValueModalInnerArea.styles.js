/*
  VdxfUniValueModalInnerArea.styles 
  - Styles for the content multimap remove-action detail modal.
*/
import { StyleSheet } from 'react-native';
import Colors from '../../globals/colors';

// keep the remove-action renderer focused on content selection instead of styling.
export default StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.secondaryColor,
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  signDataContent: {
    paddingBottom: 24,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'flex-end',
    backgroundColor: Colors.secondaryColor,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF6FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyButtonIcon: {
    marginRight: 6,
  },
  copyButtonText: {
    color: Colors.primaryColor,
    fontSize: 13,
    fontWeight: '600',
  },
  fieldCopyIcon: {
    alignSelf: 'center',
    marginRight: 12,
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
  rawDataText: {
    color: Colors.verusDarkGray,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Courier',
  },
});

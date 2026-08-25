/*
  AuthorityInfoSheet.styles 
  - Sheet container and copy styles for authority explainer content.
*/
import { StyleSheet } from 'react-native';

// keep authority explainer presentation isolated from the sheet copy.
export default StyleSheet.create({
  sheetContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flex: 0,
    alignSelf: 'flex-end',
    width: '100%',
    backgroundColor: 'white',
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  paragraph: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
    marginBottom: 16,
  },
});

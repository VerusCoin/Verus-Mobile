import { StyleSheet } from 'react-native';
import Colors from '../../../globals/colors';

export default StyleSheet.create({

  identities: {
    backgroundColor:
            '#b5b5b5',
    marginVertical: '2%',
    paddingVertical: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.43,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    color: '#d6cccb',
  },
  textIdentities: {
    paddingLeft: 16,
    fontSize: 16,
  },

});

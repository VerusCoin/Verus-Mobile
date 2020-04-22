import { StyleSheet } from 'react-native';


export default StyleSheet.create({
  root: {
    flex: 1,
    padding:16,
  },
  button: {
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
});

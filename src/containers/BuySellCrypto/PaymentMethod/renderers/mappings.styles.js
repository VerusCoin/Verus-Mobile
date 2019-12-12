import { StyleSheet } from 'react-native';
import Colors from '../../../../globals/colors';

export default StyleSheet.create({
  manageAccountView: {
    marginTop: 15,
  },
  manageAccountLabel: {
    height: 45,
    backgroundColor: Colors.successButtonColor
  },
  bankAccountLabel: {
    color: 'black',
    fontSize: 17,
    fontWeight: '500',
    padding: 5,
    textAlign: 'center'
  },
  bankAccountContainer: {
    flex: 1,
    padding: 10,
  },
  coinItemLabel: {
    color: Colors.quaternaryColor,
    marginLeft: 10,
    fontSize: 18,
    fontWeight: '600'
  },
  coinItemContainer: {
    borderBottomWidth: 0,
  },
  formInput: {
    width: '100%',
    marginLeft: 0,
    borderWidth: 1,
    borderRadius: 7,
    borderColor: '#86939e',
    padding: 5,
  },
  rightTitleStyle: {
    color: Colors.quaternaryColor,
  },
});

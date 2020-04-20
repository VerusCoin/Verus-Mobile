import { StyleSheet } from 'react-native';
import Colors from '../../globals/colors';
import GlobalStyles from '../../globals/globalStyles';

export default StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.secondaryColor,
  },
  iconStyle: {
    color: Colors.secondaryColor,
  },
  bottomMenuStyle: {
    flexDirection: 'row', 
    alignSelf: 'center', 
    justifyContent: 'center',
  },
  bottomMenuLabelStyle: {
    fontSize: 12,
    fontFamily: GlobalStyles.AvenirBook,
    color: Colors.secondaryColor,
    fontWeight: 'bold',
    padding: 8,
  },
  bottomNavigation: {
    backgroundColor: Colors.linkButtonColor,
  }
});

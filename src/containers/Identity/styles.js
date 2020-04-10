import { StyleSheet } from 'react-native';
import Colors from '../../globals/colors';
import GlobalStyles from '../../globals/globalStyles';

export default styles = StyleSheet.create({
  root: {
    flex: 1,
    elevation: 5,
    backgroundColor:'white'
  },
  iconStyle: {
    flex: 1,
    height: 20,
    margin: 3,
    resizeMode: 'contain',
    tintColor: Colors.darkGreyColor,
    color:'grey'
  },
  bottomMenuStyle: {
    flex: 1,
    elevation: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderTopWidth: 0.2,
    borderTopColor: Colors.quinaryColor,
  },
  bottomMenuLabelStyle: {
    fontSize: 12,
    fontFamily: GlobalStyles.AvenirBook,
    color:  Colors.darkGreyColor,
    fontWeight: '200',
  },
  activeTabLabelStyle: {
    color: Colors.linkButtonColor,
  },
  activeTabIconStyle: {
    color: Colors.linkButtonColor,
  },
});

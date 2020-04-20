import { StyleSheet } from 'react-native';
import Colors from '../../../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'center'
  },
  activeAttestation: {
    backgroundColor: Colors.successButtonColor,
    paddingHorizontal: '14%',
    borderRadius: 5,
    paddingVertical: 16,
  },
  attestaionText: {
    color: 'white',
    fontSize: 16
  },
  qrCode: {
    marginVertical: '10%',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    paddingHorizontal: 10,
  },

});

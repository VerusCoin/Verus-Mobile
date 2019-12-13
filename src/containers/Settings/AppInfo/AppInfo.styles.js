import { StyleSheet } from "react-native";
import Colors from '../../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: "white",
    flex: 1,
  },
  infoBox: {
    flex: 1,
    flexDirection: 'column',
    alignSelf: 'center',
    justifyContent: 'flex-start',
    width: "85%",
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 10
  },
  infoText: {
    fontSize: 16,
    color: Colors.quinaryColor,
    fontFamily: 'Avenir-Book'
  },
  linkBox: {
    width: "65%",
  },
  linkText: {
    fontSize: 16,
    color: "#2E86AB",
    textAlign: "right",
    fontFamily: 'Avenir-Book'
  },
  verifiedLabel: {
    marginTop: 10,
    marginBottom: 15,
    fontSize: 22,
    textAlign: "center",
    color: Colors.quinaryColor
  },
  imageStyle: {
    width: '30%',
    marginTop: '10%',
    resizeMode: 'contain',
    alignSelf: 'center'
  },
  imageStyleContainer:{
    width: '100%',
    backgroundColor: Colors.tertiaryColor,
    marginBottom: '10%'
  }
});
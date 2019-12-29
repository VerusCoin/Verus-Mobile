import { StyleSheet } from "react-native";
import Colors from '../../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
    alignItems: "center"
  },
  fiatBalanceLabel: {
    backgroundColor: "transparent",
    opacity: 0.89,
    marginTop: 15,
    marginBottom: 15,
    paddingBottom: 0,
    paddingTop: 0,
    fontSize: 25,
    textAlign: "center",
    color: Colors.quaternaryColor,
    fontFamily: 'Avenir-Book'
  },
  coinItemLabel: {
    color: Colors.quaternaryColor,
    marginLeft: 10,
    fontFamily: 'Avenir-Book',
    fontSize: 19,
    marginVertical: 10
  },
  balanceSheetLabel: {
    width: "100%",
    backgroundColor: Colors.tertiaryColor,
    opacity: 0.86,
    marginLeft:10,
    marginTop: 0,
    marginBottom: 0,
    paddingBottom: 15,
    paddingTop: 15,
    fontSize: 22,
    fontFamily: 'Avenir',
    textAlign: "center",
    color: Colors.quinaryColor,
    fontWeight: 'bold'
  },
  coinList: {
    width: "90%",
    marginVertical: '3%'
  },
});
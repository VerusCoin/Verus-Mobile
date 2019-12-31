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
    color: Colors.quinaryColor,
    fontFamily: 'Avenir-Book'
  },
  coinItemLabel: {
    color: Colors.quinaryColor,
    marginLeft: 10,
    fontSize: 19,
    fontFamily: 'Avenir-Book',
    marginVertical: 10
  },
  balanceSheetLabel: {
    width: "100%",
    backgroundColor: Colors.tertiaryColor,
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 0,
    paddingBottom: 15,
    paddingTop: 15,
    fontSize: 22,
    textAlign: "center",
    color: Colors.quaternaryColor,
    fontFamily: 'Avenir-Black'
  },
  coinList: {
    width: "90%",
  },
});
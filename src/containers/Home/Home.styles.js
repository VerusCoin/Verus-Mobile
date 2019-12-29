import { StyleSheet } from "react-native";
import Colors from '../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
    alignItems: "center",
  },

  fiatBalanceLabel: {
    backgroundColor: Colors.tertiaryColor,
    paddingTop: 40,
    fontSize: 60,
    textAlign: "center",
    color: Colors.quaternaryColor,
    width: '100%',
    fontFamily:'Avenir-Book',
    height: '25%',
    fontWeight: 'bold'
  },
  coinItemLabel: {
    color: Colors.quinaryColor,
    marginLeft: 10,
    fontFamily:'Avenir-Black',
    fontSize: 18,
  },
  balanceSheetLabel: {
    width: "100%",
    backgroundColor: Colors.secondaryColor,
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 0,
    paddingBottom: 15,
    paddingTop: 15,
    fontSize: 25,
    textAlign: "left",
    color: Colors.quinaryColor,
    paddingLeft: 30,
    fontFamily:'Avenir-Black',
  },
  coinList: {
    width: "90%",
  },
});

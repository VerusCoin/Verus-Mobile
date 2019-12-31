import { StyleSheet } from "react-native";
import Colors from '../../globals/colors';

export default styles = StyleSheet.create({
  loadingRoot: {
    backgroundColor: Colors.tertiaryColor,
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingLabel: {
    backgroundColor: "transparent",
    marginTop: 15,
    fontSize: 18,
    textAlign: "center",
    color: Colors.quinaryColor,
    width: "70%",
    fontFamily: 'Avenir-Book',
    fontWeight: 'normal'
  },
});
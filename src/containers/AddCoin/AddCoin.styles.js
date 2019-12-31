import { StyleSheet } from "react-native";
import Colors from '../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
    alignItems: "center"
  },
  coinList: {
    width: "90%",
  },
  listItemContainer: {
    borderBottomWidth: 0,
  }
});
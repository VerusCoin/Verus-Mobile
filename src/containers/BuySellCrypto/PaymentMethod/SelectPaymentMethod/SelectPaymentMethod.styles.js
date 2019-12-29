import { StyleSheet } from "react-native";
import Colors from '../../../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
    flexDirection: "column",
    paddingVertical: 50,
    marginHorizontal: -30,
  },
  inputAndDropDownContainer: {
    width: "85%",
    alignItems: "flex-start",
    flex: 1,
    flexDirection: "row",
    alignSelf: "center",
    maxHeight: 100
  },
  saveChangesButton: {
    height: 46,
    backgroundColor: "#009B72",
  },
  paymentMethodText: {
    fontSize: 25,
    color: '#86939e',
    paddingLeft: 30,
    padding: 30,
  },
});

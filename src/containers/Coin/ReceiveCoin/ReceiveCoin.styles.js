import { StyleSheet } from "react-native";
import Colors from '../../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
    color: Colors.quinaryColor,
    fontWeight: 'normal',
    fontSize: 17,
    fontFamily: 'Avenir',
  },
  formInput: {
    width: "100%",
    color: Colors.quinaryColor,
    fontSize: 16,
    fontFamily: 'Avenir',
  },
  valueContainer: {
    width: "85%",
  },
  wifLabel: {
    backgroundColor: "transparent",
    marginTop: 50,
    marginBottom: 8,
    paddingBottom: 0,
    fontSize: 22,
    color: Colors.quaternaryColor,
    width: "85%",
    textAlign: "center",
    fontFamily: 'Avenir-Black',
  },
  wifInput: {
    width: "100%",
    color: "#009B72",
    fontSize: 16,
  },
  singleButtonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
  },
  labelContainer: {
    width: "94%",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  addAccountButton: {
    height: 46,
    backgroundColor: Colors.successButtonColor,
    marginTop: 15,
    marginBottom: 40,
    width: '100%'
  },
  dropDownContainer: {
    width: "85%",
    alignItems: "center"
  },
  dropDown: {
    width: '85%',
    marginBottom: 0,
    marginTop: 0,
  },
  swapInputTypeBtn: {
    textAlign:"left",
    marginRight: "auto",
    color: "#2E86AB"
  },
  swapInputTypeBtnBordered: {
    marginRight: "auto",
    color: "#2E86AB",
    borderRadius: 10,
    backgroundColor: Colors.tertiaryColor,
    paddingLeft: 5,
    paddingRight: 5,
    overflow: "hidden"
  },
});

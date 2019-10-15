import { StyleSheet } from "react-native";

export default styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    flexDirection: "column"
  },
  formLabel: {
    textAlign:"left",
    marginLeft: 3
  },
  formInputLabelContainer: {
    flex: 1,
  },
  valueContainer: {
    width: "85%",
  },
  formInput: {
    width: "100%",
    marginLeft: 0,
  },
  currencyLabel: {
    color: '#86939e',
    fontWeight: 'bold',
    fontSize: 20
  },
  dropDownContainer: {
    paddingHorizontal: 3, 
    width: "100%", 
    flex: 1, 
    flexDirection: "column", 
    justifyContent: 'flex-start', 
    alignItems: 'stretch'
  },
  dropDownBase: {
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    paddingTop: 15
  },
  dropDownIcon: {
    marginLeft: 0,
    paddingLeft: 0
  },
  formInputContainer: {
    width: "100%",
    marginLeft: 0,
    paddingRight: 0
  },
  buttonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  currencyDropDownContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  inputAndDropDownContainer: {
    width: "85%",
    alignItems: "flex-start",
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    maxHeight: 100
  },
  saveChangesButton: {
    height: 46,
    backgroundColor: "#009B72",
  },
  backButton: {
    height: 46,
    backgroundColor: "rgba(206,68,70,1)",
  },
});

import { StyleSheet } from "react-native"; 
import Colors from '../../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
    flexDirection: "column"
  },
  formLabel: {
    textAlign:"left",
    marginLeft: 3,
    color: 'black'
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
    color: 'black',
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
    width: "100%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: '7%',
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
    maxHeight: 80,
  },
  saveChangesButton: {
    height: 44,
    backgroundColor: Colors.successButtonColor,
    width: '100%',
  },
  backButton: {
    height: 46,
    backgroundColor: Colors.warningButtonColor,
    width: '40%',
  },
  touchableInputBank: {
    width: "85%",
    margin: 20,
  },
  inputBankFieldText:{
    color: 'black',
  },
  coinItemLabel: {
    color: "black",
    marginLeft: 10,
  },
});

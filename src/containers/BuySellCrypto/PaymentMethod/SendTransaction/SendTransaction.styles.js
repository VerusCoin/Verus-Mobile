import { StyleSheet } from "react-native";

export default styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    flexDirection: "column",
    paddingVertical: "8%",
  },
  containerConfirmTransaction: {
    flexDirection: "column",
  },
  containerTransactionInfo: {
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#86939e',
    marginHorizontal: '5%',
    paddingVertical: '2%',
    marginBottom: '4%',
  },
  buttonContainer: {
    width: "100%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-around",
    alignSelf: 'center',
    marginHorizontal: '5%',
  },
  saveChangesButton: {
    height: 30,
    backgroundColor: "#009B72",
    width: '41%',
    marginVertical: 3,
  },
  backButton: {
    height: 30,
    backgroundColor: "rgba(206,68,70,1)",
    width: '41%',
    marginVertical: 3,
  },
  textStyle: {
      marginHorizontal: '2%',
      color: "white",
      textAlign: 'center',
  },
  textTransactionHistory: {
    color: 'white', 
    fontSize: 16, 
    marginVertical: '5%', 
    paddingTop: '5%', 
    paddingLeft: '5%', 
    fontWeight: '700'
  },
  containerTransactionHistory: {
    borderTopWidth: 1, 
    borderTopColor: 'white',
  },
  itemTextTransactionHistory: { 
    color: 'white'
  },
  itemContainerTransactionHistory: {
    borderBottomColor: 'white',
    borderBottomWidth: 0,
  },
  itemIdTransactionHistory: {
    color: '#86939e',
    fontSize: 13
  },
  rightTitleStyle: {
    fontSize: 17, 
  }
});

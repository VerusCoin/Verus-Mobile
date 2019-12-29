import { StyleSheet } from "react-native";
import Colors from '../../../../globals/colors';

export default styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
    flexDirection: "column",
    paddingTop: '3%'
  },
  containerConfirmTransaction: {
    flexDirection: "column",
  },
  containerTransactionInfo: {
    borderRadius: 7,
    backgroundColor: Colors.tertiaryColor,
    marginHorizontal: '5%',
    paddingVertical: '2%',
    marginBottom: '4%',
    paddingHorizontal: '2%',
  },
  buttonContainer: {
    width: "90%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: 'center',
  },
  saveChangesButton: {
    height: 44,
    backgroundColor: Colors.successButtonColor,
    width: '63%',
    marginVertical: 3,
  },
  backButton: {
    height: 44,
    backgroundColor: Colors.basicButtonColor,
    width: '35%',
    marginVertical: 3,
  },
  transactionInfoTitleTextStyle: {
    color: Colors.quinaryColor,
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: '2%',
    fontFamily: 'Avenir',
  },
  transactionInfoSubtitleTextStyle: {
    color: Colors.quaternaryColor,
    fontSize: 15,
    fontFamily: 'Avenir',
  },
  textTransactionHistory: {
    color: Colors.quinaryColor, 
    fontSize: 20, 
    marginVertical: '5%', 
    paddingTop: '5%', 
    paddingLeft: '5%', 
    fontWeight: '700',
    fontFamily: 'Avenir',
  },
  itemTextTransactionHistory: { 
    color: Colors.quinaryColor,
    fontFamily: 'Avenir',
    fontWeight: 'normal'
  },
  itemContainerTransactionHistory: {
    borderBottomWidth: 0,
  },
  itemIdTransactionHistory: {
    color: Colors.quinaryColor,
    fontSize: 13,
    fontFamily: 'Avenir',
  },
  rightTitleStyle: {
    fontSize: 17, 
    color: Colors.quinaryColor,
    fontFamily: 'Avenir',
    fontWeight: '500'
  },
  containerTransactionView: {
    width: '90%',
    backgroundColor: Colors.tertiaryColor,
    alignSelf: 'center',
    borderRadius:  10,
    marginBottom: '3%'
  },
});

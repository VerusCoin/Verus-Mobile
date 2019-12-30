import { StyleSheet } from "react-native";
import Colors from '../../globals/colors'

export default styles = StyleSheet.create({
  loadingRoot: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingLabel: {
    backgroundColor: "transparent",
    marginTop: 15,
    fontSize: 15,
    textAlign: "center",
    color: Colors.quaternaryColor,
    width: "70%"
  },
  root: {
    backgroundColor: Colors.secondaryColor,
    flex: 1,
  },
  infoBox: {
    flex: 1,
    flexDirection: 'column',
    alignSelf: 'center',
    justifyContent: 'flex-start',
    width: "85%",
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 10
  },
  infoText: {
    fontSize: 16,
    color: Colors.quaternaryColor
  },
  linkBox: {
    width: "65%",
  },
  linkText: {
    fontSize: 16,
    color: "#2E86AB",
    textAlign: "right"
  },
  verifiedLabel: {
    marginTop: 10,
    marginBottom: 15,
    fontSize: 22,
    textAlign: "center",
    color: Colors.quaternaryColor
  },
});
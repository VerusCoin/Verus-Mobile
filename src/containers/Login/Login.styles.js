import { StyleSheet } from "react-native";
import Colors from '../../globals/colors';
import { bold } from "ansi-colors";

export default styles = StyleSheet.create({
    root: {
        backgroundColor: Colors.secondaryColor,
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
    },
    loginLabel: {
        backgroundColor: "transparent",
        fontSize: 22,
        color: Colors.quaternaryColor,
        width: "85%",
        textAlign: "center",
        fontFamily: 'Avenir-Medium',
    },
    formLabel: {
        textAlign: "left",
        marginRight: "auto",
        color: Colors.quinaryColor,
        fontWeight: "200",
    },
    valueContainer: {
        width: "85%",
    },
    dropDownContainer: {
        marginTop: "5%",
        width: "85%",
        alignItems: "center",
    },
    formInput: {
        width: "100%",
        color: Colors.quaternaryColor,
        fontFamily: 'Avenir-Book',
    },
    dropDown: {
        width: "90%",
        marginBottom: 0,
        marginTop: 0,
    },
    unlockButton: {
        height: 45,
        width: '78%',
        alignSelf: 'center',
        marginTop: '2%',
        marginBottom: 0,
        fontSize: 16,
        fontFamily: 'Avenir-Black',
        fontWeight: '600',
        backgroundColor: Colors.linkButtonColor,
    },
    loadingContainer: {
        width: 400,
        backgroundColor: "transparent",
        justifyContent: "center",
        paddingBottom: 0,
        paddingTop: 0,
        marginBottom: 8,
        marginTop: 28
    },
    loadingText: {
        backgroundColor: "transparent",
        fontSize: 22,
        textAlign: "center",
        color: Colors.quinaryColor,
        fontFamily: 'Avenir-Book'
    },
    buttonContainer: {
        width: '100%',
        alignSelf: 'center'
    },
    signUpTextContainer: {
        flexDirection: 'row',
        marginVertical: '8%',
        alignSelf: 'center',
    },
    signUpText: {
        color: Colors.linkButtonColor,
        fontFamily: 'Avenir-Black',
    },
    signUpTextQuestion: {
        fontFamily: 'Avenir-Black',
        color: Colors.quaternaryColor
    },
    passwordContainer: {
        width: '90%',
        flexDirection: 'row',
        alignSelf: 'center'
    },
    passwordInputContainer: {
        width: '85%',
    },
});
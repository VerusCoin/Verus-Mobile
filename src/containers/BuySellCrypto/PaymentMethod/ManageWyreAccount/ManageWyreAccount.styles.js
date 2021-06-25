import { StyleSheet } from 'react-native';
import Colors from '../../../../globals/colors';

export default StyleSheet.create({
    userProfileContainer: {
        backgroundColor: Colors.secondaryColor,
        height: '100%'
    },
    viewContainer: {
        width: '90%',
        borderRadius: 7,
        borderWidth: 0.8,
        borderColor: Colors.quaternaryColor,
        height: '8%',
        margin: '2%',
        marginVertical: 0,
        paddingVertical: 0,
        marginBottom: '2%',
    },
    wyreCard: {
        paddingLeft: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
        width: '100%',
        marginVertical: 0,
        paddingVertical: 0,
    },
    wyreInfo: {
        fontSize: 13,
        color: '#86939e',
    },
    wyreCardText: {
        color: Colors.quaternaryColor,
        paddingLeft: 10,
        fontFamily: 'Avenir-Book',
        fontSize: 16,
    },
    wyreCardIconContainer: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
    },
    icon: {
        width: 20,
        height: 20,
        tintColor: 'black'
    },
    buttonSubmit: {
        alignSelf: 'center',
        marginTop: 10,
        height: 46,
        width: '90%',
        backgroundColor: "#009B72",
    },
    buttonConfirm: {
        width: '100%',
        height: 40,
        backgroundColor: '#009B72',
        marginTop: 15,
    },
    buttonCancel: {
        width: '100%',
        height: 40,
        backgroundColor: Colors.basicButtonColor,
        marginTop: 15,
    },
    buttonSelect: {
        alignSelf: 'center',
        height: 46,
        width: '90%',
        backgroundColor: "#009B72"
    },
    mainInputView: {
        backgroundColor: Colors.secondaryColor,
        height: '100%',
        paddingBottom: 10,
        paddingHorizontal: '5%',
        paddingVertical: '5%'
    },
    formLabel: {
        fontSize: 16,
        textAlign: 'left',
        paddingTop: '0%',
        color: Colors.quaternaryColor,
        marginVertical: 0,
        paddingVertical: 0,
        fontFamily: 'Avenir-Book',
        fontWeight: 'normal'
    },
    buttonContainer: {
        width: '80%',
        paddingTop: 10,
        backgroundColor: 'transparent',
        flexDirection: 'column',
        alignSelf: 'center',
        alignContent: 'flex-end',
        marginTop: '40%',
    },
    imageContainer: {
        width: 280,
        height: 280,
        alignSelf: 'center',
        marginVertical: 20,
    },
    dropdownInput: {
        width: '100%',
        paddingHorizontal: '6%',
        marginVertical: -13,
    },
    statusInfo: {
        color: Colors.quaternaryColor,
        alignSelf: 'center',
        fontSize: 15,
        fontFamily: 'Avenir',
    },
    statusInfoHeader: {
        color: Colors.quaternaryColor,
        alignSelf: 'center',
        fontSize: 22,
        fontFamily: 'Avenir',
    },
    statusInfoContent: {
        color: Colors.quaternaryColor,
        alignSelf: 'center',
        fontSize: 15,
        fontWeight: 'bold'
    },
    buttonContainerBottom: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    inputMask: {
        color: Colors.quaternaryColor,
        borderBottomColor: '#86939d',
        borderBottomWidth: 2,
        width: '87%',
        marginLeft: 20,
        paddingVertical: 10,
    },
    formInputContainer: {
        fontSize: 15,
        width: '100%',
        marginVertical: 0,
        color: Colors.quaternaryColor,
        fontFamily: 'Avenir-Medium',
    },
    inputMaskDateOfBirth: {
        color: Colors.quaternaryColor,
        borderBottomColor: '#86939d',
        borderBottomWidth: 2,
        width: '76%',
        marginLeft: 20,
        paddingVertical: 10,
    },
    containerCalendarButton: {
        width: '15%',
        marginTop: '5%',
        marginLeft: '3%',
    },
    containerDateOfBirth: {
        flexDirection: 'row',
    },
    formValidationLabel: {
        fontSize: 12,
    },
    dropdownInputContainer: {
        borderBottomWidth: 1,
        marginTop: 15
    },
    statusButtonAdd: {
        backgroundColor: Colors.verusGreenColor,
        width: 110,
        height: 35,
        marginRight: 15,
    },
    statusButtonPending: {
        backgroundColor: Colors.infoButtonColor,
        width: 110,
        height: 35,
        marginRight: 15,
    },
    statusButtonApproved: {
        backgroundColor: 'transparent',
        width: 110,
        height: 35,
        marginRight: 15,
    },
    statusButtonApprovedStyle: {
        fontSize: 15,
        color: Colors.linkButtonColor,
        width: 130,
        textAlign: 'center',
        fontWeight: '600',
        fontFamily: 'Avenir',
    },
    statusButtonStyle: {
        fontSize: 15,
        width: 130,
        textAlign: 'center',
        fontWeight: '600',
        color: Colors.secondaryColor,
    },
});
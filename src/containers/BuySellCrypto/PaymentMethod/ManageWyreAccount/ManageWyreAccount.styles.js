import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    userProfileContainer: {
        paddingTop: 15,
        backgroundColor: '#232323',
        height: '100%'
    },
    viewContainer: {
        width: '90%',
        borderRadius: 7,
        borderWidth: 0.5,
        borderColor: '#86939e',
        height: 45,
        margin: 10,
    },
    wyreCard: {
        paddingLeft: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
        width: '100%',
    },
    userProfileHeader: {
        fontWeight: 'bold',
        paddingBottom: 20,
        fontSize: 22,
        color: '#86939e',
    },
    wyreInfo: {
        fontSize: 13,
        color: '#86939e',
    },
    wyreCardText: {
        color: 'white',
        paddingLeft: 10,
        paddingTop: 3
    },
    wyreCardIconContainer: {
        flexDirection: 'row',
    },
    icon: {
        width: 20,
        height: 20,
    },
    buttonSubmit: {
        alignSelf: 'center',
        marginTop: 10,
        height: 35,
        width: '90%',
        backgroundColor: "#009B72",
    },
    buttonConfirm: {
        width: 110,
        height: 40,
        backgroundColor: '#009B72',
    },
    buttonCancel: {
        width: 110,
        height: 40,
        backgroundColor: 'rgba(206,68,70,1)',
    },
    buttonSelect: {
        alignSelf: 'center',
        height: 46,
        width: '90%',
        backgroundColor: "#009B72"
    },
    mainInputView: {
        padding: '10%',
        backgroundColor: '#232323',
        height: '100%',
        paddingBottom: 10,
    },
    formLabel: {
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'left',
        paddingTop: '0%',
        color: '#86939e',
        marginBottom: -5,
    },
    buttonContainer: {
        width: '80%',
        paddingTop: 10,
        backgroundColor: 'transparent',
        flexDirection: 'row',
        alignSelf: 'center',
        justifyContent: 'space-between',
        height: 46,
    },
    imageContainer: {
        width: 280,
        height: 280,
        alignSelf: 'center',
        marginVertical: 20,
    },
    dropdownInput: {
        width: '90%',
        marginLeft: 20,
        marginTop: -10,
    },
    statusInfo: {
        color: 'white',
        alignSelf: 'center',
    },
    buttonContainerBottom: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    inputMask: {
      color: '#86939e',
      borderBottomColor: '#86939d',
      borderBottomWidth: 2,
      width: '87%',
      marginLeft: 20,
      paddingVertical: 10,
    },
    formInputContainer: {
      fontSize: 14,
      width: 300,
    },
    inputMaskDateOfBirth: {
      color: '#86939e',
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
});
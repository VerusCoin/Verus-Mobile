import { StyleSheet } from 'react-native';
import Colors from '../../../globals/colors';
export default StyleSheet.create({
    root: {
        flex: 1,
        marginTop: "20%",
        marginLeft: '5%'
    },
    textHeader: {
        paddingBottom: 20,
        fontSize: 30,
    },
    text: {
        fontSize: 16,
        color: 'white',
        fontWeight: 'bold',
    },
    scanToVerifyBtn: {
        flexDirection: 'row',
        backgroundColor: Colors.linkButtonColor,
        borderRadius: 8,
        padding: 10,
        marginRight: '55%',
        alignItems:'center',
    },
    icon: {
        color: '#d6cccb',
    },
});

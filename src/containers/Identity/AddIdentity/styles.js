import { StyleSheet } from 'react-native';
import Colors from '../../../globals/colors';
export default StyleSheet.create({
    root: {
        flex: 1,
        padding: 16,
    },
    container: {
        flexDirection: 'column',

    },
    add: {
        backgroundColor: Colors.linkButtonColor,
        paddingVertical: 10,
        marginVertical: '2%',
        alignItems: 'center',
        borderRadius: 5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.43,
        shadowRadius: 2,
        elevation: 2,
    },
    input: {
        fontSize: 16,
        borderRadius: 5,
        fontWeight: 'bold',
        height: 40,
        borderColor: 'grey',
        borderWidth: 0.7,
        paddingLeft: 5,
    },
    identities: {
        backgroundColor:
            '#d6cccb',
        marginVertical: '2%',
        paddingVertical: 10,
        borderRadius: 5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.43,
        shadowRadius: 2,
        elevation: 2,
    },

});

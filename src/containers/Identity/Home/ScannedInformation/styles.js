import { StyleSheet } from 'react-native';
export default StyleSheet.create({
    root: {
        paddingVertical: 24,
        paddingHorizontal: 16,
    },

    check: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        paddingVertical: 24,
        borderBottomColor: '#d6cccb',
    },
    status: {
        color: 'green',
        borderWidth: 1,
        padding: 4,
        borderColor: 'green',
        fontWeight: 'bold',
    },
    text: {
        fontSize: 17,
        color: 'grey',
        paddingRight: 24,
    },
    textFromQR: {
        fontSize: 17,
    },
    textContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 16,
    },
    
    personContainer:{
        marginTop:"20%",
    }
});
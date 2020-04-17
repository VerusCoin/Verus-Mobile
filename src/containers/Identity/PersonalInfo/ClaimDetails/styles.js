import { StyleSheet } from 'react-native';
// import Colors from '../../../../globals/colors';

export default StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor:'white'
    },
    searchBarContainer: {
        paddingHorizontal: 8,
        backgroundColor: 'white'
    },
    claims: {
        paddingVertical: 16,
        paddingLeft:16,
        borderRadius: 8,
        backgroundColor: '#b5b5b5',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.43,
        shadowRadius: 2,
    },
});

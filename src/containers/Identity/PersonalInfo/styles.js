import { StyleSheet } from 'react-native';
import Colors from '../../../globals/colors';
import GlobalStyles from '../../../globals/globalStyles';

export default StyleSheet.create({
    root: {
        flex: 1,
    },
    searchBarContainer: {
        paddingHorizontal: 8,
        backgroundColor: 'white'
    },
    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 15,
        justifyContent: 'space-between',
    },
    textHeader: {
        padding: 16,
        paddingBottom: 20,
        fontSize: 24,
    },
    category: {
        backgroundColor: Colors.primaryColor,
        width: '48%',
        aspectRatio: 1,
        height: '50%',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.43,
        shadowRadius: 2,
        elevation: 2,
        marginBottom: 13,
        paddingTop: 10,
        maxHeight: 170,
    },
    name: {
        textAlign: 'left',
        fontWeight: 'bold',
        fontSize: 20,
        paddingLeft: 16,
        fontFamily: GlobalStyles.AvenirBlack,
        color: Colors.secondaryColor,
    },
});

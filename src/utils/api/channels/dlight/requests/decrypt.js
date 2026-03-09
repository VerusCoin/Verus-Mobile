import { Tools } from 'react-native-verus';
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants';


export const decryptVerusMessage = async (ivkHex, epkHex, dataToDecrypt, sskHex) => {
    try {
        const res = await Tools.decryptVerusData(
            //TODO: I think we should handle default args elsewhere
            ivkHex || null,
            epkHex || null,
            dataToDecrypt,
            sskHex || null
        );
        return res
    } catch (err) {
        throw err;
    }
}

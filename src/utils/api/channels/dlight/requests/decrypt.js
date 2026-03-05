import { Tools } from 'react-native-verus';
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants';


export const decryptVerusMessage = async (fvkHex, epkHex, ciphertextHex, sskHex) => {
    try {
        const res = await Tools.decryptVerusMessage(
            //TODO: I think we should handle default args elsewhere
            fvkHex || null,
            epkHex || null,
            ciphertextHex,
            sskHex || null
        );
        return res
    } catch (err) {
        throw err;
    }
}
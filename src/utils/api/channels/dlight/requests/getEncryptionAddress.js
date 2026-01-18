import { ChannelKeysRequest, Tools } from 'react-native-verus';
import { createJsonRpcResponse } from './jsonResponse'

export const z_getencryptionaddress = async (seed, extsk, fromId, toId, hdIndex, encryptionIndex, returnSecret) => {
    const params: ChannelKeysRequest = {
        mnemonicSeed: seed,
        extsk: extsk ? await Tools.bech32Decode(extsk) : extsk,
        fromId,
        toId,
        hdIndex: hdIndex ?? -1,
        encryptionIndex: encryptionIndex ?? 0,
        returnSecret: returnSecret ?? false
    }
    try {
        const res = await Tools.getVerusEncryptionAddress(params);
        return res;
        //createJsonResponse(0, res, null); //TODO: verify we actually need this in JsonResponse format
   } catch (err) {
        throw err;
   }
}
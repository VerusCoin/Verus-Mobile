import { ChannelKeysRequest, Tools } from 'react-native-verus';

export const z_getencryptionaddress = async (seed, extsk, fromId, toId, hdIndex, encryptionIndex, returnSecret) => {
    /**
     * @type {ChannelKeysRequest}
     */
    const params = {
        mnemonicSeed: seed,
        extsk: extsk ? await Tools.bech32Decode(extsk) : null,
        fromId,
        toId,
        hdIndex: hdIndex ?? -1,
        encryptionIndex: encryptionIndex ?? 0,
        returnSecret: returnSecret ?? false
    }
    try {
        const res = await Tools.getVerusEncryptionAddress(params);
        return res;
   } catch (err) {
        throw err;
   }
}

import { BLOCK_HEIGHT_STORAGE_INTERNAL_KEY } from '../../../env/index';
import { SecureStorage } from '../keychain/secureStore';

export const storeBlockHeight = async (blockHeight) => {
  try {
    await SecureStorage.setItem(BLOCK_HEIGHT_STORAGE_INTERNAL_KEY, JSON.stringify(blockHeight));
  } catch (error) {
    console.log(error);
  }
};

export const getStoredBlockHeight = async () => {
  try {
    const result = await SecureStorage.getItem(BLOCK_HEIGHT_STORAGE_INTERNAL_KEY);
    return result ? JSON.parse(result) : 0;
  } catch (error) {
    console.log(error);
  }
};

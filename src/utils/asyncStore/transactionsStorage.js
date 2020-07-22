
import AsyncStorage from '@react-native-community/async-storage';

export const storeBlockHeight = async (blockHeight) => {
  try {
    await AsyncStorage.setItem('blockHeight', JSON.stringify(blockHeight));
  } catch (error) {
    console.log(error);
  }
};

export const getStoredBlockHeight = async () => {
  try {
    const result = await AsyncStorage.getItem('blockHeight');
    return result ? JSON.parse(result) : 0;
  } catch (error) {
    console.log(error);
  }
};

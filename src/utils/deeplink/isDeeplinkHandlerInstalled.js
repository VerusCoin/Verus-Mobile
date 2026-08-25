import { Linking } from 'react-native';

/**
 * Returns true/false depending on whether or not the handler application with 
 * the specified handler ID number is present on the current device
 * @param {number} handlerID 
 * @returns {boolean}
 */
export const isDeeplinkHandlerInstalled = async (handlerID) => {
  if (typeof handlerID !== 'number' || !Number.isInteger(handlerID)) {
    throw new Error('handlerID must be an integer');
  }
  return Linking.canOpenURL(`verus${handlerID}://`);
};

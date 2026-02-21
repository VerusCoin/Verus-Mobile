/**
 * Extracts wallet addresses from activeAccount
 * @param {Object} activeAccount
 * @returns {string[]}
 */
const getAccountAddresses = (activeAccount , systemID) => {
  if (!activeAccount || !activeAccount.keys) return [];

  const coinObj = CoinDirectory.getBasicCoinObj(systemID);
  const coinId = coinObj.id;

  const vrpcData = activeAccount.keys[coinId]?.vrpcData;
  
  if (!vrpcData) return [];

  return vrpcData.addresses;
};

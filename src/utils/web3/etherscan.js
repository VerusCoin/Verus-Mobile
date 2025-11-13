import { EtherscanProvider, Networkish, BlockTag } from 'ethers'; //^v6

export class HistorySupportingEtherscanProvider extends EtherscanProvider {
  /**
   * Creates an etherscan provider that supports getting tx history
   * @param {Networkish} networkish 
   * @param {string} apiKey 
   * @returns {HistorySupportingEtherscanProvider}
   */ 
  constructor(networkish, apiKey) {
    super(networkish, apiKey);
  }

  /**
   * Gets the transaction history for a given address from startBlock to endBlock
   * @param {string} address 
   * @param {BlockTag} startBlock 
   * @param {BlockTag} endBlock
   * @param {string} contractAddress
   * @returns {Promise<Array<any>>}
   */
  async getHistory(address, startBlock, endBlock, contractAddress) {
    const params = {
      action: contractAddress != null ? "tokentx" : "txlist",
      address,
      startblock: ((startBlock == null) ? 0 : startBlock),
      endblock: ((endBlock == null) ? 99999999 : endBlock),
      sort: "asc"
    };

    if (contractAddress != null) params.contractAddress = contractAddress;

    return this.fetch("account", params);
  }
}
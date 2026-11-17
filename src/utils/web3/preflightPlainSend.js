import {ethers} from 'ethers';
import {ETH, ERC20} from '../constants/intervalConstants';
import {ERC20_SEND_GAS_PRICE_MODIFIER, TRANSFER_SKIP_CALLSTATIC_TOKENS} from '../constants/web3Constants';
import {scientificToDecimal} from '../math';
import {minimumMaxFeePerGas, plainSendFeeAmounts, validateNetworkFee} from './plainSendFees';

// New plain-send contract only. Bridge/delegator and legacy preflights do not
// enter here. `fee` stays the maximum for balance math; `likelyFee` is display.
export const preflightPlainSend = async ({coinObj, activeUser, address, amount, params, web3, minGasPriceGwei, isToken}) => {
  if (!ethers.isAddress(address)) throw new Error('Invalid Ethereum address.');
  const provider = web3.InfuraProvider;
  const feeTicker = coinObj.network === 'sepolia' ? 'gETH' : 'ETH';
  const fee = validateNetworkFee(params.networkFee, minimumMaxFeePerGas(minGasPriceGwei));
  const fromAddress = activeUser.keys[coinObj.id][isToken ? ERC20 : ETH].addresses[0];
  const submitted = ethers.parseUnits(scientificToDecimal(amount.toString()), isToken ? coinObj.decimals : 18);
  if (submitted <= BigInt(0)) throw new Error('Enter an amount greater than zero.');
  const balance = BigInt(await provider.getBalance(fromAddress, 'pending'));
  let value = submitted;
  let estimatedGas;
  let gasLimit;
  if (isToken) {
    const contract = web3.getContract(coinObj.currency_id).connect(new ethers.VoidSigner(fromAddress, provider));
    estimatedGas = BigInt(await contract.transfer.estimateGas(address, value));
    gasLimit = estimatedGas + estimatedGas / ERC20_SEND_GAS_PRICE_MODIFIER;
    if (balance < gasLimit * fee.maxFeePerGas) throw new Error(`Not enough ${feeTicker} to cover the maximum network fee.`);
    if (!TRANSFER_SKIP_CALLSTATIC_TOKENS.some(token => token.toLowerCase() === coinObj.currency_id.toLowerCase())) {
      // A low cap must be allowed to wait for the market. Simulate execution
      // without asking the node to admit the chosen price into its mempool.
      await contract.transfer.staticCall(address, value, {gasLimit});
    }
  } else {
    // Reserve the existing safe limit before estimating MAX. Re-estimate after
    // any reduction: a payable contract can use different gas for a new value.
    let reserve = BigInt(42000) * fee.maxFeePerGas;
    let settled = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      value = submitted + reserve > balance ? balance - reserve : submitted;
      if (value <= BigInt(0)) throw new Error(`Not enough ${feeTicker} to cover the maximum network fee.`);
      estimatedGas = BigInt(await provider.estimateGas({from: fromAddress, to: address, value}));
      const padded = estimatedGas + estimatedGas / ERC20_SEND_GAS_PRICE_MODIFIER;
      gasLimit = padded > BigInt(42000) ? padded : BigInt(42000);
      const maximum = gasLimit * fee.maxFeePerGas;
      if (value + maximum <= balance) { settled = true; break; }
      reserve = maximum;
    }
    if (!settled) throw new Error('Could not prepare this amount. Try a smaller amount.');
  }
  const amounts = plainSendFeeAmounts(estimatedGas, gasLimit, fee, params.networkFee.baseFeePerGas);
  return {
    err: false,
    result: {
      ...amounts,
      feeCurr: isToken ? (coinObj.network === 'sepolia' ? 'GETH' : 'ETH') : coinObj.id,
      value: ethers.formatUnits(value, isToken ? coinObj.decimals : 18),
      toAddress: address, fromAddress, amountSubmitted: amount.toString(), memo: null,
      estimatedGas: estimatedGas.toString(),
      params: {
        ...fee, gasLimit, utxoVerified: true,
        feeTakenFromAmount: value !== submitted,
        networkFeeChoice: true,
        confirmedMaxFee: (gasLimit * fee.maxFeePerGas).toString(),
      },
    },
  };
};

import {ethers} from 'ethers';
import {sendBridgeTransfer} from '../../api/channels/erc20/requests/send';
import {getWeb3ProviderForNetwork} from '../../web3/provider';
import {requestPrivKey} from '../../auth/authBox';
import {VERUS_BRIDGE_DELEGATOR_ABI} from '../../constants/abis/verusBridgeDelegatorAbi';
import {ETH_CONTRACT_ADDRESS} from '../../constants/web3Constants';

jest.mock('../../web3/provider', () => ({getWeb3ProviderForNetwork: jest.fn()}));
jest.mock('../../auth/authBox', () => ({requestPrivKey: jest.fn()}));

// Public fixture key. Real ethers signing; RPC acceptance and receipts stay local.
const PRIVATE_KEY = `0x${'0'.repeat(63)}1`;
const SENDER = new ethers.Wallet(PRIVATE_KEY).address;
const DELEGATOR = '0x71518580f36FeCEFfE0721F06bA4703218cD7F63';
const TOKEN = '0x6b175474e89094c44da98b954eedeac495271d0f';
const ZERO_OUT_TOKEN = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const TOKEN_ABI = new ethers.Interface([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
]);
const BRIDGE_ABI = new ethers.Interface(VERUS_BRIDGE_DELEGATOR_ABI);
const BALANCE = BigInt('10000000000000000000');
const GAS_PRICE = BigInt('3000000000');
const RESERVE_TRANSFER = {
  version: 1,
  currencyvalue: {currency: '0x454cb83913d688795e237837d30258d11ea7c752', amount: '10000000'},
  flags: 1,
  feecurrencyid: '0x454cb83913d688795e237837d30258d11ea7c752',
  fees: 300000,
  destcurrencyid: '0x0200ebbd26467b866120d84a0d37c82cde0acaeb',
  secondreserveid: ethers.ZeroAddress,
  destsystemid: ethers.ZeroAddress,
  destination: {destinationtype: 2, destinationaddress: `0x${'02'.repeat(20)}`},
};

class OfflineProvider extends ethers.JsonRpcProvider {
  constructor() {
    super('http://unused.invalid', 1, {staticNetwork: true, batchMaxCount: 1, cacheTimeout: -1});
    this.accepted = [];
    this.balanceReads = [];
    this.events = [];
    this.balanceAfter = BALANCE - BigInt(1);
    this.loseResponse = true;
    this.getFeeData = jest.fn(async () => new ethers.FeeData(GAS_PRICE, GAS_PRICE, GAS_PRICE));
  }

  get bridgePayments() {
    return this.accepted.filter(tx => tx.to.toLowerCase() === DELEGATOR.toLowerCase());
  }

  async _send(payload) {
    let result;
    switch (payload.method) {
      case 'eth_chainId': result = '0x1'; break;
      case 'eth_blockNumber': result = '0x10'; break;
      case 'eth_getTransactionCount': result = ethers.toQuantity(7 + this.accepted.length); break;
      case 'eth_estimateGas': result = '0x493e0'; break;
      case 'eth_getBalance':
      case 'eth_call': {
        this.events.push('balance');
        this.balanceReads.push(payload);
        if (this.failBalanceRead === this.balanceReads.length) {
          throw new Error('Balance lookup unavailable');
        }
        const balance = this.bridgePayments.length ? this.balanceAfter : BALANCE;
        if (payload.method === 'eth_call') {
          expect(payload.params[0].to.toLowerCase()).toBe(this.tokenAddress);
          const [owner] = TOKEN_ABI.decodeFunctionData('balanceOf', payload.params[0].data);
          expect(owner).toBe(SENDER);
          result = TOKEN_ABI.encodeFunctionResult('balanceOf', [balance]);
        } else {
          expect(payload.params[0].toLowerCase()).toBe(SENDER.toLowerCase());
          result = ethers.toQuantity(balance);
        }
        break;
      }
      case 'eth_sendRawTransaction': {
        const tx = ethers.Transaction.from(payload.params[0]);
        const isBridge = tx.to.toLowerCase() === DELEGATOR.toLowerCase();
        if (isBridge && this.rejectSend) {
          return [{id: payload.id, error: {code: -32000, message: 'insufficient funds'}}];
        }
        this.accepted.push(tx);
        this.events.push(isBridge ? 'bridge' : 'approval');
        if (isBridge && this.loseResponse) {
          const error = new Error('Connection closed after accepting bridge transfer');
          error.code = 'NETWORK_ERROR';
          throw error;
        }
        result = tx.hash;
        break;
      }
      default: throw new Error(`Unexpected offline RPC: ${payload.method}`);
    }
    return [{id: payload.id, result}];
  }
}

describe.each(['eth', 'erc20'])('%s bridge lost send response', proto => {
  let provider;
  let coin;
  let submit;
  let transferOptions;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OfflineProvider();
    provider.tokenAddress = TOKEN;
    requestPrivKey.mockResolvedValue(PRIVATE_KEY);
    getWeb3ProviderForNetwork.mockReturnValue({
      InfuraProvider: provider,
      getVerusBridgeDelegatorContract: () => new ethers.Contract(DELEGATOR, BRIDGE_ABI, provider),
      getContract: address => ({connect: signer => {
        const contract = new ethers.Contract(address, TOKEN_ABI, signer);
        return {
          balanceOf: contract.balanceOf,
          approve: async (...args) => {
            const tx = await contract.approve(...args);
            return {hash: tx.hash, wait: async () => {
              provider.events.push('approval confirmed');
              return {status: 1};
            }};
          },
        };
      }}),
    });
    coin = {id: proto.toUpperCase(), proto, network: 'homestead',
      currency_id: proto === 'eth' ? ETH_CONTRACT_ADDRESS : TOKEN};
    transferOptions = {
      value: ethers.parseEther(proto === 'eth' ? '0.103' : '0.003'),
      gasLimit: BigInt(300000), maxFeePerGas: GAS_PRICE,
    };
    submit = () => sendBridgeTransfer(coin, [RESERVE_TRANSFER, transferOptions],
      [DELEGATOR, ethers.parseEther('0.1'), {gasLimit: BigInt(50000), maxFeePerGas: GAS_PRICE}],
      GAS_PRICE.toString());
  });

  afterEach(() => provider.destroy());

  it('preserves ambiguity after an accepted transfer and a fresh balance change', async () => {
    await expect(submit()).rejects.toMatchObject({
      ambiguousBroadcast: true,
      message: expect.stringContaining('Your balance changed, so funds may have been sent.'),
    });
    expect(provider.bridgePayments).toHaveLength(1);
    const [tx] = provider.bridgePayments;
    expect(tx.from).toBe(SENDER);
    expect(tx.value).toBe(transferOptions.value);
    const [transfer] = BRIDGE_ABI.decodeFunctionData('sendTransfer', tx.data);
    expect(transfer.currencyvalue.amount).toBe(BigInt(RESERVE_TRANSFER.currencyvalue.amount));
    expect(transfer.destination.destinationaddress).toBe(RESERVE_TRANSFER.destination.destinationaddress);
    expect(provider.balanceReads).toHaveLength(2);
    expect(provider.balanceReads.every(read => read.params[1] === 'pending')).toBe(true);
    expect(provider.events).toEqual(proto === 'eth'
      ? ['balance', 'bridge', 'balance']
      : ['approval', 'approval confirmed', 'balance', 'bridge', 'balance']);
  });

  it('keeps the transfer ambiguous when the balance has not changed yet', async () => {
    provider.balanceAfter = BALANCE;
    await expect(submit()).rejects.toMatchObject({
      ambiguousBroadcast: true,
      message: expect.stringContaining('payment may still be pending'),
    });
    expect(provider.bridgePayments).toHaveLength(1);
    expect(provider.balanceReads).toHaveLength(2);
  });

  it('keeps the transfer ambiguous when the follow-up balance lookup fails', async () => {
    provider.failBalanceRead = 2;
    await expect(submit()).rejects.toMatchObject({
      ambiguousBroadcast: true,
      message: expect.stringContaining('Your balance could not be checked.'),
    });
    expect(provider.bridgePayments).toHaveLength(1);
  });

  it('does not broadcast the transfer if its initial balance lookup fails', async () => {
    provider.failBalanceRead = 1;
    await expect(submit()).resolves.toMatchObject({err: true});
    expect(provider.bridgePayments).toHaveLength(0);
    expect(provider.balanceReads).toHaveLength(1);
  });

  it('preserves definite insufficient-funds rejection as a normal retryable error', async () => {
    provider.rejectSend = true;
    const result = await submit();
    expect(result.err).toBe(true);
    expect(result.result).toMatch(/insufficient funds/i);
    expect(provider.bridgePayments).toHaveLength(0);
    expect(provider.balanceReads).toHaveLength(1);
  });

  it('returns the accepted hash on success without a second balance lookup', async () => {
    provider.loseResponse = false;
    const result = await submit();
    expect(result).toEqual({err: false, result: {txid: provider.bridgePayments[0].hash}});
    expect(provider.bridgePayments).toHaveLength(1);
    expect(provider.balanceReads).toHaveLength(1);
  });

  if (proto === 'erc20') {
    it('completes zero-out and spend approvals before capturing the token balance', async () => {
      coin.currency_id = ZERO_OUT_TOKEN;
      provider.tokenAddress = ZERO_OUT_TOKEN;
      provider.loseResponse = false;
      await expect(submit()).resolves.toMatchObject({err: false});
      expect(provider.events).toEqual([
        'approval', 'approval confirmed', 'approval', 'approval confirmed', 'balance', 'bridge',
      ]);
      const amounts = provider.accepted.slice(0, 2).map(tx => {
        const [spender, amount] = TOKEN_ABI.decodeFunctionData('approve', tx.data);
        expect(spender).toBe(DELEGATOR);
        return amount;
      });
      expect(amounts).toEqual([BigInt(0), ethers.parseEther('0.1')]);
    });
  }
});

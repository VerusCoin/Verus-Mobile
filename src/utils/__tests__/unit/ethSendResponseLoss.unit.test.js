import {ethers} from 'ethers';
import {send as sendEth} from '../../api/channels/eth/requests/send';
import {send as sendErc20} from '../../api/channels/erc20/requests/send';
import {getWeb3ProviderForNetwork} from '../../web3/provider';
import {requestPrivKey} from '../../auth/authBox';

jest.mock('../../web3/provider', () => ({getWeb3ProviderForNetwork: jest.fn()}));
jest.mock('../../auth/authBox', () => ({requestPrivKey: jest.fn()}));

// Public test key; all RPC responses below are local fixtures.
const PRIVATE_KEY = `0x${'0'.repeat(63)}1`;
const SENDER = new ethers.Wallet(PRIVATE_KEY).address;
const RECIPIENT = '0x2222222222222222222222222222222222222222';
const TOKEN = '0x3333333333333333333333333333333333333333';
const TOKEN_ABI = new ethers.Interface([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
]);
const BALANCE = BigInt('10000000000000000000');
const GAS_PRICE = BigInt('1000000000');

class OfflineProvider extends ethers.JsonRpcProvider {
  constructor() {
    super('http://unused.invalid', 1, {staticNetwork: true, batchMaxCount: 1});
    this.accepted = [];
    this.balanceReads = [];
    this.balanceAfter = BALANCE - BigInt(1);
    this.loseResponse = true;
    this.getFeeData = jest.fn(async () => new ethers.FeeData(
      GAS_PRICE, GAS_PRICE, GAS_PRICE,
    ));
  }

  async _send(payload) {
    let result;
    switch (payload.method) {
      case 'eth_chainId':
        result = '0x1';
        break;
      case 'eth_blockNumber':
        result = '0x10';
        break;
      case 'eth_getTransactionCount':
        result = ethers.toQuantity(7 + this.accepted.length);
        break;
      case 'eth_estimateGas':
        result = '0xc350';
        break;
      case 'eth_getBalance':
      case 'eth_call': {
        this.balanceReads.push(payload);
        if (this.failBalanceRead === this.balanceReads.length) {
          throw new Error('Balance lookup unavailable');
        }
        const balance = this.accepted.length ? this.balanceAfter : BALANCE;
        if (payload.method === 'eth_call') {
          expect(payload.params[0].to.toLowerCase()).toBe(TOKEN);
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
        if (this.rejectSend) {
          return [{id: payload.id, error: {code: -32000, message: 'insufficient funds'}}];
        }
        const transaction = ethers.Transaction.from(payload.params[0]);
        this.accepted.push(transaction);
        if (this.loseResponse) {
          const error = new Error('Connection closed after accepting transaction');
          error.code = 'NETWORK_ERROR';
          throw error;
        }
        result = transaction.hash;
        break;
      }
      default:
        throw new Error(`Unexpected offline RPC: ${payload.method}`);
    }
    return [{id: payload.id, result}];
  }
}

describe.each([
  ['ETH', 'eth', sendEth, '0.123456789012345678', 18],
  ['TOKEN', 'erc20', sendErc20, '12.345678', 6],
])('%s lost send response', (id, channel, send, amount, decimals) => {
  let provider;
  let submit;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OfflineProvider();
    requestPrivKey.mockResolvedValue(PRIVATE_KEY);
    getWeb3ProviderForNetwork.mockReturnValue({
      InfuraProvider: provider,
      getContract: () => new ethers.Contract(TOKEN, TOKEN_ABI, provider),
    });
    submit = () => send(
      {id, network: 'homestead', currency_id: TOKEN, decimals},
      {keys: {[id]: {[channel]: {addresses: [SENDER]}}}},
      RECIPIENT,
      amount,
      {params: {gasLimit: BigInt(50000), maxFeePerGas: GAS_PRICE}},
    );
  });

  afterEach(() => provider.destroy());

  it('marks an accepted payment with a lost response ambiguous after a fresh balance change', async () => {
    await expect(submit()).rejects.toMatchObject({
      ambiguousBroadcast: true,
      message: expect.stringContaining('Your balance changed, so funds may have been sent.'),
    });
    expect(provider.accepted).toHaveLength(1);
    expect(provider.accepted[0].from).toBe(SENDER);
    expect(provider.accepted[0].nonce).toBe(7);
    expect(provider.balanceReads).toHaveLength(2);
    expect(provider.balanceReads.every(read => read.params[1] === 'pending')).toBe(true);
    if (channel === 'eth') {
      expect(provider.accepted[0].to).toBe(RECIPIENT);
      expect(provider.accepted[0].value).toBe(ethers.parseUnits(amount, decimals));
    } else {
      const [to, value] = TOKEN_ABI.decodeFunctionData('transfer', provider.accepted[0].data);
      expect(provider.accepted[0].to).toBe(TOKEN);
      expect(to).toBe(RECIPIENT);
      expect(value).toBe(ethers.parseUnits(amount, decimals));
    }
  });

  it('keeps an accepted payment ambiguous when the balance has not changed yet', async () => {
    provider.balanceAfter = BALANCE;
    await expect(submit()).rejects.toMatchObject({
      ambiguousBroadcast: true,
      message: expect.stringContaining('payment may still be pending'),
    });
    expect(provider.accepted).toHaveLength(1);
    expect(provider.balanceReads).toHaveLength(2);
  });

  it('keeps an accepted payment ambiguous if the follow-up lookup fails', async () => {
    provider.failBalanceRead = 2;
    await expect(submit()).rejects.toMatchObject({
      ambiguousBroadcast: true,
      message: expect.stringContaining('Your balance could not be checked.'),
    });
    expect(provider.accepted).toHaveLength(1);
  });

  it('does not broadcast if the initial balance lookup fails', async () => {
    provider.failBalanceRead = 1;
    await expect(submit()).resolves.toMatchObject({err: true});
    expect(provider.accepted).toHaveLength(0);
    expect(provider.balanceReads).toHaveLength(1);
  });

  it('preserves a definite insufficient-funds rejection as a normal error', async () => {
    provider.rejectSend = true;
    const result = await submit();
    expect(result.err).toBe(true);
    expect(result.result).toMatch(/insufficient funds/i);
    expect(provider.accepted).toHaveLength(0);
    expect(provider.balanceReads).toHaveLength(1);
  });

  it('preserves a successful send without a second balance lookup', async () => {
    provider.loseResponse = false;
    const result = await submit();
    expect(result).toMatchObject({
      err: false,
      result: {
        txid: provider.accepted[0].hash,
        fromAddress: SENDER,
        toAddress: RECIPIENT,
      },
    });
    expect(provider.accepted).toHaveLength(1);
    expect(provider.balanceReads).toHaveLength(1);
  });
});

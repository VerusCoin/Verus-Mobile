jest.mock('react-native', () => ({
  AppState: {currentState: 'active', addEventListener: jest.fn()},
}));

const requests = (count, prefix = 'output') => Array.from({length: count}, (_, index) => ({
  cmd: 'gettxout',
  txid: `${prefix}-${index}`,
}));
const responseFor = request => ({result: request.txid});
const respond = request => Array.isArray(request)
  ? request.map(responseFor)
  : responseFor(request);
const advance = milliseconds => jest.advanceTimersByTimeAsync(milliseconds);

describe('VRPC batch send pacing', () => {
  let VrpcRequestBatcher;
  let startedAt;
  const endpoint = 'https://batch-pacing.example.com';
  const elapsed = () => Date.now() - startedAt;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    startedAt = Date.now();
    VrpcRequestBatcher = require('../../vrpc/vrpcRequestBatcher').default;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('paces separate SDK-style groups using the preceding group size', async () => {
    const sends = [];
    const send = jest.fn(request => {
      sends.push(elapsed());
      return Promise.resolve(respond(request));
    });
    const batcher = new VrpcRequestBatcher(endpoint, send, 50);

    const firstRequests = requests(20, 'first');
    expect(await batcher.requestMany(firstRequests)).toEqual(firstRequests.map(responseFor));
    expect(sends).toEqual([0]);

    const secondRequests = requests(2, 'second');
    const second = batcher.requestMany(secondRequests);
    await advance(249);
    expect(sends).toEqual([0]);

    await advance(1);
    expect(await second).toEqual(secondRequests.map(responseFor));
    expect(sends).toEqual([0, 250]);

    const thirdRequests = requests(2, 'third');
    const third = batcher.requestMany(thirdRequests);
    await advance(24);
    expect(sends).toEqual([0, 250]);

    await advance(1);
    expect(await third).toEqual(thirdRequests.map(responseFor));
    expect(sends).toEqual([0, 250, 275]);
  });

  it('keeps a 134-item funding burst below a server allowance of 100 items per second', async () => {
    const sends = [];
    let tokens = 100;
    let replenishedAt = Date.now();

    // Model server admission by RPC item rather than by HTTP envelope. Without
    // spacing, the sixth 20-item batch exhausts this otherwise idle allowance.
    const send = jest.fn(request => {
      const now = Date.now();
      tokens = Math.min(100, tokens + (now - replenishedAt) / 10);
      replenishedAt = now;
      const count = Array.isArray(request) ? request.length : 1;
      sends.push({time: elapsed(), count});

      if (count > tokens) {
        return Promise.resolve({error: {code: 429, message: 'Server busy'}});
      }

      tokens -= count;
      return Promise.resolve(respond(request));
    });
    const batcher = new VrpcRequestBatcher(endpoint, send, 50);
    const fundingRequests = requests(134);
    const pending = batcher.requestMany(fundingRequests);

    await advance(1500);

    expect(await pending).toEqual(fundingRequests.map(responseFor));
    expect(sends).toEqual([
      {time: 0, count: 20},
      {time: 250, count: 20},
      {time: 500, count: 20},
      {time: 750, count: 20},
      {time: 1000, count: 20},
      {time: 1250, count: 20},
      {time: 1500, count: 14},
    ]);
  });

  it.each([
    [100, 250],
    [300, 300],
  ])('counts a %ims network request toward the interval before the next send', async (duration, nextAt) => {
    const sends = [];
    const send = jest.fn(request => {
      sends.push(elapsed());
      return sends.length === 1
        ? new Promise(resolve => setTimeout(() => resolve(respond(request)), duration))
        : Promise.resolve(respond(request));
    });
    const batcher = new VrpcRequestBatcher(endpoint, send, 50);
    const group = requests(40);
    const pending = batcher.requestMany(group);

    await advance(0);
    expect(sends).toEqual([0]);

    await advance(nextAt - 1);
    expect(sends).toEqual([0]);

    await advance(1);
    expect(await pending).toEqual(group.map(responseFor));
    expect(sends).toEqual([0, nextAt]);
  });

  it('shares pacing across concurrent batchers for the same normalized endpoint', async () => {
    const sends = [];
    const send = jest.fn(request => {
      sends.push(elapsed());
      return Promise.resolve(respond(request));
    });
    const batchers = [endpoint, `${endpoint}/`, `${endpoint}///`].map(
      server => new VrpcRequestBatcher(server, send, 50),
    );
    const groups = batchers.map((_, index) => requests(2, `chain-${index}`));
    const pending = batchers.map((batcher, index) => batcher.requestMany(groups[index]));

    await advance(0);
    expect(sends).toEqual([0]);

    await advance(24);
    expect(sends).toEqual([0]);

    await advance(1);
    expect(sends).toEqual([0, 25]);

    await advance(25);
    expect(sends).toEqual([0, 25, 50]);
    expect(await Promise.all(pending)).toEqual(groups.map(group => group.map(responseFor)));
  });

  it('lets different servers send independently', async () => {
    const sends = [];
    const batchers = [endpoint, 'https://other.example.com'].map(server => (
      new VrpcRequestBatcher(server, request => {
        sends.push({server, time: elapsed()});
        return Promise.resolve(respond(request));
      }, 50)
    ));
    const pending = batchers.map(batcher => batcher.requestMany(requests(40)));

    await advance(0);
    expect(sends).toEqual([
      {server: endpoint, time: 0},
      {server: 'https://other.example.com', time: 0},
    ]);

    await advance(250);
    await Promise.all(pending);
    expect(sends.slice(2)).toEqual([
      {server: endpoint, time: 250},
      {server: 'https://other.example.com', time: 250},
    ]);
  });

  it('sends immediately again after the server has been idle', async () => {
    const sends = [];
    const batcher = new VrpcRequestBatcher(endpoint, request => {
      sends.push(elapsed());
      return Promise.resolve(respond(request));
    }, 50);

    await batcher.requestMany(requests(20));
    await advance(5000);
    await batcher.requestMany(requests(2));

    expect(sends).toEqual([0, 5000]);
  });

  it('paces fallback reads and remembers the capability rejection', async () => {
    const sends = [];
    const send = jest.fn(request => {
      sends.push(elapsed());
      return Promise.resolve(Array.isArray(request)
        ? {error: {code: -32600, message: 'Batching is disabled'}}
        : respond(request));
    });
    const batcher = new VrpcRequestBatcher(endpoint, send, 50);
    const firstRequests = requests(2, 'first');
    const first = batcher.requestMany(firstRequests);

    await advance(38);
    expect(await first).toEqual(firstRequests.map(responseFor));
    expect(sends).toEqual([0, 25, 38]);

    const secondRequests = requests(2, 'second');
    const second = batcher.requestMany(secondRequests);
    await advance(26);
    expect(await second).toEqual(secondRequests.map(responseFor));
    expect(sends).toEqual([0, 25, 38, 51, 64]);
    expect(send.mock.calls.filter(([request]) => Array.isArray(request))).toHaveLength(1);
  });

  it('preserves a rate-limit response and paces the next batch without disabling batching', async () => {
    const sends = [];
    const error = {error: {code: 429, message: 'Server busy'}};
    const send = jest.fn(request => {
      sends.push(elapsed());
      return Promise.resolve(sends.length === 1 ? error : respond(request));
    });
    const batcher = new VrpcRequestBatcher(endpoint, send, 50);

    expect(await batcher.requestMany(requests(2, 'first'))).toEqual([error, error]);
    const nextRequests = requests(2, 'next');
    const next = batcher.requestMany(nextRequests);
    await advance(25);

    expect(await next).toEqual(nextRequests.map(responseFor));
    expect(sends).toEqual([0, 25]);
    expect(send.mock.calls.every(([request]) => Array.isArray(request))).toBe(true);
  });
});

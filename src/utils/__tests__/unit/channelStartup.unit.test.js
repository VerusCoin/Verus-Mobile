describe('channel watcher registration during provider imports', () => {
  it.each([
    ['vrpc', '../../vrpc/vrpcInterface', ['handleVrpcChannelClose']],
    ['verusid', '../../vrpc/vrpcInterface', ['handleVerusidChannelClose']],
    ['erc20', '../../web3/provider', ['handleErc20ChannelInit', 'handleErc20ChannelClose']],
  ])('%s exposes watchers before its provider import finishes', (channel, providerPath, handlers) => {
    // Providers can import Store, which imports and starts the channel sagas
    // before the original provider import has completed. Reproduce that cycle
    // without the usual mocked Store/saga middleware masking early handlers.
    const entry = `../../../sagas/channels/${channel}`;
    let registeredHandlers;
    let earlyExports;

    jest.isolateModules(() => {
      jest.doMock(providerPath, () => {
        const partialModule = require(entry);
        earlyExports = handlers.map(name => partialModule[name]);
        const registrations = partialModule.default().next().value;
        registeredHandlers = registrations.payload.map(effect => effect.payload.args[1]);
        return {
          __esModule: true,
          default: {},
          getWeb3ProviderForNetwork: jest.fn(),
          deleteAllWeb3Contracts: jest.fn(),
        };
      });

      require(entry);
    });

    expect(registeredHandlers.length).toBeGreaterThanOrEqual(2);
    [...earlyExports, ...registeredHandlers].forEach(handler => {
      expect(typeof handler).toBe('function');
    });
  });
});

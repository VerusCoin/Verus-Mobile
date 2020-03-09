function mockAgamaWalletLibElectrums() {
  const original = require.requireActual('agama-wallet-lib/src/electrum-servers');

  return {
    ...original, //Pass down all the exported objects
    proxyServersHttps: ['mock.proxy.server'],
    proxyServersHttp: ['mock.proxy.server'],
  }
}

module.exports = mockAgamaWalletLibElectrums
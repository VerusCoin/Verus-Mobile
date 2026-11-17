#!/usr/bin/env node

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {DEST_ETH, FLAG_MASK, fromBase58Check} = require('verus-typescript-primitives');
const {ethers} = require('ethers');
const getEthereumAssetName = new Function('DEST_ETH', 'FLAG_MASK', fs.readFileSync(
  path.resolve(__dirname, '../src/utils/assets/ethereumAssetName.js'), 'utf8',
).replace(/import[^;]+;/g, '').replace(/export const /g, 'const ')
  .concat('\nreturn getEthereumAssetName;'))(DEST_ETH, FLAG_MASK);

const loadWizardUtils = coinDirectory => {
  const filename = path.resolve(
    __dirname,
    '../src/containers/SendWizard/wizardUtils.js',
  );
  const source = fs
    .readFileSync(filename, 'utf8')
    .replace(
      "import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';",
      '',
    )
    .replace(/import\s+\{\s*I_ADDRESS_VERSION,\s*R_ADDRESS_VERSION,\s*\}\s+from [^;]+;/, '')
    .replace("import {DEST_ETH, fromBase58Check} from 'verus-typescript-primitives';", '')
    .replace("import {Buffer} from 'buffer';", '')
    .replace("import {ethers} from 'ethers';", '')
    .replace(/import[^;]+;/g, '')
    .replace(/export const /g, 'const ')
    .concat(
      '\nmodule.exports = {buildSendTarget, buildTargetOptions, isConversionChannel};\n',
    );
  const appModule = {exports: {}};

  new Function('module', 'exports', 'CoinDirectory', 'DEST_ETH', 'Buffer', 'ethers', 'fromBase58Check', 'I_ADDRESS_VERSION', 'R_ADDRESS_VERSION', 'getEthereumAssetName', 'getTestnetBridgeDelegator', 'VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT', source)(
    appModule,
    appModule.exports,
    coinDirectory,
    DEST_ETH,
    Buffer,
    ethers,
    fromBase58Check,
    102,
    60,
    getEthereumAssetName,
    () => null,
    null,
  );

  return appModule.exports;
};

const VRSCTEST_ID = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const DAI_VERUS_ID = 'iDAIonVRSCTEST111111111111111111111';
const DAI_ETH_ID = '0x00000000000000000000000000000000000000da';
const PRELAUNCH_ID = 'iSuperVrsc111111111111111111111111111';
const BASKET_ID = 'iBasket1111111111111111111111111111111';
const OTHER_SYSTEM_ID = 'iOtherSystem1111111111111111111111111';

const coins = {
  VRSCTEST: {
    id: 'VRSCTEST',
    currency_id: VRSCTEST_ID,
    system_id: VRSCTEST_ID,
    display_name: 'Verus Testnet',
    display_ticker: 'VRSCTEST',
    proto: 'vrsc',
  },
  [DAI_VERUS_ID]: {
    id: DAI_VERUS_ID,
    currency_id: DAI_VERUS_ID,
    system_id: VRSCTEST_ID,
    display_name: 'DAI on Verus',
    display_ticker: 'DAI.vETH',
    proto: 'vrsc',
  },
  [DAI_ETH_ID]: {
    id: DAI_ETH_ID,
    currency_id: DAI_ETH_ID,
    system_id: '.eth',
    display_name: 'Dai Stablecoin',
    display_ticker: 'DAI',
    proto: 'erc20',
  },
};

const coinDirectory = {
  findCoinObj: id => {
    if (!coins[id]) throw new Error(`Unknown fixture coin: ${id}`);
    return coins[id];
  },
};

const currency = (currencyid, fullyqualifiedname, symbol, systemid) => ({
  currencyid,
  fullyqualifiedname,
  symbol,
  systemid,
});

const daiOnVerus = currency(
  DAI_VERUS_ID,
  'DAI.vETH',
  'DAI.vETH',
  VRSCTEST_ID,
);
const bridge = currency(
  'iBridgeVeth11111111111111111111111111',
  'Bridge.vETH',
  'Bridge.vETH',
  VRSCTEST_ID,
);

const conversionPaths = {
  [VRSCTEST_ID]: [
    {
      destination: currency(
        VRSCTEST_ID,
        'VRSCTEST',
        'VRSCTEST',
        VRSCTEST_ID,
      ),
      exportto: currency(
        OTHER_SYSTEM_ID,
        'OTHER.VRSCTEST',
        'OTHER',
        VRSCTEST_ID,
      ),
      price: 1,
    },
  ],
  [DAI_VERUS_ID]: [
    {destination: daiOnVerus, price: 1},
    {destination: daiOnVerus, via: bridge, price: 1.01},
  ],
  [DAI_ETH_ID]: [
    {
      destination: {
        address: DAI_ETH_ID,
        name: 'Dai Stablecoin',
        symbol: 'DAI',
        mapto: daiOnVerus,
      },
      via: bridge,
      ethdest: true,
      price: 0.99,
    },
  ],
  [PRELAUNCH_ID]: [
    {
      destination: currency(
        PRELAUNCH_ID,
        'SUPERVRSC.VRSCTEST',
        'SUPERVRSC',
        VRSCTEST_ID,
      ),
      prelaunch: true,
      price: 1,
    },
  ],
  [BASKET_ID]: [
    {
      destination: currency(
        BASKET_ID,
        'BASKET.VRSCTEST',
        'BASKET',
        VRSCTEST_ID,
      ),
      price: 1,
    },
  ],
};

const main = () => {
  const {
    buildSendTarget,
    buildTargetOptions,
    isConversionChannel,
  } = loadWizardUtils(coinDirectory);
  const directSend = buildSendTarget({}, coins.VRSCTEST);

  assert(directSend, 'direct Send must be available without conversion data');
  assert.strictEqual(
    directSend.routes.length,
    1,
    'direct Send must start with one local route',
  );
  assert.strictEqual(
    directSend.routes[0].isCrossChain,
    false,
    'the locally seeded Send route must stay on the current network',
  );

  const options = buildTargetOptions(conversionPaths, coins.VRSCTEST, false);
  const send = options.find(option => !option.isConversion);
  const conversions = options.filter(option => option.isConversion);

  assert(send, 'VRSCTEST must retain its ordinary-send option');
  assert(
    send.routes.some(route => route.isCrossChain),
    'same-asset cross-chain routes must remain attached to Send',
  );
  assert.strictEqual(
    send.networkOptions.length,
    2,
    'Send must expose current and cross-chain destination networks',
  );
  assert(
    conversions.every(option => option.isConversion),
    'Convert target lists must exclude the direct-send option',
  );
  assert(isConversionChannel('vrpc.RAddress.System'));
  assert(isConversionChannel('eth'));
  assert(!isConversionChannel('dlight_private'));
  const prelaunch = conversions.find(option => option.id === PRELAUNCH_ID);
  assert(
    prelaunch,
    'VRSCTEST prelaunch currencies must remain available as preconvert targets',
  );
  assert(
    prelaunch.routes.every(route => route.preconvert),
    'prelaunch targets must preserve the preconvert transaction flag',
  );
  assert(
    prelaunch.routes.every(route => route.label.startsWith('Preconvert')),
    'prelaunch targets must be labeled as preconversions',
  );
  assert(
    conversions.some(option => option.id === BASKET_ID),
    'unlisted PBaaS currencies sharing a network suffix must stay distinct',
  );

  const daiConversions = conversions.filter(option =>
    [DAI_VERUS_ID, DAI_ETH_ID, 'DAI'].includes(option.id),
  );
  assert.strictEqual(
    daiConversions.length,
    1,
    'DAI representations on Verus and Ethereum must be one target asset row',
  );

  const [dai] = daiConversions;
  assert.strictEqual(dai.ticker, 'DAI');
  assert.deepStrictEqual(
    dai.networkOptions.map(option => option.networkKey).sort(),
    ['.eth', VRSCTEST_ID],
    'the target row must expose distinct receive-network choices',
  );

  const verus = dai.networkOptions.find(
    option => option.networkKey === VRSCTEST_ID,
  );
  assert.strictEqual(
    verus.routes.length,
    2,
    'direct and via-converter paths must remain route choices after network selection',
  );
  assert.strictEqual(
    verus.selectionTitle,
    'Select conversion route',
    'multiple converter paths are routes, not networks',
  );
  const ethereum = dai.networkOptions.find(
    option => option.networkKey === '.eth',
  );
  assert.strictEqual(
    ethereum.transactionCurrency,
    DAI_VERUS_ID,
    'Ethereum receive keeps the mapped Verus convertto currency',
  );
  assert(
    ethereum.routes.every(route => route.addressType === 'ethereum'),
    'the selected receive network must keep its destination address contract',
  );

  // Daemon-derived Verus-source routes have export definitions, not ethdest.
  for (const [sourceId, exportId] of [
    [VRSCTEST_ID, 'iCtawpxUiCc2sEupt7Z4u8SDAncGZpgSKm'],
    ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV', 'i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X'],
  ]) {
    const source = {
      ...coins.VRSCTEST,
      currency_id: sourceId,
      system_id: sourceId,
    };
    const exportDefinition = {
      ...currency(exportId, 'vETH', 'vETH', sourceId),
      proofprotocol: 3,
      nativecurrencyid: {
        address: '0x0000000000000000000000000000000000000001',
        type: 9,
      },
    };
    const mkr = currency('iMakerFixture', 'MKR.vETH', 'MKR.vETH', sourceId);
    const paths = {
      [mkr.currencyid]: [
        {destination: mkr, via: bridge},
        {destination: mkr, via: bridge, exportto: exportDefinition},
      ],
      [exportId]: [
        {destination: exportDefinition, via: bridge, exportto: exportDefinition},
      ],
    };
    const targets = buildTargetOptions(paths, source, false);
    const ethTarget = targets.find(target => target.id === exportId);
    assert.strictEqual(ethTarget.routes[0].addressType, 'ethereum');
    assert.strictEqual(ethTarget.routes[0].networkKey, '.eth');
    assert.strictEqual(ethTarget.routes[0].networkName, 'Ethereum');
    assert.strictEqual(ethTarget.ticker, 'ETH');
    assert.strictEqual(ethTarget.transactionCurrency, exportId);
    assert.strictEqual(ethTarget.convertToFqn, 'vETH');
    assert.strictEqual(ethTarget.routes[0].exportTo, exportId);

    const maker = targets.find(target => target.id === 'MKR');
    assert.strictEqual(
      maker.ticker,
      'MKR',
      'MKR.vETH must name the asset, not its network',
    );
    assert.deepStrictEqual(
      maker.networkOptions.map(network => network.networkKey).sort(),
      ['.eth', sourceId].sort(),
    );
    assert.strictEqual(maker.networkOptions.find(network => network.networkKey !== '.eth').ticker, 'MKR.vETH');
    assert.strictEqual(maker.networkOptions.find(network => network.networkKey === '.eth').ticker, 'MKR.vETH', 'Missing Ethereum mapping keeps the full Verus name');

    const exportAddressType = definition => buildTargetOptions({
      [exportId]: [{destination: exportDefinition, exportto: definition}],
    }, source, false).find(target => target.isConversion).routes[0].addressType;

    assert.strictEqual(exportAddressType({
      ...exportDefinition,
      fullyqualifiedname: 'RenamedGateway',
    }), 'ethereum');
    assert.strictEqual(exportAddressType({
      ...exportDefinition,
      fullyqualifiedname: 'Ethereum',
      nativecurrencyid: {type: 2},
    }), 'verus');
  }

  console.log('Send wizard option matrix: PASS');
};

main();

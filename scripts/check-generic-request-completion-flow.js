#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const {
  GenericRequest,
  GenericResponse,
} = require('verus-typescript-primitives');

const sourcePath = path.resolve(
  __dirname,
  '../src/containers/DeepLink/GenericRequestHome/genericRequestCompletionFlow.js',
);
const source = fs.readFileSync(sourcePath, 'utf8');
const transformed = babel.transformSync(source, {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
const completionModule = {exports: {}};

new Function('module', 'exports', transformed)(
  completionModule,
  completionModule.exports,
);

const {
  GENERIC_REQUEST_COMPLETION_ACTIONS: ACTIONS,
  alignGenericResponseNetwork,
  createGenericRequestDeliverySingleFlight,
  getGenericRequestCompletionAction,
} = completionModule.exports;
const IDLE = 'idle';
const getAction = overrides =>
  getGenericRequestCompletionAction({
    autoDeliveryRequested: false,
    autoDeliveryStatus: IDLE,
    detailCount: 1,
    detailsProcessed: 1,
    inlineDeliveryInProgress: false,
    ...overrides,
  });

assert.strictEqual(
  getAction({
    autoDeliveryRequested: true,
    detailCount: 2,
    detailsProcessed: 1,
  }),
  ACTIONS.PROCESS_NEXT_DETAIL,
  'Spendable Key completion must not block a later request detail',
);
assert.strictEqual(
  getAction({autoDeliveryRequested: true}),
  ACTIONS.RUN_AUTO_DELIVERY,
  'auto-delivery should start after the final detail',
);
assert.strictEqual(
  getAction({
    autoDeliveryRequested: true,
    autoDeliveryStatus: 'loading',
  }),
  ACTIONS.WAIT,
  'an in-flight delivery must not be started twice',
);
assert.strictEqual(
  getAction({inlineDeliveryInProgress: true}),
  ACTIONS.WAIT,
  'inline delivery retains ownership while it is active',
);
assert.strictEqual(
  getAction({}),
  ACTIONS.COMPLETE_WITHOUT_RESPONSE,
  'invoice and wallet-backup details finish without a delivery sheet',
);
assert.strictEqual(
  getAction({hasResponseDetails: true}),
  ACTIONS.RUN_AUTO_DELIVERY,
  'a response is delivered even if no detail asked for delivery',
);
assert.strictEqual(
  getAction({autoDeliveryRequested: true, hasResponseDetails: false}),
  ACTIONS.RUN_AUTO_DELIVERY,
  'an explicit delivery request keeps the no-response notice',
);
assert.strictEqual(
  getAction({detailsProcessed: -1}),
  ACTIONS.WAIT,
  'request initialization must not navigate to completion',
);

{
  const singleFlight = createGenericRequestDeliverySingleFlight();

  assert.strictEqual(
    singleFlight.tryStart(),
    true,
    'the first delivery attempt should start',
  );
  assert.strictEqual(
    singleFlight.tryStart(),
    false,
    'a same-render second delivery attempt must be rejected',
  );
  singleFlight.clear();
  assert.strictEqual(
    singleFlight.tryStart(),
    true,
    'clearing after an error should allow Retry to start a new attempt',
  );
}

{
  const request = new GenericRequest();
  const response = new GenericResponse();

  request.setIsTestnet();
  alignGenericResponseNetwork(request, response);

  assert.strictEqual(
    response.isTestnet(),
    true,
    'a VRSCTEST request must initialize a testnet GenericResponse',
  );
}

{
  const request = new GenericRequest();
  const response = new GenericResponse();

  alignGenericResponseNetwork(request, response);

  assert.strictEqual(
    response.isTestnet(),
    false,
    'a mainnet request must initialize a mainnet GenericResponse',
  );
}

console.log('GenericRequest completion flow checks passed (11 cases).');

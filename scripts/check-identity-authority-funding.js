#!/usr/bin/env node

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');

const checks = [
  {
    callName: 'createRevokeIdentityTx',
    file: 'src/components/SendModal/RevokeIdentity/RevokeIdentityForm/RevokeIdentityForm.js',
    fundingArgumentIndex: 2,
    expectedFundingAddress: 'revRes.result.identity.identityaddress',
  },
  {
    callName: 'createRecoverIdentityTx',
    file: 'src/components/SendModal/RecoverIdentity/RecoverIdentityForm/RecoverIdentityForm.js',
    fundingArgumentIndex: 6,
    expectedFundingAddress: 'recRes.result.identity.identityaddress',
  },
];

const findCalls = (node, callName, calls = []) => {
  if (!node || typeof node !== 'object') return calls;

  if (
    node.type === 'CallExpression' &&
    node.callee?.type === 'Identifier' &&
    node.callee.name === callName
  ) {
    calls.push(node);
  }

  Object.values(node).forEach(value => {
    if (Array.isArray(value)) {
      value.forEach(child => findCalls(child, callName, calls));
    } else {
      findCalls(value, callName, calls);
    }
  });

  return calls;
};

const compactExpression = (source, node) =>
  source.slice(node.start, node.end).replace(/\s+/g, '');

checks.forEach(check => {
  const filename = path.resolve(__dirname, '..', check.file);
  const source = fs.readFileSync(filename, 'utf8');
  const ast = parser.parse(source, {
    plugins: ['jsx'],
    sourceType: 'module',
  });
  const calls = findCalls(ast, check.callName);

  assert.strictEqual(
    calls.length,
    1,
    `${check.file} must contain exactly one ${check.callName} call`,
  );

  const fundingArgument = calls[0].arguments[check.fundingArgumentIndex];

  assert(
    fundingArgument,
    `${check.callName} must receive an authority identity funding address`,
  );
  assert.strictEqual(
    compactExpression(source, fundingArgument),
    check.expectedFundingAddress,
    `${check.callName} must fund from the authority identity i-address, not the primary address used to prove key ownership`,
  );
});

console.log('Identity authority funding contract: PASS');

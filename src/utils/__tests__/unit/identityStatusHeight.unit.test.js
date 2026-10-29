jest.mock('../../math', () => ({blocksToTime: blocks => `${blocks} minutes`}));
const {getVerusIdStatus} = require('../../verusid/getVerusIdStatus');

it('displays countdown locks against active blocks even when longestchain is ahead', () => {
  expect(getVerusIdStatus({flags: 0, timelock: 110}, {blocks: 100, longestchain: 999}, 60))
    .toContain('spending from block 111');
  expect(getVerusIdStatus({flags: 0, timelock: 100}, {blocks: 100, longestchain: 999}, 60))
    .toBe('Active and unlocked');
});

it('does not reconstruct binary content or infer a missing active height', () => {
  const identity = {flags: 0, timelock: 110};
  Object.defineProperty(identity, 'contentmultimap', {get() { throw new Error('Binary-only content'); }});
  expect(getVerusIdStatus(identity, {longestchain: 999}, 60)).toContain('current height unavailable');
});

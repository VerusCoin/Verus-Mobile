import {DLIGHT_PRIVATE, ELECTRUM} from '../../constants/intervalConstants';
import {buildProfileSeeds} from '../../profile/createProfileFromSeed';

describe('createProfileFromSeed helpers', () => {
  it('stores generated wallet seed in both primary and dlight channels when requested', () => {
    const seeds = buildProfileSeeds('seed words', true);

    expect(seeds[ELECTRUM]).toBe('seed words');
    expect(seeds[DLIGHT_PRIVATE]).toBe('seed words');
  });

  it('keeps dlight seed absent unless requested', () => {
    const seeds = buildProfileSeeds('seed words', false);

    expect(seeds[ELECTRUM]).toBe('seed words');
    expect(seeds[DLIGHT_PRIVATE]).toBeUndefined();
  });
});

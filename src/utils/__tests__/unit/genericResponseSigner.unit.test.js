import {GenericResponse} from 'verus-typescript-primitives';
import {
  ensureGenericResponseSigner,
  getGenericResponseSigner,
} from '../../deeplink/genericResponse/ensureGenericResponseSigner';

const SYSTEM_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const FIRST_IDENTITY = 'iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj';
const SECOND_IDENTITY = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';

describe('generic response signer invariant', () => {
  it('sets and reuses one response signer', () => {
    const response = new GenericResponse();

    expect(
      ensureGenericResponseSigner({
        response,
        systemID: SYSTEM_ID,
        identityID: FIRST_IDENTITY,
      }),
    ).toBe(response);
    expect(getGenericResponseSigner(response)).toEqual({
      systemID: SYSTEM_ID,
      identityID: FIRST_IDENTITY,
    });

    expect(() =>
      ensureGenericResponseSigner({
        response,
        systemID: SYSTEM_ID,
        identityID: FIRST_IDENTITY,
      }),
    ).not.toThrow();
  });

  it('rejects a different identity for a later response detail', () => {
    const response = new GenericResponse();

    ensureGenericResponseSigner({
      response,
      systemID: SYSTEM_ID,
      identityID: FIRST_IDENTITY,
    });

    expect(() =>
      ensureGenericResponseSigner({
        response,
        systemID: SYSTEM_ID,
        identityID: SECOND_IDENTITY,
      }),
    ).toThrow('already locked');
  });
});

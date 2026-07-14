const mockGetIdentityContent = jest.fn();
const mockDecryptData = jest.fn();
const mockZGetEncryptionAddress = jest.fn();
const mockGetKeyMaterial = jest.fn();

jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {
    getBasicCoinObj: () => ({
      id: 'VRSC',
      system_id: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
    }),
  },
}));

jest.mock('../../api/channels/verusid/requests/getIdentityContent', () => ({
  getIdentityContent: mockGetIdentityContent,
}));

jest.mock('../../api/channels/dlight/requests/decrypt', () => ({
  decryptData: mockDecryptData,
}));

jest.mock('../../api/channels/dlight/requests/zGetEncryptionAddress', () => ({
  zGetEncryptionAddress: mockZGetEncryptionAddress,
}));

jest.mock('../../crypto/getKeyMaterial', () => ({
  getKeyMaterial: mockGetKeyMaterial,
}));

jest.mock('../../crypto/encryptCredentials', () => ({
  getConditionID: () => Buffer.alloc(20, 1),
}));

const {
  Credential,
  CredentialKey,
  DataDescriptor,
  DataDescriptorKey,
  FqnVdxfUniValue,
  VdxfUniValue,
} = require('verus-typescript-primitives');
const {
  getMissingCredentialKeys,
  getScopedCredentials,
} = require('../../deeplink/credentials/scopedCredentials');

const SYSTEM_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const IDENTITY_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const CREDENTIAL_KEY = 'iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj';

const buildStoredCredentialEntry = credential => {
  const plaintextDescriptor = new DataDescriptor({
    objectdata: new VdxfUniValue({
      values: [{[CredentialKey.vdxfid]: credential}],
    }).toBuffer(),
  });

  const plaintext = new VdxfUniValue({
    values: [{[DataDescriptorKey.vdxfid]: plaintextDescriptor}],
  }).toBuffer();

  const encryptedDescriptor = new DataDescriptor({
    flags: DataDescriptor.FLAG_ENCRYPTED_DATA,
    objectdata: Buffer.from('aabbcc', 'hex'),
    epk: Buffer.from('ddeeff', 'hex'),
  });

  const stored = FqnVdxfUniValue.fromVdxfUniValue(new VdxfUniValue({
    values: [{[DataDescriptorKey.vdxfid]: encryptedDescriptor}],
  })).toBuffer().toString('hex');

  return {plaintext, stored};
};

describe('scoped credential retrieval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetKeyMaterial.mockResolvedValue({extsk: '00'});
    mockZGetEncryptionAddress.mockResolvedValue({ivk: '11'.repeat(32)});
  });

  it('returns credentials matching requested key and scope', async () => {
    const credential = new Credential({
      version: Credential.VERSION_CURRENT,
      credentialKey: CREDENTIAL_KEY,
      credential: ['username', 'password'],
      scopes: [IDENTITY_ID],
    });
    const {plaintext, stored} = buildStoredCredentialEntry(credential);

    mockDecryptData.mockResolvedValue(plaintext.toString('hex'));
    mockGetIdentityContent.mockImplementation((systemId, identity, a, b, c, d, vdxfKey) => ({
      result: {
        identity: {
          contentmultimap: {
            [vdxfKey]: [stored],
          },
        },
      },
    }));

    const credentials = await getScopedCredentials({
      systemID: SYSTEM_ID,
      identityAddress: IDENTITY_ID,
      scope: IDENTITY_ID,
      credentialKeys: [CREDENTIAL_KEY],
    });

    expect(mockGetIdentityContent).toHaveBeenCalledWith(
      SYSTEM_ID,
      IDENTITY_ID,
      0,
      0,
      false,
      0,
      expect.any(String),
    );
    expect(credentials).toHaveLength(1);
    expect(credentials[0].credentialKey).toBe(CREDENTIAL_KEY);
  });

  it('filters credentials that do not match scope', async () => {
    const credential = new Credential({
      version: Credential.VERSION_CURRENT,
      credentialKey: CREDENTIAL_KEY,
      credential: ['username', 'password'],
      scopes: ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'],
    });
    const {plaintext, stored} = buildStoredCredentialEntry(credential);

    mockDecryptData.mockResolvedValue(plaintext.toString('hex'));
    mockGetIdentityContent.mockImplementation((systemId, identity, a, b, c, d, vdxfKey) => ({
      result: {
        identity: {
          contentmultimap: {
            [vdxfKey]: [stored],
          },
        },
      },
    }));

    const credentials = await getScopedCredentials({
      systemID: SYSTEM_ID,
      identityAddress: IDENTITY_ID,
      scope: IDENTITY_ID,
      credentialKeys: [CREDENTIAL_KEY],
    });

    expect(credentials).toHaveLength(0);
    expect(getMissingCredentialKeys([CREDENTIAL_KEY], credentials)).toEqual([CREDENTIAL_KEY]);
  });
});

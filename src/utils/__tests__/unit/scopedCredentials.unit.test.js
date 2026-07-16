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
  toBase58Check,
} = require('verus-typescript-primitives');
const { I_ADDR_VERSION } = require('verus-typescript-primitives/dist/constants/vdxf');
const {
  getMissingCredentialKeys,
  getScopedCredentials,
} = require('../../deeplink/credentials/scopedCredentials');

const SYSTEM_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const IDENTITY_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const CREDENTIAL_KEY = 'iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj';
const HASHED_KEY = toBase58Check(Buffer.alloc(20, 1), I_ADDR_VERSION);

const buildStoredCredentialEntry = (credential, descriptorOverrides = {}) => {
  const plaintextDescriptor = new DataDescriptor({
    objectdata: new VdxfUniValue({
      values: [{[CredentialKey.vdxfid]: credential}],
    }).toBuffer(),
  });

  const plaintext = new VdxfUniValue({
    values: [{[DataDescriptorKey.vdxfid]: plaintextDescriptor}],
  }).toBuffer();
  const directPlaintext = new VdxfUniValue({
    values: [{[CredentialKey.vdxfid]: credential}],
  }).toBuffer();

  const encryptedDescriptor = new DataDescriptor({
    flags: DataDescriptor.FLAG_ENCRYPTED_DATA,
    objectdata: Buffer.from('aabbcc', 'hex'),
    epk: Buffer.from('ddeeff', 'hex'),
    ...descriptorOverrides,
  });

  const stored = FqnVdxfUniValue.fromVdxfUniValue(new VdxfUniValue({
    values: [{[DataDescriptorKey.vdxfid]: encryptedDescriptor}],
  })).toBuffer().toString('hex');
  const storedJson = {
    [DataDescriptorKey.vdxfid]: encryptedDescriptor.toJson(),
  };

  return {plaintext, directPlaintext, stored, storedJson};
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
    const {plaintext, storedJson} = buildStoredCredentialEntry(credential);

    mockDecryptData.mockResolvedValue(plaintext.toString('hex'));
    mockGetIdentityContent.mockImplementation(() => ({
      result: {
        identity: {
          contentmultimap: {
            [HASHED_KEY]: [storedJson],
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
    );
    expect(mockDecryptData).toHaveBeenCalledWith({
      ivkHex: '11'.repeat(32),
      ephemeralPublicKeyHex: 'ddeeff',
      ciphertextHex: 'aabbcc',
      symmetricKeyHex: null,
    });
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
    mockGetIdentityContent.mockImplementation(() => ({
      result: {
        identity: {
          contentmultimap: {
            [HASHED_KEY]: [stored],
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

  it('returns credentials from direct decrypted credential plaintext', async () => {
    const credential = new Credential({
      version: Credential.VERSION_CURRENT,
      credentialKey: CREDENTIAL_KEY,
      credential: ['username', 'password'],
      scopes: [IDENTITY_ID],
    });
    const {directPlaintext, storedJson} = buildStoredCredentialEntry(credential);

    mockDecryptData.mockResolvedValue(directPlaintext.toString('hex'));
    mockGetIdentityContent.mockImplementation(() => ({
      result: {
        identity: {
          contentmultimap: {
            [HASHED_KEY]: [storedJson],
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

    expect(credentials).toHaveLength(1);
    expect(credentials[0].credentialKey).toBe(CREDENTIAL_KEY);
  });

  it('uses descriptor IVK when present', async () => {
    const credential = new Credential({
      version: Credential.VERSION_CURRENT,
      credentialKey: CREDENTIAL_KEY,
      credential: ['username', 'password'],
      scopes: [IDENTITY_ID],
    });
    const descriptorIvk = Buffer.from('22'.repeat(32), 'hex');
    const {plaintext, storedJson} = buildStoredCredentialEntry(credential, {
      ivk: descriptorIvk,
    });

    mockDecryptData.mockResolvedValue(plaintext.toString('hex'));
    mockGetIdentityContent.mockImplementation(() => ({
      result: {
        identity: {
          contentmultimap: {
            [HASHED_KEY]: [storedJson],
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

    expect(mockDecryptData).toHaveBeenCalledWith({
      ivkHex: '22'.repeat(32),
      ephemeralPublicKeyHex: 'ddeeff',
      ciphertextHex: 'aabbcc',
      symmetricKeyHex: null,
    });
    expect(credentials).toHaveLength(1);
  });

  it('continues after an undecryptable stored entry', async () => {
    const credential = new Credential({
      version: Credential.VERSION_CURRENT,
      credentialKey: CREDENTIAL_KEY,
      credential: ['username', 'password'],
      scopes: [IDENTITY_ID],
    });
    const {plaintext, storedJson} = buildStoredCredentialEntry(credential);

    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDecryptData
      .mockRejectedValueOnce(new Error('Failed to decrypt data'))
      .mockResolvedValueOnce(plaintext.toString('hex'));
    mockGetIdentityContent.mockImplementation(() => ({
      result: {
        identity: {
          contentmultimap: {
            [HASHED_KEY]: [storedJson, storedJson],
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

    expect(credentials).toHaveLength(1);
    console.warn.mockRestore();
  });
});

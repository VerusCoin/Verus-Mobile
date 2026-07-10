import createHash from 'create-hash';

/**
 * Trustless NFT integrity verification — wallet-local port of
 * apps/api/utils/nft-hash.ts (generateContentHash, parseSecureNFTName) and
 * the hashMetadata assembly in apps/api/utils/nft-helper.ts::verifyNFTIntegrity.
 *
 * At mint time a 16-char SHA-256 hash of the NFT's metadata is embedded in the
 * identity's NAME itself: `prefix_name_serial_contenthash.Parent@`. Because the
 * name is immutable on-chain (changing it means registering a different
 * identity), anyone can recompute this hash from the identity's CURRENT
 * contentmultimap and compare it — if someone with update authority swaps the
 * image/title/etc. after mint, the hashes stop matching. This is genuinely
 * trustless: no server is consulted, only chain data + a public algorithm.
 *
 * IMPORTANT: this must byte-for-byte match apps/api/utils/nft-hash.ts or every
 * genuine NFT will show as "tampered". Cross-validated against the live daemon
 * before shipping — see the project's parseNftPreview.js port for the sibling
 * CMM-decode piece this depends on.
 */

// apps/api/config/parent-identity.config.ts::PARENT_IDENTITY — the chain's root
// sub-identity namespace. Only strips a "<name>.PARENT_IDENTITY@"-style suffix
// from the creator field before hashing; a no-op for creators that aren't
// literally named under this parent. VRSCTEST dev value; update if this
// wallet build ever targets a mainnet deployment with a different root.
const PARENT_IDENTITY = 'vrealv1';

// apps/api/utils/nft-hash.ts::normalizeIpfsUrl
export function normalizeIpfsUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();

  if (trimmed.toLowerCase().startsWith('ipfs://')) {
    const cid = trimmed.substring(7);
    return `ipfs://${cid}`;
  }

  const ipfsMatch = /\/ipfs\/([a-z0-9]+)/i.exec(trimmed);
  if (ipfsMatch && ipfsMatch[1]) {
    return `ipfs://${ipfsMatch[1]}`;
  }

  return trimmed;
}

// apps/api/utils/nft-hash.ts::sanitizeSecure
export function sanitizeSecure(name) {
  return (name || '')
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
}

// apps/api/utils/nft-hash.ts::canonicalStringify
export function canonicalStringify(obj) {
  const sortedKeys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  const sorted = {};
  sortedKeys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return JSON.stringify(sorted);
}

// apps/api/utils/nft-hash.ts::generateContentHash
export function generateContentHash(metadata) {
  const parentSuffix = `.${PARENT_IDENTITY.replace(/@$/, '')}@`;
  const normalized = {
    creator: sanitizeSecure((metadata.creator || '').replace(parentSuffix, '').replace('@', '')),
    title: sanitizeSecure(metadata.title),
    description: metadata.description ? sanitizeSecure(metadata.description) : '',
    image: normalizeIpfsUrl(metadata.image),
    contentType: metadata.contentType || '',
    albumCover: metadata.albumCover ? normalizeIpfsUrl(metadata.albumCover) : '',
    serial: metadata.serial,
  };

  const canonical = canonicalStringify(normalized);
  const hash = createHash('sha256').update(canonical, 'utf8').digest('hex');

  return hash.substring(0, 16);
}

// apps/api/utils/nft-hash.ts::parseSecureNFTName
export function parseSecureNFTName(identityName) {
  if (!identityName) return null;
  const cleaned = identityName.replace('@', '');

  const dotParts = cleaned.split('.');
  if (dotParts.length < 2) return null;

  const namePart = dotParts[0];
  if (!namePart) return null;

  const parts = namePart.split('_');
  if (parts.length < 4) return null;

  const contentHash = parts[parts.length - 1];
  if (!contentHash || !/^[a-f0-9]{16}$/i.test(contentHash)) return null;

  const serialStr = parts[parts.length - 2];
  if (!serialStr) return null;
  const serial = parseInt(serialStr, 10);
  if (Number.isNaN(serial)) return null;

  return { serial, contentHash };
}

/**
 * Verify an NFT's current preview data against the content hash embedded in
 * its identity name (see apps/api/utils/nft-helper.ts::verifyNFTIntegrity).
 *
 * `checked: false` means the identity doesn't use the v2 secure-name format
 * (older/unrelated NFTs) — there's nothing to verify, not a red flag.
 * `checked: true, verified: false` means the current on-chain metadata does
 * NOT match what was hashed at mint time — the strongest signal this wallet
 * can give that something about this NFT's content changed after minting.
 */
export function verifyNftContentHash(identityName, preview) {
  const parsed = parseSecureNFTName(identityName);
  if (!parsed) return { checked: false, verified: false };

  const computedHash = generateContentHash({
    creator: (preview && preview.creator) || '',
    title: (preview && preview.displayName) || '',
    description: (preview && preview.description) || '',
    image: (preview && preview.image) || '',
    contentType: (preview && preview.contentType) || '',
    albumCover: (preview && preview.albumCover) || '',
    serial: parsed.serial,
  });

  return { checked: true, verified: computedHash === parsed.contentHash };
}

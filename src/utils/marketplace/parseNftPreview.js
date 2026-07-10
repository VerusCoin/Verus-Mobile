/* eslint-disable no-bitwise, no-plusplus, no-continue, no-restricted-syntax, import/prefer-default-export */
import { DataDescriptor } from 'verus-typescript-primitives/dist/index';
import { DataDescriptorKey } from 'verus-typescript-primitives/dist/vdxf/vdxfdatakeys';

/**
 * Trimmed, wallet-local port of packages/shared/cmm/parser.ts (`parseNftCmmMetadata`).
 *
 * Only extracts what a marketplace signing screen needs to show — displayName,
 * description, image, contentType, albumCover, url — from an NFT identity's
 * contentmultimap. Kept in the wallet fork (not imported from @verus/shared,
 * a monorepo-only workspace package this app cannot depend on).
 *
 * NFTs in this project were minted across several historical formats, so this
 * keeps all three extraction pillars from the source parser (JSON blob, direct
 * DataDescriptor fields, packed NFT binary buffer) rather than assuming one.
 * If a field is missing here that the web app shows, check parser.ts first —
 * this file intentionally does not port royalties/traits/rarity/socials/tags.
 */

// VDXF key ids (vdxfid), copied from packages/shared/constants/vdxf-keys.ts.
// These are stable hashes of fixed key names; only re-copy if that file's
// values for these keys ever change.
const NFT_KEY = 'iJncKkVBMdcCLJpGCmGZDRtK7pH11s5Pd2';
const DISPLAY_NAME_KEY = 'iRLoyqyz67CLsQL9tQkcHDh1mabTGHuhq9';
const DESCRIPTION_KEY = 'i7YUoT4WwnzLD9Nnd2P2VvB9JDNRhMFgA2';
const DATA_URL_KEY = 'i9HeBWrP1EHaXHo2N23ny1q1vDHb7FFirV';
const AVATAR_KEY = 'iCu8WvBkD8rgL98eyHjhRLk6KQeg5KGgvo';
const DATA_STRING_KEY = 'iK7a5JNJnbeuYWVHCDRpJosj3irGJ5Qa8c';

// packages/shared/utils/media-resolver.ts::isImageLikeUrl
function isImageLikeUrl(url) {
  const value = (url || '').trim().toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp|tiff|ico)(\?|#|$)/i.test(value);
}

// packages/shared/utils/media-validation.ts::isAllowedMediaUrl
function isAllowedMediaUrl(url) {
  if (!url) return false;
  return url.startsWith('https://') || url.startsWith('ipfs://') || url.startsWith('ar://');
}

function hexToBytes(hex) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) return new Uint8Array(0);
  const length = clean.length / 2;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, (i * 2) + 2), 16);
  }
  return bytes;
}

function readVarInt(bytes, offset) {
  let value = 0;
  let bytesRead = 0;
  while (offset + bytesRead < bytes.length) {
    const b = bytes[offset + bytesRead];
    value = (value << 7) | (b & 0x7f);
    bytesRead++;
    if (!(b & 0x80)) break;
    value++;
  }
  return { value, bytesRead };
}

function readCompactSize(bytes, offset) {
  if (offset >= bytes.length) return { value: 0, bytesRead: 0 };
  const b = bytes[offset];
  if (b < 253) return { value: b, bytesRead: 1 };
  if (b === 253) {
    if (offset + 2 >= bytes.length) return { value: 0, bytesRead: 1 };
    return { value: bytes[offset + 1] | (bytes[offset + 2] << 8), bytesRead: 3 };
  }
  return { value: b, bytesRead: 1 };
}

function readVarSlice(bytes, offset) {
  if (offset >= bytes.length) return null;
  const len = readCompactSize(bytes, offset);
  if (len.bytesRead <= 0 || len.value < 0) return null;
  const start = offset + len.bytesRead;
  const end = start + len.value;
  if (end > bytes.length) return null;
  return { data: bytes.slice(start, end), bytesRead: len.bytesRead + len.value };
}

function readVarSliceString(bytes, offset) {
  const slice = readVarSlice(bytes, offset);
  if (!slice) return null;
  try {
    return { data: new TextDecoder().decode(slice.data), bytesRead: slice.bytesRead };
  } catch (e) {
    return null;
  }
}

// CDataDescriptor flag constants (src/pbaas/vdxf.h)
const DD_FLAG_VDXF_KEY_PRESENT = 0x80;
const DD_FLAG_MASK = 0xff;

function unwrapDescriptor(bytes) {
  if (bytes.length < 3) return bytes;
  try {
    let offset = 0;
    const v = readVarInt(bytes, offset);
    if (v.value !== 1) return bytes;
    offset += v.bytesRead;
    const f = readVarInt(bytes, offset);
    if (f.value & ~DD_FLAG_MASK) return bytes;
    offset += f.bytesRead;
    if (f.value & DD_FLAG_VDXF_KEY_PRESENT) offset += 20;
    const len = readCompactSize(bytes, offset);
    if (len.value > 0 && offset + len.bytesRead + len.value <= bytes.length) {
      return bytes.slice(offset + len.bytesRead, offset + len.bytesRead + len.value);
    }
  } catch (e) {
    /* not a descriptor */
  }
  return bytes;
}

function extractFuzzyString(bytes, offset) {
  if (offset >= bytes.length) return { data: '', bytesRead: 0 };
  try {
    const vi = readVarInt(bytes, offset);
    if (vi.value > 0 && vi.value < 2000 && offset + vi.bytesRead + vi.value <= bytes.length) {
      const data = new TextDecoder().decode(
        bytes.slice(offset + vi.bytesRead, offset + vi.bytesRead + vi.value),
      );
      if (/[ -~]{2,}/.test(data) && !data.includes('\0')) {
        return { data, bytesRead: vi.bytesRead + vi.value };
      }
    }
  } catch (e) {
    /* ignore */
  }
  try {
    const cs = readCompactSize(bytes, offset);
    if (cs.value > 0 && cs.value < 2000 && offset + cs.bytesRead + cs.value <= bytes.length) {
      const data = new TextDecoder().decode(
        bytes.slice(offset + cs.bytesRead, offset + cs.bytesRead + cs.value),
      );
      if (/[ -~]{2,}/.test(data) && !data.includes('\0')) {
        return { data, bytesRead: cs.bytesRead + cs.value };
      }
    }
  } catch (e) {
    /* ignore */
  }
  const slice = bytes.slice(offset, offset + 100);
  const data = new TextDecoder().decode(slice).split('\0')[0] || '';
  if (data.length > 3 && /[ -~]{3,}/.test(data)) {
    const clean = data.replace(/[^\x20-\x7E]/g, '');
    if (clean.length > 2) return { data: clean, bytesRead: data.length };
  }
  return { data: '', bytesRead: 0 };
}

function sanitizeCmmString(text) {
  if (!text) return undefined;
  let cleaned = text
    .replace(/https?:\/\/.*/i, '')
    .replace(/ipfs:\/\/.*/i, '')
    .trim();
  cleaned = cleaned.replace(/\.[a-z0-9`]{1,4}$/i, '').trim();
  return cleaned || undefined;
}

function decodeDescriptorText(bytes) {
  try {
    const dd = new DataDescriptor();
    dd.fromBuffer(Buffer.from(bytes));
    if (dd.objectdata && dd.objectdata.length > 0) {
      const s = dd.objectdata.toString('utf8').trim();
      if (s.length >= 1 && /[\x20-\x7E]/.test(s) && !/^[0-9a-f]{10,}$/i.test(s)) return s;
    }
  } catch (e) {
    /* not a DataDescriptor */
  }
  return undefined;
}

function getEntryValueFromItem(item) {
  const typedDd = item && typeof item === 'object' ? item[DataDescriptorKey.vdxfid] : undefined;
  if (typedDd && typeof typedDd === 'object') {
    try {
      const dd = DataDescriptor.fromJson(typedDd);
      const buf = dd.toBuffer();
      if (buf && buf.length > 0) return buf.toString('hex');
    } catch (e) {
      /* ignore */
    }
  }
  return (
    (item && typeof item.serializedhex === 'string' && item.serializedhex)
    || (item && typeof item.message === 'string' && item.message)
    || (typeof item === 'string' ? item : null)
  );
}

function getEntry(cmm, key) {
  const entry = cmm[key];
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry) && entry.length > 0) {
    for (const item of entry) {
      const val = getEntryValueFromItem(item);
      if (val) return val;
    }
  }
  return null;
}

function extractString(cmm, key) {
  const hex = getEntry(cmm, key);
  if (!hex) return undefined;
  const bytes = hexToBytes(hex);
  if (bytes.length === 0) return undefined;

  const proper = decodeDescriptorText(bytes);
  if (proper !== undefined) return proper;

  const unwrapped = unwrapDescriptor(bytes);
  const fuzzy = extractFuzzyString(unwrapped, 0);
  if (fuzzy.data && fuzzy.data.length > 2) return fuzzy.data;
  try {
    const raw = new TextDecoder().decode(unwrapped).trim();
    const clean = raw.replace(/[^\x20-\x7E]/g, '').trim();
    if (clean.length >= 3 && !/^[0-9a-f]{10,}$/i.test(clean)) return clean;
  } catch (e) {
    /* ignore */
  }
  return undefined;
}

function extractJson(bytes) {
  if (!bytes || bytes.length === 0 || bytes.length > 50000) return null;
  const markers = [0x7b, 0x5b];
  for (const marker of markers) {
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] !== marker) continue;
      try {
        const subBytes = bytes.slice(i);
        const text = new TextDecoder().decode(subBytes);
        const endChar = marker === 0x7b ? '}' : ']';
        const lastIdx = text.lastIndexOf(endChar);
        if (lastIdx === -1) continue;
        const candidate = text.slice(0, lastIdx + 1);
        try {
          return JSON.parse(candidate);
        } catch (e) {
          if (marker === 0x7b) {
            const fuzzyResult = {};
            const fields = ['displayName', 'title', 'description', 'image', 'contentType', 'albumCover'];
            let foundAny = false;
            fields.forEach((field) => {
              const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`, 'i');
              const match = regex.exec(candidate);
              if (match && match[1]) {
                [, fuzzyResult[field]] = match;
                foundAny = true;
              }
            });
            if (foundAny) return fuzzyResult;
          }
        }
      } catch (e) {
        /* ignore */
      }
    }
  }
  return null;
}

function assignIfValid(target, key, value, options = {}) {
  if (value === undefined || value === null) return;
  if (options.fillOnly && target[key] !== undefined) return;
  let finalValue = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    const MEDIA_KEYS = new Set(['image', 'url', 'uri', 'avatar', 'albumCover']);
    if (MEDIA_KEYS.has(key) && !isAllowedMediaUrl(trimmed)) return;
    finalValue = options.sanitize ? sanitizeCmmString(trimmed) : trimmed;
  }
  if (finalValue !== undefined) target[key] = finalValue;
}

function assignNestedDisplayName(json, result) {
  const t = json.title;
  if (t && typeof t === 'object' && !Array.isArray(t)) {
    assignIfValid(result, 'displayName', t.display, { sanitize: true, fillOnly: true });
  }
  const d = json.display;
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    assignIfValid(result, 'displayName', d.title, { sanitize: true, fillOnly: true });
  }
}

// Pillar 0: NFT_KEY entry as a JSON metadata blob (one historical minting format).
//
// IMPORTANT: this is also, in practice, where `creator` gets picked up for
// NFTs minted via the packed-binary NFT class (Pillar 2's own format). The
// source parser.ts has a bug in parseNftBinaryBuffer: it gates the metadata
// slice read on the *outer* DataDescriptor's flags param (always 0 for these
// NFTs) instead of the inner NFT class's own flags it already read locally —
// so parseNftMetadataSlice below never actually runs for real minted NFTs.
// Pillar 0's marker-to-end-of-buffer JSON scan happens to land on the exact
// same trailing metadata JSON blob anyway (verified against live on-chain
// data), so `creator` is extracted here instead. Left in parseNftMetadataSlice
// too in case that gate ever does open for some other NFT shape.
function extractPillar0Json(cmm, result) {
  const hex = getEntry(cmm, NFT_KEY);
  if (!hex) return;
  const json = extractJson(unwrapDescriptor(hexToBytes(hex)));
  if (!json || typeof json !== 'object') return;

  assignNestedDisplayName(json, result);
  assignIfValid(result, 'displayName', json.displayName, { sanitize: true, fillOnly: true });
  assignIfValid(result, 'displayName', json.title, { sanitize: true, fillOnly: true });
  assignIfValid(result, 'description', json.description, { sanitize: true, fillOnly: true });
  assignIfValid(result, 'image', json.image, { fillOnly: true });
  assignIfValid(result, 'url', json.url, { fillOnly: true });
  assignIfValid(result, 'url', json.uri, { fillOnly: true });
  assignIfValid(result, 'contentType', json.contentType, { fillOnly: true });
  assignIfValid(result, 'albumCover', json.albumCover, { fillOnly: true });
  assignIfValid(result, 'creator', json.creator, { fillOnly: true });
}

// Pillar 1: dedicated CMM keys with direct DataDescriptor-encoded values.
// NOTE: unlike the source parser.ts (which leaves this pillar's image/avatar
// unguarded and relies on isAllowedMediaUrl only inside assignIfValid), this
// wallet-side port applies the same scheme allowlist here too — this is a
// signing screen, so treat every URL source as untrusted the same way.
function extractPillar1Direct(cmm, result) {
  const displayName = extractString(cmm, DISPLAY_NAME_KEY);
  if (displayName) result.displayName = sanitizeCmmString(displayName);

  const description = extractString(cmm, DESCRIPTION_KEY);
  if (description) result.description = sanitizeCmmString(description);

  const avatar = extractString(cmm, AVATAR_KEY);
  if (avatar && isAllowedMediaUrl(avatar)) result.avatar = avatar;

  const image = extractString(cmm, DATA_URL_KEY);
  if (image && isAllowedMediaUrl(image)) result.image = image;
}

function parseNftMetadataSlice(raw, offset, result) {
  const metaDescriptorSlice = readVarSlice(raw, offset);
  if (!metaDescriptorSlice) return;
  const unwrappedMeta = unwrapDescriptor(metaDescriptorSlice.data);
  const metaJson = extractJson(unwrappedMeta);
  if (metaJson && typeof metaJson === 'object') {
    assignIfValid(result, 'contentType', metaJson.contentType, { fillOnly: true });
    assignIfValid(result, 'albumCover', metaJson.albumCover, { fillOnly: true });
    // Not used for display — only for nftIntegrity.js's content-hash check,
    // which needs the raw creator name string exactly as minted (matches
    // apps/api's CmmMapper.enrichNftFromBinaryClass reading the same field).
    assignIfValid(result, 'creator', metaJson.creator, { fillOnly: true });
  }
}

// Pillar 2: packed binary NFT metadata buffer (title + description + a data
// descriptor holding the image/media URL), the other historical minting format.
function parseNftBinaryBuffer(raw, result, nftFlags) {
  let innerOffset = 0;
  const version = readVarInt(raw, innerOffset);
  innerOffset += version.bytesRead;
  const flags = readVarInt(raw, innerOffset);
  innerOffset += flags.bytesRead;

  const strictTitle = readVarSliceString(raw, innerOffset);
  if (strictTitle) {
    assignIfValid(result, 'displayName', strictTitle.data, { sanitize: true, fillOnly: true });
    innerOffset += strictTitle.bytesRead;
    const strictDescription = readVarSliceString(raw, innerOffset);
    if (strictDescription) {
      assignIfValid(result, 'description', strictDescription.data, { sanitize: true, fillOnly: true });
      innerOffset += strictDescription.bytesRead;
      const dataDescriptorSlice = readVarSlice(raw, innerOffset);
      if (dataDescriptorSlice) {
        innerOffset += dataDescriptorSlice.bytesRead;
        const unwrappedData = unwrapDescriptor(dataDescriptorSlice.data);
        const decodedUrl = new TextDecoder().decode(unwrappedData).trim();
        if ((nftFlags & 1) !== 0) {
          parseNftMetadataSlice(raw, innerOffset, result);
        }
        const isAudio = typeof result.contentType === 'string' && result.contentType.startsWith('audio/');
        if (isAudio) {
          assignIfValid(result, 'url', decodedUrl, { fillOnly: true });
          if (result.albumCover) assignIfValid(result, 'image', result.albumCover, { fillOnly: true });
        } else {
          assignIfValid(result, 'image', decodedUrl, { fillOnly: true });
        }
      }
    }
  } else {
    const titleRes = extractFuzzyString(raw, innerOffset);
    if (titleRes.data) {
      assignIfValid(result, 'displayName', titleRes.data, { sanitize: true, fillOnly: true });
      innerOffset += titleRes.bytesRead;
      const descRes = extractFuzzyString(raw, innerOffset);
      assignIfValid(result, 'description', descRes.data, { sanitize: true, fillOnly: true });
    }
  }
}

function extractPillar2NftClass(cmm, result) {
  const nftHex = getEntry(cmm, NFT_KEY) || getEntry(cmm, 'vrealv1::nft');
  if (!nftHex) return;
  try {
    const bytes = hexToBytes(nftHex);
    let offset = 0;
    const v = readVarInt(bytes, offset);
    offset += v.bytesRead;
    const f = readVarInt(bytes, offset);
    offset += f.bytesRead;
    const objLen = readCompactSize(bytes, offset);
    let raw = bytes.slice(offset + objLen.bytesRead, offset + objLen.bytesRead + objLen.value);
    if (raw.length === 0) raw = bytes;
    parseNftBinaryBuffer(raw, result, f.value);
  } catch (e) {
    /* ignore */
  }
}

// Fallback displayName source used by some older identities.
function extractAdditionalFields(cmm, result) {
  assignIfValid(result, 'displayName', extractString(cmm, DATA_STRING_KEY), {
    sanitize: true,
    fillOnly: true,
  });
}

/**
 * Parse an NFT's contentmultimap into `{ displayName, description, image,
 * contentType, url, albumCover }` for display on a signing screen. Missing
 * fields are simply absent — callers must render a fallback, never block on it.
 */
export function parseNftPreview(contentmultimap) {
  const result = {};
  if (!contentmultimap || typeof contentmultimap !== 'object') return result;

  extractPillar0Json(contentmultimap, result);
  extractPillar1Direct(contentmultimap, result);
  extractPillar2NftClass(contentmultimap, result);
  extractAdditionalFields(contentmultimap, result);

  // Audio NFTs: the binary parser exposes the media file as `image`; normalize
  // to `url` for playback and prefer albumCover as the thumbnail image.
  if (
    !result.url
    && typeof result.contentType === 'string'
    && result.contentType.startsWith('audio/')
    && typeof result.image === 'string'
    && !isImageLikeUrl(result.image)
  ) {
    result.url = result.image;
    if (result.albumCover) result.image = result.albumCover;
  }

  return result;
}

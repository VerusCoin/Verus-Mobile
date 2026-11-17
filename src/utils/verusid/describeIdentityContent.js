import {Buffer} from 'buffer';
import {
  DataDescriptor,
  DataDescriptorKey,
  DataStringKey,
  DataURLKey,
} from 'verus-typescript-primitives';
import {capitalizeString} from '../stringUtils';
import {getVDXFKeyLabel} from '../vdxf/vdxfTypeLabels';
import {formatContentFieldCount} from '../identityUpdate/contentReview';

// Content v1: a read-only description of the on-chain content of a VerusID,
// for the Content sheet on the VerusID page. Encrypted values are never
// decrypted, and images are never decoded or loaded.
//
// describeIdentityContent(identity) returns entries `{key, label, source,
// rows}`: contentmultimap keys in their order, then contentmap keys. `source`
// is 'contentmultimap' or 'contentmap'. Each row is `{kind, value, count?,
// label?}`. All encrypted values under one key form one row with `count`. A
// row has a `label` only when a DataDescriptor label names a value under a key
// with no known name. A contentmap row holds the raw hash as its value.
//
// `identity` is the inner `identity` object of a getidentity result, or the
// whole result.

export const IDENTITY_CONTENT_KIND = {
  ENCRYPTED: 'encrypted',
  TEXT: 'text',
  LINK: 'link',
  IMAGE: 'image',
  DATA: 'data',
};

export const IDENTITY_CONTENT_SOURCE = {
  CONTENT_MULTIMAP: 'contentmultimap',
  CONTENT_MAP: 'contentmap',
};

const KIND = IDENTITY_CONTENT_KIND;
const FLAG_ENCRYPTED_DATA = DataDescriptor.FLAG_ENCRYPTED_DATA.toNumber();
const MAX_DEPTH = 6;

const unreadable = () => ({kind: KIND.DATA, value: 'Unreadable data'});

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

const isPlainObject = value =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const isHex = value =>
  typeof value === 'string' && value.length % 2 === 0 && /^[0-9a-f]*$/i.test(value);

// Control characters other than tab, line feed and carriage return mean the
// bytes are not text.
const NON_TEXT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;

// The UTF-8 text of hex bytes, or null when the bytes are not printable text.
// The round trip rejects invalid UTF-8.
const hexToText = hex => {
  if (!hex) return null;
  const text = Buffer.from(hex, 'hex').toString('utf8');
  if (Buffer.from(text, 'utf8').toString('hex') !== hex.toLowerCase()) {
    return null;
  }
  return text.trim() && !NON_TEXT.test(text) ? text : null;
};

const formatSize = bytes => {
  if (bytes < 1024) return plural(bytes, 'byte', 'bytes');
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const describeStructured = value => ({
  kind: KIND.DATA,
  value: Array.isArray(value)
    ? plural(value.length, 'item', 'items')
    : formatContentFieldCount(Object.keys(value).length),
});

// JSON text with an object or array at the top describes as structured data.
const parseJsonText = text => {
  const trimmed = text.trim();
  if (!/^[[{]/.test(trimmed)) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed != null && typeof parsed === 'object' ? parsed : null;
  } catch (e) {
    return null;
  }
};

const describeText = text => {
  const json = parseJsonText(text);
  return json ? describeStructured(json) : {kind: KIND.TEXT, value: text};
};

const describeString = value => {
  if (!isHex(value)) return describeText(value);
  const text = hexToText(value);
  if (text != null) return describeText(text);
  return {kind: KIND.DATA, value: `Data · ${formatSize(value.length / 2)}`};
};

const describeImage = objectdata => ({
  kind: KIND.IMAGE,
  value: isHex(objectdata)
    ? `Image · ${formatSize(objectdata.length / 2)}`
    : 'Image',
});

const parseFlags = flags => {
  if (flags == null) return 0;
  if (typeof flags === 'number') {
    return Number.isInteger(flags) && flags >= 0 ? flags : null;
  }
  if (typeof flags === 'string' && /^\d+$/.test(flags)) {
    return parseInt(flags, 10);
  }
  return null;
};

const describeDescriptor = (descriptor, depth) => {
  if (!isPlainObject(descriptor)) return unreadable();
  const flags = parseFlags(descriptor.flags);
  if (flags == null) return unreadable();
  if (flags & FLAG_ENCRYPTED_DATA) return {kind: KIND.ENCRYPTED};

  const mimetype =
    typeof descriptor.mimetype === 'string'
      ? descriptor.mimetype.trim().toLowerCase()
      : '';
  const row = mimetype.startsWith('image/')
    ? describeImage(descriptor.objectdata)
    : describeValue(descriptor.objectdata, depth + 1);
  const label =
    typeof descriptor.label === 'string' ? descriptor.label.trim() : '';

  return label ? {...row, label} : row;
};

const describeLink = value => {
  const url = isPlainObject(value) ? value.url : value;
  return typeof url === 'string' && url.trim()
    ? {kind: KIND.LINK, value: url.trim()}
    : unreadable();
};

// A one-key object keyed by a VDXF type, such as a DataDescriptor or a
// DataString.
const describeTyped = (typeKey, inner, depth) => {
  if (typeKey === DataDescriptorKey.vdxfid) {
    return describeDescriptor(inner, depth);
  }
  if (typeKey === DataURLKey.vdxfid) return describeLink(inner);
  if (typeKey === DataStringKey.vdxfid && typeof inner === 'string') {
    return {kind: KIND.TEXT, value: inner};
  }
  return describeValue(inner, depth + 1);
};

function describeValue(value, depth = 0) {
  if (depth > MAX_DEPTH) return unreadable();
  if (typeof value === 'string') return describeString(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return {kind: KIND.TEXT, value: String(value)};
  }
  if (Array.isArray(value)) return describeStructured(value);
  if (!isPlainObject(value)) return unreadable();

  const keys = Object.keys(value);
  if (keys.length === 1 && typeof value.message === 'string') {
    return describeText(value.message);
  }
  if (keys.length === 1 && getVDXFKeyLabel(keys[0], true) != null) {
    return describeTyped(keys[0], value[keys[0]], depth);
  }
  return describeStructured(value);
}

const flattenValues = value =>
  Array.isArray(value) ? value.flatMap(flattenValues) : [value];

const getKnownKeyName = key => {
  const name = getVDXFKeyLabel(key, true);
  return name ? capitalizeString(name) : null;
};

// As getCmmDataKeyLabel: the known VDXF name, else the abbreviated id.
const getKeyLabel = key =>
  getKnownKeyName(key) ?? (key.length > 8 ? getVDXFKeyLabel(key) : key);

const describeMultimapRows = (key, values) => {
  const keyHasName = getKnownKeyName(key) != null;
  const rows = [];
  let encrypted = null;

  for (const value of flattenValues(values)) {
    let row;
    try {
      row = describeValue(value);
    } catch (e) {
      row = unreadable();
    }

    if (row.kind === KIND.ENCRYPTED) {
      if (!encrypted) {
        encrypted = {kind: KIND.ENCRYPTED, count: 0};
        rows.push(encrypted);
      }
      encrypted.count += 1;
      continue;
    }

    rows.push(
      row.label && keyHasName ? {kind: row.kind, value: row.value} : row,
    );
  }

  if (encrypted) {
    encrypted.value = plural(encrypted.count, 'value', 'values');
  }
  return rows;
};

const getContentMaps = identity => {
  if (!isPlainObject(identity)) return {};
  const inner =
    isPlainObject(identity.identity) && identity.contentmultimap == null
      ? identity.identity
      : identity;
  return {
    contentmultimap: isPlainObject(inner.contentmultimap)
      ? inner.contentmultimap
      : {},
    contentmap: isPlainObject(inner.contentmap) ? inner.contentmap : {},
  };
};

export const describeIdentityContent = identity => {
  const entries = [];

  try {
    const {contentmultimap, contentmap} = getContentMaps(identity);

    for (const key of Object.keys(contentmultimap)) {
      let rows;
      try {
        rows = describeMultimapRows(key, contentmultimap[key]);
      } catch (e) {
        rows = [unreadable()];
      }
      if (rows.length) {
        entries.push({
          key,
          label: getKeyLabel(key),
          source: IDENTITY_CONTENT_SOURCE.CONTENT_MULTIMAP,
          rows,
        });
      }
    }

    for (const key of Object.keys(contentmap)) {
      const hash = contentmap[key];
      entries.push({
        key,
        label: getKeyLabel(key),
        source: IDENTITY_CONTENT_SOURCE.CONTENT_MAP,
        rows: [
          typeof hash === 'string' && hash
            ? {kind: KIND.DATA, value: hash}
            : unreadable(),
        ],
      });
    }
  } catch (e) {
    // Keep the entries described so far.
  }

  return entries;
};

// One key can hold several values. Count what the content page lists.
export const countIdentityContentEntries = identity =>
  describeIdentityContent(identity).reduce((count, entry) => count + entry.rows.length, 0);

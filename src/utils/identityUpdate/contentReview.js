import {Buffer} from 'buffer';
import {
  BigNumber,
  DataByteVectorKey,
  DataDescriptor,
  DataDescriptorKey,
  DataURLKey,
  EncryptionDescriptorKey,
  FqnVdxfUniValue,
  MMRDescriptor,
  PartialMMRData,
  PartialSignData,
  VdxfUniValue,
} from 'verus-typescript-primitives';
import {getVDXFKeyLabel} from '../vdxf/vdxfTypeLabels';

const LABELS = {
  message: 'Message', messagehex: 'Message (hex)', messagebase64: 'Message (base64)',
  serializedhex: 'Encoded data (hex)', serializedbase64: 'Encoded data (base64)',
  binarydata: 'Request bytes (hex)', objectdata: 'Content', vdxfdata: 'Structured content',
  mmrdata: 'Content items', data: 'Content', filename: 'File name', datahash: 'Content hash',
  mimetype: 'Media type', encrypttoaddress: 'Encryption recipient', createmmr: 'Create content tree',
  prefixstring: 'Signing prefix', vdxfkeys: 'Data keys', vdxfkeynames: 'Data key names',
  boundhashes: 'Bound hashes', hashtype: 'Hash method', mmrhashtype: 'Content tree hash method',
  mmrsalt: 'Content tree salts', priormmr: 'Previous content tree', datatype: 'Data type',
  vdxfkey: 'Data key', epk: 'Encryption public key', ivk: 'Incoming viewing key',
  ssk: 'Symmetric encryption key', url: 'URL', flags: 'Flags', signature: 'Signature',
};
const METADATA = new Set(['flags', 'version', 'datatype', 'hashtype', 'mmrhashtype', 'mmrsalt',
  'salt', 'priormmr', 'vdxfkey', 'vdxfkeys', 'vdxfkeynames', 'boundhashes', 'signature',
  'prefixstring', 'encrypttoaddress', 'createmmr', 'address', 'epk', 'ivk', 'ssk']);
const CONTENT_KEYS = new Set(['message', 'messagehex', 'messagebase64', 'vdxfdata', 'mmrdata',
  'objectdata', 'data', 'serializedhex', 'serializedbase64']);
const TYPE_FIELDS = {1: 'mmrdata', 2: 'filename', 3: 'message', 4: 'vdxfdata',
  5: 'messagehex', 6: 'messagebase64', 7: 'datahash', 8: 'message'};
const HASH_NAMES = {1: 'blake2b', 2: 'blake2bmmr2', 3: 'keccak256', 4: 'sha256D', 5: 'sha256'};
const isHex = value => typeof value === 'string' && /^(?:[0-9a-f]{2})*$/i.test(value);
// Custom field names are user content too. Preserve their spelling so apiKey,
// api_key, and api-key cannot become indistinguishable during review.
const fieldLabel = key => LABELS[key] || getVDXFKeyLabel(key, true) || key || 'Data';

// Keep numeric lexemes intact: parsing and re-stringifying JSON rounds large numbers.
const formatText = text => {
  if (!/^[\s]*[\[{]/.test(text)) return text;
  try { JSON.parse(text); } catch (_) { return text; }
  let result = '', depth = 0, quoted = false, escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      result += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') { quoted = true; result += char; }
    else if (char === '{' || char === '[') { depth++; result += `${char}\n${'  '.repeat(depth)}`; }
    else if (char === '}' || char === ']') { depth--; result += `\n${'  '.repeat(depth)}${char}`; }
    else if (char === ',') result += `,\n${'  '.repeat(depth)}`;
    else if (char === ':') result += ': ';
    else if (!/\s/.test(char)) result += char;
  }
  return result;
};

const readableUtf8 = bytes => {
  const text = bytes.toString('utf8');
  return Buffer.from(text, 'utf8').equals(bytes) && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(text)
    ? text : null;
};

const uploadData = (data, type) => {
  const key = TYPE_FIELDS[String(type)] || 'data';
  if (!Buffer.isBuffer(data)) return {[key]: data};
  if (key === 'message' || key === 'filename') {
    const text = readableUtf8(data);
    return text == null ? {messagehex: data.toString('hex')} : {[key]: text};
  }
  return {[key]: data.toString(key === 'messagebase64' ? 'base64' : 'hex')};
};

// Read native fields directly. toCLIJson can reject binary VDXF/MMR values and
// toBuffer can update flags on the request; neither belongs in a review model.
const uploadView = upload => ({
  ...uploadData(upload.data, upload.dataType),
  flags: upload.flags?.toString(), datatype: upload.dataType?.toString(),
  address: upload.address?.toAddress(), prefixstring: upload.prefixString,
  vdxfkeys: upload.vdxfKeys?.map(key => key.toAddress()), vdxfkeynames: upload.vdxfKeyNames,
  boundhashes: upload.boundHashes?.map(hash => hash.toString('hex')),
  hashtype: HASH_NAMES[upload.hashType?.toString()] || upload.hashType?.toString(),
  encrypttoaddress: upload.encryptToAddress?.toAddressString(), createmmr: upload.createMMR,
  signature: upload.signature?.toString('base64'),
});

const mmrView = mmr => ({
  mmrdata: mmr.data.map(unit => ({...uploadData(unit.data, unit.type), datatype: unit.type.toString()})),
  flags: mmr.flags?.toString(), mmrsalt: mmr.salt?.map(salt => salt.toString('hex')),
  mmrhashtype: HASH_NAMES[mmr.mmrhashtype?.toString()] || mmr.mmrhashtype?.toString(),
  priormmr: mmr.priormmr?.map(value => value.toString('hex')),
});

const descriptorView = descriptor => ({
  objectdata: descriptor.objectdata, label: descriptor.label, mimetype: descriptor.mimeType,
  version: descriptor.version, flags: descriptor.flags, vdxfkey: descriptor.vdxfKey,
  salt: descriptor.salt?.toString('hex'), epk: descriptor.epk?.toString('hex'),
  ivk: descriptor.ivk?.toString('hex'), ssk: descriptor.ssk?.toString('hex'),
});

/** Display only. Never use this model to construct or sign an identity update. */
export const buildContentReview = (value, {label = 'Content', isUpload = false} = {}) => {
  const fields = [], warnings = new Set(), ancestors = new Set();
  const warn = warning => warnings.add(warning);
  const normalize = input => {
    if (typeof input === 'bigint') return input.toString();
    if (input == null || typeof input !== 'object') return input;
    if (Buffer.isBuffer(input)) return {serializedhex: input.toString('hex')};
    if (BigNumber.isBN(input)) return input.toString(10);
    if (ancestors.has(input)) { warn('Some content contains a circular reference and cannot be displayed.'); return '[Circular reference]'; }
    ancestors.add(input);
    let source = input;
    try {
      if (input instanceof PartialSignData) source = uploadView(input);
      else if (input instanceof PartialMMRData) source = mmrView(input);
      else if (input instanceof DataDescriptor) source = descriptorView(input);
      else if (input instanceof MMRDescriptor) source = {
        datadescriptors: input.dataDescriptors, mmrroot: input.mmrRoot, mmrhashes: input.mmrHashes,
        version: input.version, objecthashtype: input.objectHashType, mmrhashtype: input.mmrHashType,
      };
      else if (input instanceof FqnVdxfUniValue) {
        source = [...input.entries()].map(([key, data]) => ({[key.address]: data}));
        if (input._rawBytes !== undefined) source.push({'': input._rawBytes});
      }
      else if (input instanceof VdxfUniValue) {
        // Read each member independently so an opaque member cannot hide its siblings.
        source = input.values;
      } else if (input instanceof Map) {
        source = [...input.entries()].map(([key, data]) => ({key, data}));
      } else if (typeof input.toJson === 'function') {
        try { source = input.toJson(); } catch (_) { source = {...input}; }
      }
      if (Array.isArray(source)) return source.map(normalize);
      if (source == null || typeof source !== 'object') return source;
      const result = {};
      for (const key of Object.keys(source)) {
        if (typeof source[key] !== 'function' && source[key] !== undefined) {
          Object.defineProperty(result, key, {value: normalize(source[key]), enumerable: true});
        }
      }
      return result;
    } finally { ancestors.delete(input); }
  };

  const normalized = normalize(value);
  const visibleText = text => String(text).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, char => {
    warn('Some text contains invisible control characters. They are shown as Unicode escapes so you can review them.');
    return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
  });
  const add = (key, path, text, kind = 'text') => fields.push({
    id: `${fields.length}:${path.join('.')}:${key}`, label: visibleText(fieldLabel(key)),
    path: path.map(part => visibleText(fieldLabel(part))).join(' › '), value: visibleText(text), kind,
  });

  const decodeBytes = (bytes, key, path, encrypted, encodedText) => {
    let readable = false;
    if (!encrypted && bytes.length) {
      // Parse only complete, byte-exact VDXF objects. Unknown/trailing bytes stay visible.
      for (const Type of [VdxfUniValue, FqnVdxfUniValue]) {
        try {
          const typed = new Type();
          const consumed = typed.fromBuffer(bytes);
          if (consumed === bytes.length && typed.values.some(item => Object.keys(item).some(k => k !== '')) &&
              typed.toBuffer().equals(bytes)) {
            visit(normalize(typed), 'Decoded content', path.concat(key), false);
            readable = true;
            break;
          }
        } catch (_) { /* Fall back to exact UTF-8 or encoded bytes. */ }
      }
      if (!readable) {
        const text = readableUtf8(bytes);
        if (text != null) { add('Decoded text', path.concat(key), formatText(text)); readable = true; }
      }
    }
    if (!readable && bytes.length && !encrypted) warn('Some content is binary or uses an unsupported format. Its exact encoded data is included, but its meaning cannot be fully displayed.');
    add(key, path, encodedText === '' ? 'Empty data (0 bytes)' : encodedText, 'encoded');
  };

  const visit = (input, key, path, encrypted = false) => {
    if (input == null) { add(key, path, 'null', 'empty'); return; }
    if (Array.isArray(input)) {
      if (!input.length) add(key, path, 'Empty list', 'empty');
      input.forEach((item, index) => visit(item, `Item ${index + 1}`, path.concat(key), encrypted));
      return;
    }
    if (typeof input === 'object') {
      const isDescriptor = key === DataDescriptorKey.vdxfid || Object.prototype.hasOwnProperty.call(input, 'objectdata');
      const encryptedHere = encrypted || key === EncryptionDescriptorKey.vdxfid ||
        (isDescriptor && (Number(input.flags) & Number(DataDescriptor.FLAG_ENCRYPTED_DATA)) !== 0);
      if (encryptedHere && !encrypted) warn('This request includes encrypted content. The readable contents are unavailable; the encrypted data and supplied metadata are shown.');
      if (input.encrypttoaddress) warn('This upload will be encrypted for the recipient shown. Review its readable content before adding it.');
      // Native PartialSignData uses datatype; its MMR leaves use type. Generic
      // objects can share either shape, so keep every original field visible and
      // label the interpretation separately. Never interpret ciphertext this way.
      const declaredDataType = input.datatype ?? input.type;
      if (!encryptedHere && TYPE_FIELDS[String(declaredDataType)] && typeof input.data === 'string' && isHex(input.data)) {
        visit(uploadData(Buffer.from(input.data, 'hex'), declaredDataType),
          'Decoded content', path.concat(key), false);
      }
      const keys = Object.keys(input).sort((a, b) => Number(CONTENT_KEYS.has(b)) - Number(CONTENT_KEYS.has(a)) || Number(METADATA.has(a)) - Number(METADATA.has(b)));
      if (!keys.length) add(key, path, 'Empty object', 'empty');
      keys.forEach(childKey => visit(input[childKey], childKey, path.concat(key), encryptedHere));
      return;
    }
    if (key === 'filename') warn('Only a file name was provided. The file contents are not included in this review.');
    if (key === 'url' || key === DataURLKey.vdxfid || (typeof input === 'string' && /^https?:\/\/\S+$/i.test(input))) warn('This content includes a link. The linked content has not been downloaded or reviewed.');
    if (key === 'datahash') warn('A content hash identifies data but does not reveal its contents. The referenced data is not included in this review.');
    const encoding = ['', 'messagehex', 'serializedhex', 'binarydata', 'objectdata', DataByteVectorKey.vdxfid].includes(key) ||
      (typeof input === 'string' && path.length === 0 && !isUpload && isHex(input)) ? 'hex' :
      ['messagebase64', 'serializedbase64'].includes(key) ? 'base64' : null;
    if (encoding && typeof input === 'string') {
      const valid = encoding === 'hex' ? isHex(input) : /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input);
      if (valid) { decodeBytes(Buffer.from(input, encoding), key, path, encrypted, input); return; }
      warn('Some encoded data could not be decoded. Its supplied value is shown unchanged.');
    }
    add(key, path, typeof input === 'boolean' ? (input ? 'Yes (true)' : 'No (false)') :
      input === '' ? 'Empty text' : formatText(String(input)), METADATA.has(key) ? 'metadata' : 'text');
  };

  visit(normalized, label, []);
  return {fields, warnings: [...warnings], rawText: typeof normalized === 'string' ? normalized : JSON.stringify(normalized, null, 2) ?? 'undefined'};
};

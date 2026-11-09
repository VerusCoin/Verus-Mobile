import {Buffer} from 'buffer';
import {
  BigNumber,
  CompactIAddressObject,
  DataByteVectorKey,
  DataDescriptor,
  DataDescriptorKey,
  DataStringKey,
  FqnVdxfUniValue,
  PartialMMRData,
  PartialSignData,
  VdxfUniValue,
} from 'verus-typescript-primitives';
import {buildContentReview} from '../../identityUpdate/contentReview';

const values = review => review.fields.map(field => field.value);
const text = review => values(review).join('\n');

it('puts the full upload message first without changing the native request or flags', () => {
  const message = 'Everything that will be associated with this profile.\n'.repeat(60);
  const upload = PartialSignData.fromCLIJson({message, prefixstring: 'Consent', createmmr: false});
  upload.flags = new BigNumber(0);
  const review = buildContentReview(upload, {isUpload: true});
  expect(review.fields[0]).toMatchObject({label: 'Message', value: message, kind: 'text'});
  expect(values(review)).toContain('No (false)');
  expect(text(review)).toContain('Consent');
  expect(upload.flags.toString()).toBe('0');
  expect(upload.data.toString()).toBe(message);
});

it('shows every nested MMR item and binary-only VDXF siblings when CLI JSON fails', () => {
  const upload = PartialSignData.fromCLIJson({mmrdata: [
    {message: 'First item'}, {vdxfdata: {[DataStringKey.vdxfid]: 'Second item'}},
  ]});
  const binary = new VdxfUniValue({values: [
    {[DataByteVectorKey.vdxfid]: Buffer.from([0, 255, 128])},
    {[DataStringKey.vdxfid]: 'Readable sibling'},
  ]});
  upload.data.data.push({type: new BigNumber(4), data: binary});
  const beforeFlags = upload.flags.toString();
  expect(() => upload.toCLIJson()).toThrow();
  const review = buildContentReview(upload, {isUpload: true});
  expect(text(review)).toContain('First item');
  expect(text(review)).toContain('Second item');
  expect(text(review)).toContain('Readable sibling');
  expect(values(review)).toContain('00ff80');
  expect(review.warnings.some(warning => warning.includes('binary'))).toBe(true);
  expect(upload.flags.toString()).toBe(beforeFlags);
});

it('decodes every message in native PartialSignData JSON MMR leaves while retaining their original type and bytes', () => {
  const upload = PartialSignData.fromCLIJson({mmrdata: [
    {message: 'First native JSON item'},
    {message: 'Second native JSON item'},
    {vdxfdata: {[DataStringKey.vdxfid]: 'Structured native JSON item'}},
  ]});
  const json = upload.toJson();
  const review = buildContentReview({partialsigndata: json});
  expect(values(review)).toEqual(expect.arrayContaining([
    'First native JSON item', 'Second native JSON item', 'Structured native JSON item',
  ]));
  for (const item of json.data.data.slice(0, 2)) {
    expect(values(review)).toContain(item.data);
    expect(review.fields.filter(field => field.label === 'type').map(field => field.value)).toContain(item.type);
  }
  expect(review.fields.find(field => field.value === 'First native JSON item').path).toContain('Decoded content');
  expect(json).toEqual(upload.toJson());
});

it('expands native and JSON partial sign data and retains exact numbers in JSON strings', () => {
  const message = '{"account":900719925474099312345,"nested":{"allowed":false,"count":0}}';
  const native = PartialSignData.fromCLIJson({message});
  const review = buildContentReview({partialsigndata: native.toJson()});
  expect(text(review)).toContain('900719925474099312345');
  expect(text(review)).toContain('"allowed": false');
  expect(review.fields.find(field => field.label === 'Message').value).toContain('\n');
  expect(review.rawText).toContain(native.data.toString('hex'));
});

it('recognizes partial sign data JSON inside an arbitrary content key', () => {
  const upload = PartialSignData.fromCLIJson({message: 'Read this nested upload'});
  const key = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
  const review = buildContentReview({[key]: upload.toJson()});
  expect(values(review)).toContain('Read this nested upload');
  expect(review.fields.find(field => field.label === 'Message').path).toContain(key);
});

it.each([
  {datatype: '3', data: '68696464656e20636f6e74656e74', message: 'Other supplied message'},
  {datatype: '5', data: '68696464656e20636f6e74656e74', messagehex: '4f74686572206279746573'},
])('retains each original field beside a separate typed-data interpretation: %j', payload => {
  const review = buildContentReview(payload);
  expect(values(review)).toContain(payload.data);
  expect(values(review)).toContain('hidden content');
  expect(values(review)).toContain(payload.message || payload.messagehex);
  expect(values(review)).toContain(payload.datatype);
  expect(review.fields.find(field => field.value === 'hidden content').path).toContain('Decoded content');
});

it('does not replace ordinary literal data fields based on a matching datatype shape', () => {
  const review = buildContentReview({datatype: 3, data: '6162'});
  expect(values(review)).toContain('6162');
  expect(values(review)).toContain('3');
  expect(review.fields.find(field => field.value === 'ab').path).toContain('Decoded content');
});

it('does not decode ciphertext with a datatype/data shape, including nested values', () => {
  const ciphertext = Buffer.from('This is still ciphertext').toString('hex');
  const review = buildContentReview({[DataDescriptorKey.vdxfid]: {
    flags: 1, datatype: 3, data: ciphertext,
    objectdata: {datatype: 3, data: ciphertext, message: 'Supplied metadata'},
  }});
  expect(values(review).filter(value => value === ciphertext)).toHaveLength(2);
  expect(values(review)).not.toContain('This is still ciphertext');
  expect(review.fields.some(field => field.path.includes('Decoded content'))).toBe(false);
  expect(values(review)).toContain('Supplied metadata');
});

it('keeps encrypted MMR-like type/data leaves opaque and preserves all supplied fields', () => {
  const ciphertext = Buffer.from('Encrypted MMR leaf').toString('hex');
  const review = buildContentReview({[DataDescriptorKey.vdxfid]: {
    flags: 1, objectdata: {data: [{type: '3', data: ciphertext, message: 'Supplied metadata'}]},
  }});
  expect(values(review)).toContain(ciphertext);
  expect(values(review)).toContain('3');
  expect(values(review)).toContain('Supplied metadata');
  expect(values(review)).not.toContain('Encrypted MMR leaf');
  expect(review.fields.some(field => field.path.includes('Decoded content'))).toBe(false);
});

it('keeps custom field names distinct without prettifying their spelling', () => {
  const review = buildContentReview({apiKey: 'first', api_key: 'second', 'api-key': 'third'});
  expect(review.fields.map(field => field.label)).toEqual(['apiKey', 'api_key', 'api-key']);
});

it('retains all fields, false, zero, null, empty values, duplicates, and unknown keys', () => {
  const review = buildContentReview({
    unfamiliar: {message: 'Primary', alternate: 'Also stored', count: 0, enabled: false,
      missing: null, empty: '', list: [], duplicate: ['Same', 'Same']},
  });
  expect(values(review)).toEqual(expect.arrayContaining(['Primary', 'Also stored', '0', 'No (false)', 'null', 'Empty text', 'Empty list']));
  expect(values(review).filter(value => value === 'Same')).toHaveLength(2);
  expect(review.fields.every(field => field.value !== '[object Object]')).toBe(true);
});

it.each(['messagehex', 'messagebase64'])('decodes valid UTF-8 %s and preserves original bytes', key => {
  const encoded = Buffer.from('Hello 👋\nAll content').toString(key === 'messagehex' ? 'hex' : 'base64');
  const review = buildContentReview({[key]: encoded});
  expect(review.fields[0]).toMatchObject({value: 'Hello 👋\nAll content', kind: 'text'});
  expect(review.fields[1]).toMatchObject({value: encoded, kind: 'encoded'});
});

it.each(['fffe', '610062'])('marks binary bytes as unreadable without lossy UTF-8 substitution: %s', encoded => {
  const review = buildContentReview({messagehex: encoded});
  expect(values(review)).toEqual([encoded]);
  expect(review.warnings).toHaveLength(1);
});

it('shows nested descriptor contents and metadata without hiding secondary fields', () => {
  const review = buildContentReview({[DataDescriptorKey.vdxfid]: {
    version: 1, flags: 0, label: 'Statement', mimetype: 'text/plain',
    objectdata: {message: 'Full readable statement', extra: 'Also disclosed'},
  }});
  expect(values(review)).toEqual(expect.arrayContaining(['Full readable statement', 'Also disclosed', 'Statement', 'text/plain']));
});

it('does not mistake encrypted bytes for readable plaintext', () => {
  const ciphertext = Buffer.from('Looks readable but is encrypted').toString('hex');
  const review = buildContentReview({[DataDescriptorKey.vdxfid]: {
    version: 1, flags: 1, objectdata: ciphertext,
  }});
  expect(values(review)).toContain(ciphertext);
  expect(text(review)).not.toContain('Looks readable');
  expect(review.warnings.join(' ')).toContain('encrypted content');
});

it('preserves native descriptor flags and bytes while expanding all fields', () => {
  const descriptor = new DataDescriptor({version: new BigNumber(1), label: 'All content',
    objectdata: Buffer.from('Readable descriptor bytes'), mimeType: 'text/plain'});
  descriptor.flags = new BigNumber(0);
  const before = Buffer.from(descriptor.objectdata);
  const review = buildContentReview({[DataDescriptorKey.vdxfid]: descriptor});
  expect(values(review)).toContain('Readable descriptor bytes');
  expect(descriptor.flags.toString()).toBe('0');
  expect(descriptor.objectdata).toEqual(before);
});

it('distinguishes readable content to encrypt from ciphertext already encrypted', () => {
  const recipient = 'zs1e0r2fuxpn6kymwa656trkwk8mpwzj03ucpw6kpvje5gjl6mgtjgdvafcgl54su2uclwgw6v24em';
  const upload = PartialSignData.fromCLIJson({message: 'Review this before encryption', encrypttoaddress: recipient});
  const review = buildContentReview(upload, {isUpload: true});
  expect(values(review)).toContain('Review this before encryption');
  expect(values(review)).toContain(recipient);
  expect(review.warnings.join(' ')).toContain('will be encrypted');
  expect(review.warnings.join(' ')).not.toContain('unavailable');
});

it('labels URL, hash, and filename references without fetching external data', () => {
  const fetchSpy = jest.spyOn(global, 'fetch');
  const review = buildContentReview({url: 'https://example.invalid/content', filename: '/local/file', datahash: 'ab'.repeat(32)});
  expect(review.warnings).toHaveLength(3);
  expect(values(review)).toContain('https://example.invalid/content');
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});

it.each([VdxfUniValue, FqnVdxfUniValue])('decodes complete serialized typed content (%p)', Type => {
  const source = Type.fromJson({[DataStringKey.vdxfid]: 'Text inside serialized content'});
  const raw = source.toBuffer().toString('hex');
  const review = buildContentReview(raw);
  expect(values(review)).toContain('Text inside serialized content');
  expect(values(review)).toContain(raw);
});

it('retains FQN key names and gives native address keys their readable labels', () => {
  const native = FqnVdxfUniValue.fromJson({[DataStringKey.vdxfid]: 'Typed text'});
  expect(buildContentReview(native).fields[0].label).toBe('string');
  const fqn = CompactIAddressObject.fromFQN('vrsc::data.type.string', 'VRSC');
  const named = new FqnVdxfUniValue();
  named._kvValues.set(fqn, 'Named content');
  expect(buildContentReview(named).rawText).toContain(fqn.address);
});

it('makes literal controls and bidirectional formatting visible without changing the supplied text', () => {
  const message = 'profile\u0000association\u202eprivate';
  const review = buildContentReview({message});
  expect(values(review)).toContain('profile\\u0000association\\u202eprivate');
  expect(review.warnings.join(' ')).toContain('invisible control characters');
  expect(JSON.parse(review.rawText).message).toBe(message);
});

it('retains prior MMR fields that cannot be represented by CLI JSON', () => {
  const mmr = PartialMMRData.fromCLIJson({mmrdata: [{message: 'Keep this'}]});
  mmr.priormmr = [Buffer.from('ab'.repeat(32), 'hex')];
  const review = buildContentReview(mmr);
  expect(values(review)).toContain('Keep this');
  expect(values(review)).toContain('ab'.repeat(32));
});

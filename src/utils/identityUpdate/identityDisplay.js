import {Buffer} from 'buffer';
import {ContentMultiMap} from 'verus-typescript-primitives';

/** Display only. Never use this representation to rebuild an identity/request. */
export const identityToDisplayJson = identity => {
  // Convert scalar fields independently from binary content. Native VDXF values
  // without a daemon JSON representation remain visible as their exact hex.
  const scalarView = Object.assign(
    Object.create(Object.getPrototypeOf(identity)),
    identity,
  );
  scalarView.contentMultiMap = ContentMultiMap.fromJson({});
  const display = scalarView.toJson();
  if (identity.containsContentMultiMap?.() && display.contentmultimap != null) {
    const content = {};
    for (const [key, values] of identity.contentMultiMap.kvContent.entries()) {
      content[key.toIAddress()] = values.map(value => {
        if (Buffer.isBuffer(value)) return value.toString('hex');
        try {
          return value.toJson();
        } catch (_) {
          return value.toBuffer().toString('hex');
        }
      });
    }
    display.contentmultimap = content;
  }
  return display;
};

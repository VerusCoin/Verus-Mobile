import { normalize, schema } from 'normalizr';

const identities = new schema.Entity('identities');
const claimCategory = new schema.Entity('claimCategories');
const claims = new schema.Entity('claims', {}, { idAttribute: 'uid' });
const attestations = new schema.Entity('attestations');

export const normalizeIdentities = (identityData) => normalize(identityData, [identities]);
export const normalizeCategories = (categoryData) => normalize(categoryData, [claimCategory]);
export const normalizeClaims = (claimsData) => normalize(claimsData, [claims]);
export const normalizeAttestations = (attestationData) => normalize(attestationData, [attestations]);

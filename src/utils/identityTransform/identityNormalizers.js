import { normalize, schema } from 'normalizr';

const identities = new schema.Entity('identities', { idAttribute: 'name' });
const claimCategory = new schema.Entity('claimCategories', { idAttribute: 'id' });
const claims = new schema.Entity('claims', { idAttribute: 'id' });
const attestations = new schema.Entity('attestations', { idAttribute: 'id' });

export const normalizedIdentities = (identityData) => normalize(identityData, [identities]);
export const normalizedCategories = (categoryData) => normalize(categoryData, [claimCategory]);
export const normalizedClaims = (claimsData) => normalize(claimsData, [claims]);
export const normalizedAttestations = (attestationData) => normalize(attestationData, [attestations]);
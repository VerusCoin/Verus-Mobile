import { normalize, schema } from 'normalizr';

const identities = new schema.Entity('identities');
const claimCategory = new schema.Entity('claimCategories');
const claims = new schema.Entity('claims');
const attestations = new schema.Entity('attestations');

export const normalizedIdentities = (identityData) => normalize(identityData, [identities]);
export const normalizedCategories = (categoryData) => normalize(categoryData, [claimCategory]);
export const normalizedClaims = (claimsData) => normalize(claimsData, [claims]);
export const normalizedAttestations = (attestationData) => normalize(attestationData, [attestations]);
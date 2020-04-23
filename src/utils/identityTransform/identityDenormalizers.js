import { denormalize, schema } from 'normalizr';

const attestation = new schema.Entity('attestations');
const attestationSchema = { attestations: [attestation] };

const claim = new schema.Entity('claims');
const claimSchema = { claims: [claim] };

const claimCategory = new schema.Entity('claimCategories');
const claimCategorySchema = { claimCategories: [claimCategory] };

const identity = new schema.Entity('identities');
const identitySchema = { identities: [identity] };

export const denormalizeIdentities = (entities) => denormalize(
  { identities: entities.identityIds },
  identitySchema,
  { identities: entities.byId },
);

export const denormalizeAttestations = (entities) => denormalize(
  { attestations: entities.attestationIds },
  attestationSchema,
  { attestations: entities.byId },
);

export const denormalizeClaims = (entities) => denormalize({ claims: entities.claimIds }, claimSchema, entities);

export const denormalizeClaimCategories = (entities) => denormalize(
  { claimCategories: entities.claimCategoriesIds },
  claimCategorySchema,
  { claimCategories: entities.byId },
);

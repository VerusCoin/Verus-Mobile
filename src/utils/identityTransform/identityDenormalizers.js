import { denormalize, schema } from "normalizr";

const attestation = new schema.Entity("attestations");
const attestationSchema = { attestations: [attestation] };

const claim = new schema.Entity("claims");
const claimSchema = { claims: [claim] };

const claimCategory = new schema.Entity("claimCategories");
const claimCategorySchema = { claimCategories: [claimCategory] };

const identity = new schema.Entity("identities");
const identitySchema = { identities: [identity] };

export const denormalizedIdentities = (entities) => denormalize(
  { identities: entities.identityIds },
  identitySchema,
  { identities: entities.byId },
);

export const denormalizedAttestations = (entities) => denormalize(
  { attestations: entities.attestationIds },
  attestationSchema,
  { atestations: entities.byId }
);

export const denormalizedClaims = (entities) => denormalize({ claims: entities.claimIds }, claimSchema, entities);

export const denormalizedClaimCategories = (entities) => denormalize(
  { claimCategories: entities.claimCategoriesIds },
  claimCategorySchema,
  entities
);

import { 
  AUTHENTICATION_REQUEST_VDXF_KEY, 
  IDENTITY_UPDATE_REQUEST_VDXF_KEY, 
  PROVISION_IDENTITY_DETAILS_VDXF_KEY,
  VERUSPAY_INVOICE_DETAILS_VDXF_KEY, 
  APP_ENCRYPTION_REQUEST_VDXF_KEY, 
  DATA_PACKET_REQUEST_VDXF_KEY, 
  USER_DATA_REQUEST_VDXF_KEY 
} from "verus-typescript-primitives";

// ============================================================================
// SHORTHAND IDENTIFIERS
// Add new request type shorthands here for use in the constraint tables below
// ============================================================================
const AUTH = AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid;
const IDENTITY_UPDATE = IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid;
const PROVISION_IDENTITY = PROVISION_IDENTITY_DETAILS_VDXF_KEY.vdxfid;
const VERUSPAY = VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid;
const APP_ENCRYPTION = APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid;
const DATA_PACKET = DATA_PACKET_REQUEST_VDXF_KEY.vdxfid;
const USER_DATA = USER_DATA_REQUEST_VDXF_KEY.vdxfid;

// ============================================================================
// REQUEST TYPE CONSTRAINTS
// Configure per-type rules:
//   - maxCount: Maximum occurrences allowed (default: Infinity)
//   - mustBeAlone: If true, cannot appear with any other request type
//   - allowedCompanions: If set, only these types may appear alongside this type
//                        (overrides mustBeAlone when the companion is allowed)
// ============================================================================
const requestTypeConstraints = {
  [AUTH]:            { maxCount: 1, mustBeAlone: false, allowedCompanions: [DATA_PACKET, IDENTITY_UPDATE, USER_DATA, APP_ENCRYPTION, PROVISION_IDENTITY] },
  [IDENTITY_UPDATE]: { maxCount: 1, mustBeAlone: false },
  [PROVISION_IDENTITY]: { maxCount: 1, mustBeAlone: false },
  [VERUSPAY]:        { maxCount: 5, mustBeAlone: false },
  [APP_ENCRYPTION]:  { maxCount: 1, mustBeAlone: false },
  [DATA_PACKET]:     { maxCount: 1, mustBeAlone: false },
  [USER_DATA]:       { maxCount: 1, mustBeAlone: false },
};

// ============================================================================
// MUTUALLY EXCLUSIVE GROUPS
// Each array defines types that cannot appear together in the same request.
// If more than one type from Any group is present, validation fails.
// ============================================================================
const mutuallyExclusiveGroups = [
  [DATA_PACKET, USER_DATA],
  // Add more exclusion groups as needed, e.g.:
  // [TYPE_A, TYPE_B, TYPE_C], // Only one of these three can be present
];

// ============================================================================
// VALIDATION FUNCTION
// ============================================================================

/**
 * Validates that the details array conforms to allowed grouping rules.
 * Call this before iterating through details for individual validation.
 * 
 * @param {Array} details - Array of detail objects from the GenericRequest
 * @throws {Error} If the grouping violates any constraint
 */
export const validateGenericRequestGroupings = (details) => {
  if (!details || details.length === 0) {
    return; // Empty details array is valid (or add a rule if it shouldn't be)
  }

  // Count occurrences of each type
  const typeCounts = {};
  
  for (const detail of details) {
    const key = detail.getIAddressKey();
    typeCounts[key] = (typeCounts[key] || 0) + 1;
  }
  
  const presentTypes = Object.keys(typeCounts);

  // Rule 1: Check max count constraints
  for (const [type, count] of Object.entries(typeCounts)) {
    const constraint = requestTypeConstraints[type];
    if (constraint && constraint.maxCount != null && count > constraint.maxCount) {
      throw new Error(
        `Request type ${type} can appear at most ${constraint.maxCount} time(s), but found ${count}`
      );
    }
  }

  // Rule 2: Check mustBeAlone constraints (with allowedCompanions override)
  for (const type of presentTypes) {
    const constraint = requestTypeConstraints[type];
    if (constraint && constraint.mustBeAlone && presentTypes.length > 1) {
      throw new Error(
        `Request type ${type} must be the only type in the request, but found ${presentTypes.length} types`
      );
    }
    // If allowedCompanions is defined, only those companions may appear alongside this type
    if (constraint && constraint.allowedCompanions && presentTypes.length > 1) {
      const otherTypes = presentTypes.filter(t => t !== type);
      const disallowed = otherTypes.filter(t => !constraint.allowedCompanions.includes(t));
      if (disallowed.length > 0) {
        throw new Error(
          `Request type ${type} can only appear with ${constraint.allowedCompanions.join(', ')}, ` +
          `but found disallowed types: ${disallowed.join(', ')}`
        );
      }
    }
  }

  // Rule 3: Check mutually exclusive groups
  for (const exclusiveGroup of mutuallyExclusiveGroups) {
    const presentInGroup = exclusiveGroup.filter(type => presentTypes.includes(type));
    if (presentInGroup.length > 1) {
      throw new Error(
        `Request types cannot appear together: ${presentInGroup.join(', ')}`
      );
    }
  }

};

// ============================================================================
// EXPORTS
// Export configuration for external access/testing if needed
// ============================================================================
export { 
  requestTypeConstraints, 
  mutuallyExclusiveGroups, 
  // Export shorthands for use in tests or external configuration
  AUTH,
  IDENTITY_UPDATE,
  VERUSPAY,
  APP_ENCRYPTION,
  DATA_PACKET,
  USER_DATA,
};

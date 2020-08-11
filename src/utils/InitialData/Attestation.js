const generateAttestations = (identityId) => [
  {
    id: `${identityId}-birthCertificate-birthDate`,
    identityAttested: 'The Department of Health@',
    contentRootKey: '',
    sigKey: '',
    showOnHomeScreen: false,
    claimId: `${identityId}-birthDate`,
    claimName: 'Birth date',
  },
  {
    id: `${identityId}-birthCertificate-firstName`,
    identityAttested: 'The Department of Health@',
    contentRootKey: '',
    sigKey: '',
    showOnHomeScreen: false,
    claimId: `${identityId}-firstName`,
    claimName: 'First name',
  },
  {
    id: `${identityId}-birthCertificate-lastName`,
    identityAttested: 'The Department of Health@',
    contentRootKey: '',
    sigKey: '',
    showOnHomeScreen: false,
    claimId: `${identityId}-lastName`,
    claimName: 'Last name',
  },
  {
    id: `${identityId}-driversLicence-lastName`,
    identityAttested: 'Washington State Gov@',
    contentRootKey: '',
    sigKey: '',
    showOnHomeScreen: false,
    claimId: `${identityId}-lastName`,
    claimName: 'Last name',
  },
];

export default generateAttestations;

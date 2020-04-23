const claimCategories = (identityId) => ([
  {
    id: `${identityId}-healthCare`,
    name: 'Healthcare',
    desc: '',
    identity: identityId,
    claims: ['bloodType', 'healthConditions'],
  },
  {
    id: `${identityId}-personalInformation`,
    name: 'Personal Information',
    desc: '',
    identity: identityId,
    claims: ['firstName', 'lastName', 'birthDate'],
  },
  {
    id: `${identityId}-finance`,
    name: 'Finance',
    desc: '',
    identity: identityId,
    claims: [],
  },
  {
    id: `${identityId}-education`,
    name: 'Education',
    desc: '',
    identity: identityId,
    claims: ['university'],
  },
  {
    id: `${identityId}-housing`,
    name: 'Housing',
    desc: '',
    identity: identityId,
    claims: ['address'],
  },
  {
    id: `${identityId}-family`,
    name: 'Family',
    desc: '',
    identity: identityId,
    claims: [],
  },
]);

export default claimCategories;

const generateClaimCategories = (identityId) => ([
  {
    id: `${identityId}-healthCare`,
    name: 'Healthcare',
    desc: '',
    identity: identityId,
  },
  {
    id: `${identityId}-personalInformation`,
    name: 'Personal Information',
    desc: '',
    identity: identityId,
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
  },
  {
    id: `${identityId}-housing`,
    name: 'Housing',
    desc: '',
    identity: identityId,
  },
  {
    id: `${identityId}-family`,
    name: 'Family',
    desc: '',
    identity: identityId,
  },
]);

export default generateClaimCategories;

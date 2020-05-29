const generateClaimCategories = (identityId) => ([
  {
    uid: `${identityId}-other`,
    id: `${identityId}-other`,
    name: 'other',
    displayName: 'Other',
    desc: '',
    identity: identityId,
  },
  {
    uid:`${identityId}-personal-information`,
    id: `${identityId}-personal-information`,
    displayName: 'Personal Information',
    name: 'personal-information',
    desc: '',
    identity: identityId,
  },
  {
    uid: `${identityId}-health`,
    id: `${identityId}-health`,
    displayName: 'Health',
    name: 'health',
    desc: '',
    identity: identityId,
  },
]);

export default generateClaimCategories;

const claimCategories = (identityId) => ([
  {
    id: `${identityId}-healthCare`,
    name: "Healthcare",
    desc: "",
    identity: identityId,
    claims: ["firstName", "lastName", "bloodType", "healthConditions", "birthDate"],
  },
  {
    id: `${identityId}-personalInformation`,
    name: "Personal Information",
    desc: "",
    identity: identityId,
    claims: ["firstName", "lastName", "bloodType", "healthConditions", "birthDate"],
  },
  {
    id: `${identityId}-finance`,
    name: "Finance",
    desc: "",
    identity: identityId,
    claims: ["firstName", "lastName", "bankAccount"],
  },
  {
    id: `${identityId}-education`,
    name: "Education",
    desc: "",
    identity: identityId,
    claims: ["firstName", "lastName", "university"],
  },
  {
    id: `${identityId}-housing`,
    name: "Housing",
    desc: "",
    identity: identityId,
    claims: ["firstName", "lastName", "address"],
  },
  {
    id: `${identityId}-family`,
    name: "Family",
    desc: "",
    identity: identityId,
    claims: ["firstName", "lastName"],
  }
]);

export default claimCategories;

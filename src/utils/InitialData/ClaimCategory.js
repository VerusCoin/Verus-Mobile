const claimCategories = (identityId) => ([
  {
    id: "healthCare",
    name: "Healthcare",
    desc: "",
    identity: identityId,
    claims: ["firstName", "lastName", "bloodType", "healthConditions", "birthDate"],
  },
  {
    id: "personalInformation",
    name: "Personal Information",
    desc: "",
    identity: identityId,
    claims: ["firstName", "lastName", "bloodType", "healthConditions", "birthDate"],
  },
  {
    id: "finance",
    name: "Finance",
    desc: "",
    identity: identityId,
    claims: ["firstName", "lastName", "bankAccount"],
  },
  {
    id: "education",
    name: "Education",
    desc: "",
    identity: identityId,
    claims: ["firstName", "lastName", "university"],
  },
  {
    id: "housing",
    name: "Housing",
    desc: "",
    identity: identityId,
    claims: ["firstName", "lastName", "address"],
  },
  {
    id: "family",
    name: "Family",
    desc: "",
    identity: identityId,
    claims: ["firstName", "lastName"],
  }
]);

export default claimCategories;

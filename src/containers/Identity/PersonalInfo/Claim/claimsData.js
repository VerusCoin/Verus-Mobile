
export default [{
    id: 1,
    name: 'COVID-19',
    claimCategoryId: 2,
    parentClaims: [1, 2],
    childClaims: [],
}, {
    id: 2,
    name: 'Blood Type',
    claimCategoryId: 2,
    parentClaims: [],
    childClaims: [3, 4, 5],
}, {
    id: 3,
    name: 'Health Conditions',
    claimCategoryId: 2,
    parentClaims: [1, 2],
    childClaims: [],

}, {
    id: 4,
    name: 'Lorem Ipsum',
    claimCategoryId: 1,
    parentClaims: [1, 2],
    childClaims: [],
}, {
    id: 5,
    name: 'Lorem Ipsum',
    claimCategoryId: 1,
    parentClaims: [1, 2],
    childClaims: [],

}, {
    id: 6,
    name: 'Lorem Ipsum',
    claimCategoryId: 1,
    parentClaims: [],
    childClaims: [5, 4],
}
];

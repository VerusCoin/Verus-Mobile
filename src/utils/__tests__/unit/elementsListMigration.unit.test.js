jest.mock('react-native-vector-icons/lib/create-icon-set', () => () => 'Icon');
jest.mock('../../delayedAlert', () => jest.fn());
// The connected modal children are outside these list/navigation interactions.
jest.mock('../../../containers/Identity/Home/AttestationDetails', () => () => null);
jest.mock('../../../containers/Identity/PersonalInfo/RequestAttestation', () => () => null);
jest.mock('../../../components/Modal', () => require('react-native').Modal);

const React = require('react');
const {act, create} = require('react-test-renderer');
const {TextInput, TouchableHighlight, TouchableOpacity} = require('react-native');
const {fromJS, List, Map} = require('immutable');
const PersonalInfo = require('../../../containers/Identity/PersonalInfo/View').default;
const ClaimCategoryDetails = require('../../../containers/Identity/PersonalInfo/ClaimCategoryDetails/View').default;
const ClaimDetails = require('../../../containers/Identity/PersonalInfo/ClaimDetails/View').default;
const MoveIntoCategory = require('../../../containers/Identity/PersonalInfo/ClaimManager/MoveIntoCategory/View').default;
const RequestAttestation = require('../../../containers/Identity/PersonalInfo/RequestAttestation/View').default;

const textContent = node => typeof node === 'string' || typeof node === 'number'
  ? String(node)
  : (node.children || []).map(textContent).join('');

describe('identity lists with Elements 3', () => {
  let renderer;

  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
    renderer = undefined;
    jest.clearAllMocks();
  });

  const pressRow = label => {
    const row = renderer.root.findAllByType(TouchableHighlight)
      .find(node => textContent(node).includes(label));
    expect(row).toBeDefined();
    act(() => row.props.onPress());
  };

  it('renders category names and claim counts, and selects the category', () => {
    const categories = fromJS({travel: {id: 'travel', name: 'travel', displayName: 'Travel'}});
    const navigate = jest.fn();
    const setActiveClaimCategory = jest.fn();
    const toggleShowHiddenClaims = jest.fn();
    act(() => {
      renderer = create(<PersonalInfo
        claimCategories={categories}
        claims={Map()}
        claimsCountByCategory={[{categoryId: 'travel', count: 3}]}
        activeCategory={categories.get('travel')}
        showEmptyClaimCategories
        emptyCategoryCount={0}
        navigation={{navigate}}
        sortCategoriesBy="asc"
        actions={{setActiveClaimCategory, toggleShowHiddenClaims}}
      />);
    });
    const row = renderer.root.findAllByType(TouchableHighlight)
      .find(node => textContent(node).includes('Travel'));
    expect(textContent(row)).toContain('3');
    pressRow('Travel');
    expect(setActiveClaimCategory).toHaveBeenCalledWith('travel');
    expect(toggleShowHiddenClaims).toHaveBeenCalledWith(false);
    expect(navigate).toHaveBeenCalledWith('ClaimCategory', {claimCategoryName: 'Travel'});
  });

  it('keeps claim labels, attestation counts, search and claim navigation', () => {
    const claims = fromJS({passport: {uid: 'passport', id: 'passport-id', displayName: 'Passport'}});
    const navigate = jest.fn();
    const setActiveClaim = jest.fn();
    act(() => {
      renderer = create(<ClaimCategoryDetails
        claimsData={claims}
        navigation={{navigate}}
        showHiddenClaims={false}
        hiddenClaimsCount={0}
        attestationsCountByClaim={List([{claimId: 'passport-id', count: 2}])}
        sortClaimsBy="asc"
        actions={{setActiveClaim}}
      />);
    });
    const row = renderer.root.findAllByType(TouchableHighlight)
      .find(node => textContent(node).includes('Passport'));
    expect(textContent(row)).toContain('2');
    act(() => renderer.root.findByType(TextInput).props.onChangeText('missing'));
    expect(renderer.root.findAllByType(TouchableHighlight)
      .some(node => textContent(node).includes('Passport'))).toBe(false);
    act(() => renderer.root.findByType(TextInput).props.onChangeText('pass'));
    pressRow('Passport');
    expect(setActiveClaim).toHaveBeenCalledWith(claims.get('passport'));
    expect(navigate).toHaveBeenCalledWith('ClaimDetails', {claimUid: 'passport'});
  });

  it('opens the selected attestation from its rendered identity label', () => {
    const setActiveAttestationId = jest.fn();
    const setAttestationModalVisibility = jest.fn();
    act(() => {
      renderer = create(<ClaimDetails
        route={{params: {claimUid: 'passport'}}}
        navigation={{push: jest.fn()}}
        claims={fromJS({passport: {displayName: 'Passport', data: 'Test claim'}})}
        attestationsData={fromJS({attestation: {uid: 'attestation', identityAttested: 'alice@'}})}
        childClaims={Map()}
        parentClaims={Map()}
        attestationModalVisibility={false}
        actions={{setActiveAttestationId, setAttestationModalVisibility}}
      />);
    });
    pressRow('alice@');
    expect(setActiveAttestationId).toHaveBeenCalledWith('attestation');
    expect(setAttestationModalVisibility).toHaveBeenCalledWith(true);
  });

  it('moves claims into the category selected by its visible name', () => {
    const categories = fromJS({travel: {id: 'travel', displayName: 'Travel'}});
    const moveClaimsToCategory = jest.fn();
    const goBack = jest.fn();
    act(() => {
      renderer = create(<MoveIntoCategory
        categories={categories}
        navigation={{goBack}}
        actions={{moveClaimsToCategory}}
      />);
    });
    pressRow('Travel');
    expect(moveClaimsToCategory).toHaveBeenCalledWith(categories.get('travel'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('selects a listed identity and opens the request confirmation', () => {
    act(() => {
      renderer = create(<RequestAttestation
        visible
        selectedClaim={Map({id: 'passport'})}
        availableIdentities={fromJS({alice: {id: 'alice', name: 'alice@'}})}
        setRequestAttestationModalShown={jest.fn()}
      />);
    });
    const identity = renderer.root.findAllByType(TouchableOpacity)
      .find(node => textContent(node).includes('alice@'));
    expect(identity).toBeDefined();
    act(() => identity.props.onPress());
    expect(textContent(renderer.root)).toContain('Are you sure you want to send request to');
    expect(renderer.root.findAllByType(TouchableOpacity)
      .some(node => textContent(node) === 'Yes')).toBe(true);
  });
});

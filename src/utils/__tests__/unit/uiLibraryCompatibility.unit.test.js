jest.mock('react-native-vector-icons/lib/create-icon-set', () => () => 'Icon');

const React = require('react');
const {act, create} = require('react-test-renderer');
const {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} = require('react-native');
// Import the whole public entry point: Elements also eagerly loads Ratings.
const Elements = require('react-native-elements');
const PasswordInput = require('../../../components/PasswordInput').default;
const StandardButton = require('../../../components/StandardButton').default;
const AddCategoryDialog = require('../../../containers/Identity/PersonalInfo/CategoryDialogs/AddCategory').default;
const DeleteCategoryDialog = require('../../../containers/Identity/PersonalInfo/CategoryDialogs/DeleteCategory').default;
const RequestDialog = require('../../../containers/Identity/PersonalInfo/RequestAttestation/RequestDialog').default;
const {Map} = require('immutable');

describe('upgraded UI libraries on React Native 0.77', () => {
  let renderer;

  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
    renderer = undefined;
    jest.restoreAllMocks();
  });

  it('loads the Elements entry point and renders interactive controls without built-in propTypes', () => {
    expect(Text.propTypes).toBeUndefined();
    expect(TextInput.propTypes).toBeUndefined();
    expect(Image.propTypes).toBeUndefined();

    const onPress = jest.fn();
    const onChangeText = jest.fn();
    act(() => {
      renderer = create(<View>
        <StandardButton title="Continue" TouchableComponent={TouchableOpacity} onPress={onPress} />
        <PasswordInput value="wallet" onChangeText={onChangeText} errorMessage="Check your password" />
      </View>);
    });

    act(() => renderer.root.findByType(TouchableOpacity).props.onPress());
    act(() => renderer.root.findByType(TextInput).props.onChangeText('updated wallet'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onChangeText).toHaveBeenCalledWith('updated wallet');
    expect(renderer.root.findByType(TextInput).props.value).toBe('wallet');
    expect(renderer.root.findByType(TextInput).props.secureTextEntry).toBe(true);
    expect(renderer.root.findAllByType(Text).some(node => node.props.children === 'Check your password')).toBe(true);
    expect(Elements.Rating).toBeDefined();
    expect(Elements.Avatar).toBeDefined();
  });

  it('keeps category dialog text entry, save and cancel actions working', () => {
    const onChangeText = jest.fn();
    const onSave = jest.fn();
    const onCancel = jest.fn();
    act(() => {
      renderer = create(<AddCategoryDialog
        addCategoryDialogShown
        handleOnChangeText={onChangeText}
        handleSaveCategory={onSave}
        closeAddCategoryDialog={onCancel}
      />);
    });

    act(() => renderer.root.findByType(TextInput).props.onChangeText('Travel'));
    const buttons = renderer.root.findAllByType(TouchableOpacity);
    const button = label => buttons.find(node => node.findAllByType(Text)
      .some(text => text.props.children === label));
    act(() => button('Save').props.onPress());
    act(() => button('Cancel').props.onPress());
    expect(onChangeText).toHaveBeenCalledWith('Travel');
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it.each(['delete', 'request'])('preserves %s confirmation and cancellation actions', kind => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const category = Map({id: 'travel', displayName: 'Travel'});
    act(() => {
      renderer = create(kind === 'delete' ? <DeleteCategoryDialog
        deleteCategoryDialogShown
        selectedCategory={category}
        handleDeleteCategory={onConfirm}
        closeDeleteCategoryDialog={onCancel}
      /> : <RequestDialog
        dialogShown
        selectedIdentity="alice@"
        requestAttestation={onConfirm}
        closeRequestDialog={onCancel}
      />);
    });
    const button = label => renderer.root.findAllByType(TouchableOpacity)
      .find(node => node.findAllByType(Text).some(text => text.props.children === label));
    act(() => button('Yes').props.onPress());
    act(() => button('No').props.onPress());
    if (kind === 'delete') expect(onConfirm).toHaveBeenCalledWith(category);
    else expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

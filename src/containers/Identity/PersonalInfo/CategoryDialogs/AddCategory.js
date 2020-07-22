import React from 'react';
import Dialog from 'react-native-dialog';

const AddCategoryDialog = (props) => {
  const {
    addCategoryDialogShown,
    handleOnChangeText,
    closeAddCategoryDialog,
    handleSaveCategory,
  } = props;

  return (
    <Dialog.Container visible={addCategoryDialogShown}>
      <Dialog.Title>Add category</Dialog.Title>
      <Dialog.Description>
        Please enter the name of Claim Category that you want add.
      </Dialog.Description>
      <Dialog.Input onChangeText={(text) => handleOnChangeText(text)} />
      <Dialog.Button label="Cancel" onPress={closeAddCategoryDialog} />
      <Dialog.Button label="Save" onPress={handleSaveCategory} />
    </Dialog.Container>
  );
};

export default AddCategoryDialog;

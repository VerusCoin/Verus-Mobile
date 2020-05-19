import React from 'react';
import { Text } from 'react-native';
import Dialog from 'react-native-dialog';

const DeleteCategoryDialog = (props) => {
  const {
    deleteCategoryDialogShown,
    closeDeleteCategoryDialog,
    handleDeleteCategory,
    selectedCategory,
  } = props;

  if (!deleteCategoryDialogShown) return null;

  return (
    <Dialog.Container visible={deleteCategoryDialogShown}>
      <Dialog.Title>Delete category</Dialog.Title>
      <Dialog.Description>
        Do you really want to delete
        {' '}
        {selectedCategory.get('displayName', '')}
      </Dialog.Description>
      <Dialog.Button label="No" onPress={closeDeleteCategoryDialog} />
      <Dialog.Button label="Yes" onPress={() => handleDeleteCategory(selectedCategory)} />
    </Dialog.Container>
  );
};

export default DeleteCategoryDialog;

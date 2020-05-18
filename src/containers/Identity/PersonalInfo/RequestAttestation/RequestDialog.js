import React from 'react';
import Dialog from 'react-native-dialog';

const RequestDialog = (props) => {
  const {
    dialogShown,
    closeRequestDialog,
    requestAttestation,
    selectedIdentity,
  } = props;

  if (!dialogShown) return null;
  return (
    <Dialog.Container visible={dialogShown}>
      <Dialog.Title>
        Are you sure you want to send request to
        &nbsp;
        {selectedIdentity}
      </Dialog.Title>
      <Dialog.Button label="No" onPress={closeRequestDialog} />
      <Dialog.Button label="Yes" onPress={requestAttestation} />
    </Dialog.Container>
  );
};

export default RequestDialog;

import * as React from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';

const AlertModal = (props) => {
  const {
    visible,
    title,
    description,
    cancel,
    buttons,
    disabled,
    cancelable,
  } = props;

  return visible ? (
    <Portal>
      <Dialog
        dismissable={(!disabled && cancelable) === true}
        visible={visible}
        onDismiss={cancelable ? cancel : () => {}}
      >
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>{description}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          {buttons != null
            ? buttons.map((button) => {
                return (
                  <Button
                    disabled={button.disabled || disabled}
                    onPress={button.onPress}
                  >
                    {button.text}
                  </Button>
                );
              })
            : null}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  ) : null;
};

export default AlertModal;
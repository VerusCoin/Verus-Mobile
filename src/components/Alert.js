import * as React from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { connect } from 'react-redux';
import Colors from '../globals/colors';

const AlertModal = (props) => {
  const [modalShown, setModalShown] = React.useState(false);
  const [modalToBeShown, setModalToBeShown] = React.useState(false)
  const visible = props.activeAlert != null;

  if (visible && !modalToBeShown) {
    setModalToBeShown(true)

    setTimeout(() => setModalShown(true), 100)
  } else if (!visible && modalToBeShown) {
    setModalToBeShown(false)
    setModalShown(false)

    return null
  } else if (!visible) return null

  const title = props.activeAlert.title;
  const description = props.activeAlert.message;
  const buttons = props.activeAlert.buttons;
  const cancelable =
    props.activeAlert.options != null && props.activeAlert.cancelable;
  const disabled =
    props.activeAlert.options != null && props.activeAlert.disabled;

  return (
    <Portal>
      <Dialog
        dismissable={(!disabled && cancelable) === true}
        visible={modalShown}
        onDismiss={cancelable ? cancel : () => {}}
        style={{maxHeight: "100%", marginBottom: 36}}
      >
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content style={{maxHeight: "80%"}}>
          <ScrollView>
            <Text>{description}</Text>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          {buttons != null
            ? buttons.map((button, index) => {
                return (
                  <Button
                    disabled={button.disabled || disabled}
                    onPress={button.onPress}
                    color={Colors.primaryColor}
                    key={index}
                  >
                    {button.text}
                  </Button>
                );
              })
            : null}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const mapStateToProps = (state) => {
  return {
    activeAlert: state.alert.active
  }
};

export default connect(mapStateToProps)(AlertModal);
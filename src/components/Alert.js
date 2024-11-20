import * as React from 'react';
import { SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { connect } from 'react-redux';
import Colors from '../globals/colors';

const AlertModal = (props) => {
  const [modalShown, setModalShown] = React.useState(false);
  const [modalToBeShown, setModalToBeShown] = React.useState(false);
  const visible = props.activeAlert != null;

  if (visible && !modalToBeShown) {
    setModalToBeShown(true);
    setTimeout(() => setModalShown(true), 100);
  } else if (!visible && modalToBeShown) {
    setModalToBeShown(false);
    setModalShown(false);
    return null;
  } else if (!visible) return null;

  const { height } = Dimensions.get('window');
  const dialogContentMaxHeight = height * 0.6; // Adjust this value as needed

  const title = props.activeAlert.title;
  const description = props.activeAlert.message;
  const buttons = props.activeAlert.buttons;
  const cancelable = props.activeAlert.options != null && props.activeAlert.cancelable;
  const disabled = props.activeAlert.options != null && props.activeAlert.disabled;

  return (
    <Portal>
      <SafeAreaView style={{ flex: 1 }}>
        <Dialog
          dismissable={(!disabled && cancelable) === true}
          visible={modalShown}
          onDismiss={cancelable ? cancel : () => { }}
          style={{ maxHeight: '100%', marginBottom: 36 }}
        >
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Content style={{ maxHeight: dialogContentMaxHeight }}>
            <ScrollView>
              <Text>{description}</Text>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <ScrollView horizontal style={{ height: 48 }}>
              {buttons != null
                ? buttons.map((button, index) => (
                  <Button
                    disabled={button.disabled || disabled}
                    onPress={button.onPress}
                    textColor={Colors.primaryColor}
                    key={index}
                  >
                    {button.text}
                  </Button>
                ))
                : null}
            </ScrollView>
          </Dialog.Actions>
        </Dialog>
      </SafeAreaView>
    </Portal>
  );
};

const mapStateToProps = (state) => {
  return {
    activeAlert: state.alert.active,
  };
};

export default connect(mapStateToProps)(AlertModal);
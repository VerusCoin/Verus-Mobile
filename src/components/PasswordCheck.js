import * as React from 'react';
import { Button, Dialog, Portal } from 'react-native-paper';
import { checkPinForUser } from '../utils/asyncStore/asyncStore';
import PasswordInput from './PasswordInput';

const PasswordCheck = (props) => {
  const { visible, title, submit, cancel, userName } = props
  const [password, setPassword] = React.useState("");
  const [freeze, setFreeze] = React.useState(false);

  const validatePassword = async () => {
    setFreeze(true)

    try {
      await checkPinForUser(password, userName, false)
      setFreeze(false)
      return {
        password,
        valid: true
      }
    } catch(e) {
      setFreeze(false)
      return {
        password,
        valid: false
      }
    }
  }

  return (
    <Portal>
      <Dialog dismissable={!freeze} visible={visible} onDismiss={cancel}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <PasswordInput 
            onChangeText={setPassword}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button disabled={freeze} onPress={cancel}>Cancel</Button>
          <Button disabled={freeze} onPress={async () => submit(await validatePassword())}>Done</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default PasswordCheck;
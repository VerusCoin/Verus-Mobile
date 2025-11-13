import * as React from 'react';
import { Button, Dialog, Portal } from 'react-native-paper';
import { checkPinForUser } from '../utils/asyncStore/asyncStore';
import { getSupportedBiometryType } from '../utils/keychain/keychain';
import PasswordInput from './PasswordInput';
import { getBiometricPassword } from '../utils/keychain/biometrics';

const PasswordCheck = (props) => {
  const { visible, title, submit, cancel, userName, account, allowBiometry } = props;
  const [password, setPassword] = React.useState({
    text: "",
    usingBiometry: false
  });
  const [freeze, setFreeze] = React.useState(false);
  const [biometryType, setBiometryType] = React.useState(null);

  async function setSupportedBiometry() {
    if (allowBiometry && account.biometry) {
      setBiometryType(await getSupportedBiometryType())
    }
  }

  async function clearPasswordIfAppropriate() {
    if (visible == false) {
      setPassword({
        text: "",
        usingBiometry: false,
      });
    }
  }

  async function submitBiometricIfAble() {
    if (password.usingBiometry) {      
      submit(await validatePassword())
      setPassword({
        text: password.text,
        usingBiometry: false,
      });
    }
  }

  React.useEffect(() => {
    setSupportedBiometry()
  }, [account, allowBiometry]);

  React.useEffect(() => {
    clearPasswordIfAppropriate()
  }, [visible]);

  const validatePassword = async () => {
    setFreeze(true)

    try {
      await checkPinForUser(password.text, userName, false)
      setFreeze(false)
      return {
        password: password.text,
        valid: true
      }
    } catch(e) {
      setFreeze(false)
      return {
        password: password.text,
        valid: false
      }
    }
  }

  React.useEffect(() => {
    submitBiometricIfAble();
  }, [password.text]);

  const tryBiometricAuth = async () => {
    if (biometryType != null && biometryType.biometry) {
      try {
        setPassword({
          text: await getBiometricPassword(account.accountHash, "Authenticate to unlock"),
          usingBiometry: true
        });
      } catch (e) {
        console.warn(e);
      }
    }
  };

  return (
    <Portal>
      <Dialog dismissable={!freeze} visible={visible} onDismiss={cancel}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <PasswordInput
            value={password.text}
            onChangeText={(text) => setPassword({ text, usingBiometry: password.usingBiometry })}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button disabled={freeze} onPress={cancel}>
            Cancel
          </Button>
          {allowBiometry && biometryType != null && biometryType.biometry && (
            <Button disabled={freeze} onPress={() => tryBiometricAuth()}>
              {biometryType.display_name}
            </Button>
          )}
          <Button disabled={freeze} onPress={async () => submit(await validatePassword())}>
            Done
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default PasswordCheck;
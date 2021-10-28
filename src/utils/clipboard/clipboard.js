import { Alert, Clipboard } from 'react-native';

export const copyToClipboard = (data, alertInfo) => {
  Clipboard.setString(data)

  if (alertInfo != null) {
    Alert.alert(alertInfo.title ? alertInfo.title : "Copied", alertInfo.message);
  }
}
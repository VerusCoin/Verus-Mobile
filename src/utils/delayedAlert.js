import { Alert } from 'react-native';

const delayedInvocation = (delay, args) => (
  setTimeout(() => (Alert.alert(...args)), delay)
)

export default (...args) => (
  delayedInvocation(1000, args)
)

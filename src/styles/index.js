import roots from './roots.styles'
import buttons from './buttons.styles'
import text from './text.styles'
import containers from './containers.styles'
import { StyleSheet } from "react-native";
import misc from './misc.styles';

export default Styles = StyleSheet.create({
  ...roots,
  ...buttons,
  ...text,
  ...containers,
  ...misc
});
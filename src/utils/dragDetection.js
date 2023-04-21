import { Platform } from "react-native";

export const dragDetectionEnabled = (homeCardDragDetection) => {
  if (homeCardDragDetection === false) return false;
  else if (homeCardDragDetection === true) return true;
  else if (Platform.OS === 'ios') return true;
  else return false;
}
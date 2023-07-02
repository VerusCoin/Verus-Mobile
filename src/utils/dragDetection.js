import { Platform } from "react-native";

export const dragDetectionEnabled = (homeCardDragDetection = false) => {
  if (homeCardDragDetection != null) return homeCardDragDetection;
  else return false;
}
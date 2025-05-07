import { isEqual } from "lodash";
import { useSelector } from "react-redux";

export const useObjectSelector = (extractor) => {
  return useSelector(extractor, isEqual);
}
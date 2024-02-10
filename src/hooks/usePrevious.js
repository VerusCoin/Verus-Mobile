import { useEffect, useRef } from "react";

export const usePrevious = (x) => {
  const ref = useRef();

  useEffect(() => {
    ref.current = x;
  });
  
  return ref.current;
}
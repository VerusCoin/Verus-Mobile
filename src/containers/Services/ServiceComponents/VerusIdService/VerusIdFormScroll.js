import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef} from 'react';
import {View} from 'react-native';

export const VerusIdFormScrollContext = createContext(null);

// Scoped to the registration and management forms. KeyboardAvoidingForm owns
// keyboard avoidance; this measures the focused field group and reserves the
// scroll cue without changing other consumers of the shared scroll views.
export function useVerusIdFormScroll(keyboardVisible, keepInputVisible = false) {
  const scrollRef = useRef(null);
  const focusedField = useRef(null);
  const viewportHeight = useRef(0);
  const revealFrame = useRef(null);
  const reveal = useCallback(() => {
    if (revealFrame.current != null) cancelAnimationFrame(revealFrame.current);
    if (!keyboardVisible) return;
    revealFrame.current = requestAnimationFrame(() => {
      revealFrame.current = null;
      const field = focusedField.current;
      const content = scrollRef.current?.getInnerViewNode();
      if (!field || !content || viewportHeight.current <= 0) return;
      field.scrollGroup.measureLayout(content, (_x, y, _width, height) => {
        if (focusedField.current !== field) return;
        // Reserve the shared sheet cue (46 points) and its gap. The status
        // at the end of a field group must clear the fade after it changes.
        const scrollTo = offset => {
          if (focusedField.current === field) scrollRef.current?.scrollTo({y: offset, animated: false});
        };
        if (!keepInputVisible) {
          scrollTo(Math.max(0, y + height + 58 - viewportHeight.current));
          return;
        }
        // Short viewports use the native indicator, without the 46-point cue.
        // Keep the label in view if the group fits. Otherwise the editable
        // input takes priority over its helper and availability lines.
        const clearance = viewportHeight.current >= 128 ? 58 : 8;
        const offset = Math.max(0, Math.min(y, y + height + clearance - viewportHeight.current));
        if (height + clearance > viewportHeight.current && field.input?.measureLayout) {
          field.input.measureLayout(content, (_inputX, inputY, _inputWidth, inputHeight) => {
            scrollTo(Math.max(0, Math.min(inputY - 8, y + height + clearance - viewportHeight.current)));
          }, () => scrollTo(offset));
        } else scrollTo(offset);
      }, () => {});
    });
  }, [keyboardVisible, keepInputVisible]);
  useEffect(() => {
    reveal();
    return () => {
      if (revealFrame.current != null) cancelAnimationFrame(revealFrame.current);
    };
  }, [reveal]);
  const blur = useCallback(group => {
    if (focusedField.current?.group === group) focusedField.current = null;
  }, []);
  const context = useMemo(() => ({
    focus: (group, input, scrollGroup = group) => {focusedField.current = {group, input, scrollGroup}; reveal();},
    blur,
    reveal,
  }), [blur, reveal]);
  return {
    context,
    scrollRef,
    onLayout: event => {viewportHeight.current = event.nativeEvent.layout.height; reveal();},
    onContentSizeChange: reveal,
    onFooterLayout: reveal,
    // The footer is a non-shrinking sibling, outside the clipped viewport.
    // Reserve only the scroll cue, not a second copy of the footer's height.
    keyboardPadding: keyboardVisible ? {paddingBottom: 48} : null,
  };
}

// Keep the supporting line in this wrapper so its native layout is measured
// with the input. Focus still belongs to the actual native field.
export function VerusIdFormField({children, scrollGroupRef, ...props}) {
  const context = useContext(VerusIdFormScrollContext);
  const fieldRef = useRef(null);
  const inputRef = useRef(null);
  const blur = context?.blur;
  // A status can change without changing the group's height (for example
  // Checking name to Taken). Reveal again after the new line renders.
  useEffect(() => { context?.reveal(); });
  useEffect(() => {
    const field = fieldRef.current;
    return () => blur?.(field);
  }, [blur]);
  return <View {...props} ref={fieldRef} collapsable={false} onLayout={context?.reveal}>
    {children({
      ref: inputRef,
      onFocus: () => context?.focus(fieldRef.current, inputRef.current, scrollGroupRef?.current || fieldRef.current),
      onBlur: () => context?.blur(fieldRef.current),
    })}
  </View>;
}

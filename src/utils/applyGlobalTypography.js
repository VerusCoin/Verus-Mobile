import React from 'react';
import {StyleSheet, Text, TextInput} from 'react-native';
import {fontStyle, fontStyleForWeight} from '../globals/fonts';

const getInterTextStyle = style => {
  const flattened = StyleSheet.flatten(style) || {};

  if (flattened.fontFamily != null) {
    return null;
  }

  return {
    ...fontStyleForWeight(flattened.fontWeight),
  };
};

const patchTextComponent = Component => {
  if (Component.__verusInterPatched || typeof Component.render !== 'function') {
    return;
  }

  const originalRender = Component.render;

  Component.render = function renderWithInter(...args) {
    const element = originalRender.call(this, ...args);

    if (!React.isValidElement(element)) {
      return element;
    }

    return React.cloneElement(element, {
      style: [element.props.style, getInterTextStyle(element.props.style)],
    });
  };

  Component.__verusInterPatched = true;
};

const applyGlobalTypography = () => {
  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.allowFontScaling = false;
  Text.defaultProps.style = [fontStyle('regular'), Text.defaultProps.style];

  TextInput.defaultProps = TextInput.defaultProps || {};
  TextInput.defaultProps.allowFontScaling = false;
  TextInput.defaultProps.style = [
    fontStyle('regular'),
    TextInput.defaultProps.style,
  ];

  patchTextComponent(Text);
  patchTextComponent(TextInput);
};

export default applyGlobalTypography;

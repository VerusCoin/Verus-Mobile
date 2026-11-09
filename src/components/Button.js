import React, {forwardRef} from 'react';
import {Button as PaperButton} from 'react-native-paper';
import {buttonLabel, roundedButton} from '../styles/buttons.styles';

// Match registration actions while preserving label casing and caller styling.
const Button = forwardRef(({style, labelStyle, ...props}, ref) => (
  <PaperButton uppercase={false} {...props} ref={ref}
    style={[roundedButton, style]} labelStyle={[buttonLabel, labelStyle]} />
));

Button.displayName = 'Button';

export default Button;

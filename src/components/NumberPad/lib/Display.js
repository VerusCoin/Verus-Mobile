import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, View, Text } from 'react-native';

import NumberPadContext from './NumberPadContext';
import styles from './styles';

const parse = (string) => {
  return parseFloat(string.replace(/,/g, ''));
};

const format = (string, initial, decimals = 8) => {
  let decimal = string.includes('.');
  let [whole = '', part = ''] = string.split('.');
  decimal = initial && string !== '0' ? true : decimal;
  whole = whole.replace(/,/g, '').substring(0, 15);
  whole = whole ? parseInt(whole).toLocaleString('en-US') : '0';
  part = part.substring(0, decimals);
  part = initial && decimal ? part.padEnd(2, '0') : part;
  return `${whole}${decimal ? '.' : ''}${part}`;
};

export default class Display extends Component {
  static contextType = NumberPadContext;

  static propTypes = {
    value: PropTypes.number.isRequired,
    style: PropTypes.object.isRequired,
    textStyle: PropTypes.object.isRequired,
    activeStyle: PropTypes.object.isRequired,
    activeTextStyle: PropTypes.object.isRequired,
    invalidTextStyle: PropTypes.object.isRequired,
    placeholderTextStyle: PropTypes.object.isRequired,
    cursorStyle: PropTypes.object.isRequired,
    blinkOnStyle: PropTypes.object.isRequired,
    blinkOffStyle: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    isValid: PropTypes.func.isRequired,
    cursor: PropTypes.bool.isRequired,
    autofocus: PropTypes.bool.isRequired,
    decimals: PropTypes.number.isRequired
  };

  static defaultProps = {
    value: 0.0,
    style: styles.display,
    textStyle: styles.displayText,
    activeStyle: styles.activeDisplay,
    activeTextStyle: styles.activeDisplayText,
    invalidTextStyle: styles.invalidDisplayText,
    placeholderTextStyle: styles.placeholderDisplayText,
    cursorStyle: styles.cursor,
    blinkOnStyle: styles.blinkOn,
    blinkOffStyle: styles.blinkOff,
    onChange: () => {},
    isValid: () => true,
    cursor: false,
    autofocus: false,
    decimals: 8
  };

  constructor(props) {
    super(props);

    this.blink = null;

    const value = format(String(this.props.value), true, props.decimals);

    this.state = {
      valid: true,
      active: false,
      blink: true,
      value,
      lastValue: value,
      empty: value === '0',
    };
  }

  componentDidMount() {
    this.context.registerDisplay(this);
    if (this.props.autofocus) {
      setTimeout(this.focus, 0); // setTimeout fixes an issue with it sometimes not focusing
    }
  }

  componentWillUnmount() {
    this.context.unregisterDisplay(this);
    if (this.blink) clearInterval(this.blink);
  }

  focus = (propagate = true) => {
    if (propagate) this.context.focus(this);
    this.setState({
      active: true,
      lastValue: format(this.state.value, true, this.props.decimals),
      value: '0',
    });
    if (this.props.cursor) {
      if (this.blink) clearInterval(this.blink);
      this.blink = setInterval(() => {
        this.setState({
          blink: !this.state.blink,
        });
      }, 600);
    }
  };

  blur = (propagate = true) => {
    if (propagate && this.context.display === this._reactInternalFiber.key) {
      this.context.blur();
    }

    const value = format(this.state.value, true, this.props.decimals);

    this.setState({
      active: false,
      value: this.value(value),
    });
  };

  empty = (value) => {
    value = value ? value : this.state.value;
    return value === '0';
  };

  value = (value) => {
    value = value ? value : this.state.value;
    return this.empty(value) ? this.state.lastValue : value;
  };

  onInputEvent = (event) => {
    const value = format(
      event === "backspace"
        ? this.state.value.substring(0, this.state.value.length - 1)
        : `${this.state.value}${event}`,
      false,
      this.props.decimals
    );
    const valid = this.props.isValid(value);
    this.setState({
      value,
      valid,
    });
    this.props.onChange(parse(this.value(value)));
  };

  render() {
    const { valid, value, active } = this.state;
    const empty = this.empty();
    const blink = this.state.blink
      ? this.props.blinkOnStyle
      : this.props.blinkOffStyle;
    const style = [
      { flexDirection: 'row' },
      this.props.style,
      active ? this.props.activeStyle : null,
    ];
    const textStyle = [
      this.props.textStyle,
      active ? this.props.activeTextStyle : null,
    ];
    const cursorStyle = [this.props.cursorStyle];
    return (
      <TouchableOpacity style={style} onPress={this.focus}>
        <View style={[cursorStyle, active ? blink : null]}>
          <Text
            style={[
              textStyle,
              valid ? null : this.props.invalidTextStyle,
              empty ? this.props.placeholderTextStyle : null,
            ]}
          >
            {empty ? this.state.lastValue : value}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
}

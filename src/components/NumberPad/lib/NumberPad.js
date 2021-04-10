import React, { Component } from 'react';
import PropTypes from 'prop-types';

import NumberPadContext from './NumberPadContext';

export default class NumberPad extends Component {
  static propTypes = {
    children: PropTypes.any,
  };

  constructor(props) {
    super(props);

    this.displays = {};
    this.avoidingViews = {};

    this.state = {
      display: null, // currently focused display
      input: null, // input component
      height: 0, // height of input component
    };
  }

  focus = (display) => {
    // blur all displays except for this one and do not propagate
    Object.values(this.displays)
      .filter((d) => d !== display)
      .map((d) => d.blur(false));

    // set current display
    this.setState({
      display: display._reactInternalFiber.key,
    });

    // show input
    if (this.state.input) {
      this.state.input.show();
    }

    // show avoiding views
    Object.values(this.avoidingViews).map((view) => view.show());
  };

  blur = () => {
    const display = this.display();

    // call current display's blur method
    if (display) {
      display.blur(false);
    }

    // set current display to null
    this.setState({
      display: null,
    });

    // hide input
    if (this.state.input) {
      this.state.input.hide();
    }

    // hide avoiding views
    Object.values(this.avoidingViews).map((view) => view.hide());
  };

  registerDisplay = (display) => {
    this.displays[display._reactInternalFiber.key] = display;
  };

  unregisterDisplay = (display) => {
    delete this.displays[display._reactInternalFiber.key];
  };

  registerAvoidingView = (view) => {
    this.avoidingViews[view._reactInternalFiber.key] = view;
  };

  unregisterAvoidingView = (view) => {
    delete this.avoidingViews[view._reactInternalFiber.key];
  };

  registerInput = (input) => {
    this.setState({
      input,
    });
  };

  setHeight = (height) => {
    this.setState({
      height,
    });
  };

  onInputEvent = (event) => {
    const display = this.display();
    display && display.onInputEvent(event);
  };

  display = () => {
    return this.state.display && this.displays[this.state.display];
  };

  render() {
    return (
      <NumberPadContext.Provider
        value={{
          display: this.state.display,
          input: this.state.input,
          height: this.state.height,
          focus: this.focus,
          blur: this.blur,
          onInputEvent: this.onInputEvent,
          registerDisplay: this.registerDisplay,
          unregisterDisplay: this.unregisterDisplay,
          registerAvoidingView: this.registerAvoidingView,
          unregisterAvoidingView: this.unregisterAvoidingView,
          registerInput: this.registerInput,
          setHeight: this.setHeight,
        }}
      >
        {this.props.children}
      </NumberPadContext.Provider>
    );
  }
}

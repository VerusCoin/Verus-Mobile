import React from 'react';
import { SafeAreaView } from 'react-native';
import NumberPad, { Input, Display } from './index';
import { Ionicons } from '@expo/vector-icons';

export default class App extends React.Component {
  render() {
    return (
      <NumberPad>
        <SafeAreaView>
          {[0, 1, 2].map((i) => (
            <Display key={i} cursor value={101} />
          ))}
        </SafeAreaView>
        <Input
          backspaceIcon={<Ionicons name="ios-backspace" {...Input.iconStyle} />}
          hideIcon={<Ionicons name="ios-arrow-down" {...Input.iconStyle} />}
        />
      </NumberPad>
    );
  }
}

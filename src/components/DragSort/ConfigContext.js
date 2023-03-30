// React Native Drag and Sort

// MIT License

// Copyright (c) 2020 Micael

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { createContext } from 'react';
import { Dimensions } from 'react-native';
import { Easing } from 'react-native-reanimated';

export const { width } = Dimensions.get('window');
export const getPosition = (config, order) => {
  'worklet';

  return {
    x: (order % config.COL) * config.WIDTH,
    y: Math.floor(order / config.COL) * config.HEIGHT,
  };
};

export const getOrder = (config, tx, ty, max) => {
  'worklet';

  const x = Math.round(tx / config.WIDTH) * config.WIDTH;
  const y = Math.round(ty / config.HEIGHT) * config.HEIGHT;
  const row = Math.max(y, 0) / config.HEIGHT;
  const col = Math.max(x, 0) / config.WIDTH;
  return Math.min(row * config.COL + col, max);
};

export const ConfigContext = createContext({
  MARGIN: 8,
  COL: 2,
  WIDTH: width / 2 - 16,
  HEIGHT: 140,
  getPosition,
  getOrder,
});

export const animationConfig = {
  easing: Easing.inOut(Easing.ease),
  duration: 350,
};

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

import { ConfigContext } from './ConfigContext';
import React, {  useState } from 'react';
import { Dimensions } from 'react-native';
import { getOrder, getPosition } from './ConfigContext';

export default function SortableContainer({
  children,
  customconfig,
}) {
  const { width } = Dimensions.get('window');

  const [config] = useState({
    MARGIN: -12,
    COL: 2,
    WIDTH: width / 2 - 6,
    HEIGHT: 128,
    getPosition, 
    getOrder,
  });

  const joint = { ...customconfig, getPosition, getOrder };

  return (
    <ConfigContext.Provider value={!customconfig ? joint : config}>
      {children}
    </ConfigContext.Provider>
  );
}

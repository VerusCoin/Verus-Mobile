import React from 'react'
import { View } from "react-native"

import PURE_DARK from './pure/pure_dark.svg'
import PURE_LIGHT from './pure/pure_light.svg'
import BRIDGE_VETH_DARK from './bridge-veth/bridge-veth_dark.svg'
import BRIDGE_VETH_LIGHT from './bridge-veth/bridge-veth_light.svg'

const RenderPbaasCurrencyLogo = (iAddr) => {
  function hashCode(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }

  function intToRGB(i) {
    const c = (i & 0x00FFFFFF)
      .toString(16)
      .toUpperCase();

    return "#" + "00000".substring(0, 6 - c.length) + c;
  }

  const hashedNum = hashCode(iAddr)
  const _color = intToRGB(hashedNum)
  const interiorColors = []

  for (let i = 0; i < 16; i++) {
    var x = Math.sin(i + hashedNum) * (10000 + hashedNum);

    interiorColors.push(intToRGB(Math.floor(x)))
  }

  const RenderColorLogo = (size, color) => {
    return (
      <View
        style={{
          width: size,
          borderRadius: size / 2,
          height: size,
          backgroundColor: color,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          flexWrap: "wrap",
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {interiorColors.map(interiorColor => {
          return (
            <View
              style={{
                width: (size / 4),
                height: (size / 4),
                backgroundColor: interiorColor
              }}
            />
          );
        })}
      </View>
    );
  };

  return {
    light: (props) => RenderColorLogo(props.width, _color),
    dark: (props) => RenderColorLogo(props.width, _color),
  }
}

export default {
  RenderPbaasCurrencyLogo,
  PURE: { light: PURE_LIGHT, dark: PURE_DARK },
  BRIDGE_VETH: { light: BRIDGE_VETH_LIGHT, dark: BRIDGE_VETH_DARK }
}
import React from "react";
import { Card } from "react-native-paper";
import { View } from "react-native";
import { getCoinLogo } from "./CoinData";
import { CoinDirectory } from "./CoinDirectory";
import { coinsList } from "./CoinsList";

export const RenderSquareLogo = (LogoComponent, color, width = 40, height = 40) => {
  return (
    <Card
      style={{
        backgroundColor: color,
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row"
      }}
      elevation={0}
    >
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        {LogoComponent}
      </View>
    </Card>
  );
};

export const RenderCircleLogo = (LogoComponent, color, width = 40, height = 40) => {
  return (
    <Card
      style={{
        backgroundColor: color,
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        borderRadius: width
      }}
      elevation={0}
    >
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        {LogoComponent}
      </View>
    </Card>
  );
};

export const getSimpleLogo = (chainTicker, theme = 'light') => {
  let proto;
  let color;

  try {
    const coinObj = CoinDirectory.findCoinObj(chainTicker)
    color = coinObj.theme_color;
    proto = coinObj.proto;
  } catch(e) {
    proto = 'vrsc';
    color = coinsList.VRSC.theme_color;
  }
  
  const Logo = getCoinLogo(chainTicker, proto, theme);

  return { Logo: Logo, color };
}

export const RenderSquareCoinLogo = (chainTicker, style = {}, width = 40, height = 40) => {
  const { Logo, color } = getSimpleLogo(chainTicker);

  return RenderSquareLogo(
    <Logo
      width={width - 16}
      height={height - 16}
      style={{
        alignSelf: "center",
        ...style
      }}
    />,
    color,
    width,
    height
  );
};

export const RenderCircleCoinLogo = (chainTicker, style = {}, width = 40, height = 40) => {
  const { Logo, color } = getSimpleLogo(chainTicker);

  return RenderCircleLogo(
    <Logo
      width={width - 16}
      height={height - 16}
      style={{
        alignSelf: "center",
        ...style
      }}
    />,
    color,
    width,
    height
  );
};

export const RenderPlainCoinLogo = (chainTicker, style = {}, width = 40, height = 40) => {
  const { Logo } = getSimpleLogo(chainTicker, 'dark');

  return <Logo
    width={width}
    height={height}
    style={{
      alignSelf: "center",
      ...style
    }}
  />
};
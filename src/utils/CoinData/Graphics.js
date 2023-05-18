import React from "react";
import { Card } from "react-native-paper";
import { CoinLogos, getCoinLogo } from "./CoinData";
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
        flexDirection: "row",
      }}
      elevation={0}
    >
      {LogoComponent}
    </Card>
  );
};

export const RenderSquareCoinLogo = (chainTicker, style = {}, width = 40, height = 40) => {
  const Logo = getCoinLogo(chainTicker);

  return RenderSquareLogo(
    <Logo
      width={width - 15}
      height={height - 15}
      style={{
        alignSelf: "center",
        ...style
      }}
    />,
    coinsList[chainTicker].theme_color,
    width,
    height
  );
};

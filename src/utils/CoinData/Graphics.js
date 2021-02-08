import React from "react";
import { Card } from "react-native-paper";
import { CoinLogos } from "./CoinData";
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
    >
      {LogoComponent}
    </Card>
  );
};

export const RenderSquareCoinLogo = (chainTicker, style = {}, width = 40, height = 40) => {
  const tickerLc = chainTicker.toLowerCase()
  const Logo = CoinLogos[tickerLc].light

  return RenderSquareLogo(
    <Logo
      width={width - 15}
      height={height - 15}
      style={{
        alignSelf: "center",
        ...style
      }}
    />,
    coinsList[tickerLc].theme_color,
    width,
    height
  );
};

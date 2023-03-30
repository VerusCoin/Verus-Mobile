import React from 'react'
import { View } from "react-native"
import { Text } from "react-native-paper"
import Colors from "../../../../globals/colors"

const RenderFiatCoinLogo = (symbol, darkColor = Colors.primaryColor) => {
  const RenderTextLogo = (symbol, color, size) => {
    return (<View style={{ width: size, marginHorizontal: 8, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: Number((size / symbol.length).toFixed(0)), color: color }}>{symbol}</Text>
      </View>)
  }

  return  {
    light: (props) => RenderTextLogo(symbol, Colors.secondaryColor, props.width),
    dark: (props) => RenderTextLogo(symbol, darkColor, props.width),
  }
}

export default {
  USD: RenderFiatCoinLogo("$"),
  AUD: RenderFiatCoinLogo("$"),
  EUR: RenderFiatCoinLogo("€"),
  CHF: RenderFiatCoinLogo("CHF"),
  MXN: RenderFiatCoinLogo("$"),
  CLP: RenderFiatCoinLogo("$"),
  ZAR: RenderFiatCoinLogo("R"),
  VND: RenderFiatCoinLogo("₫"),
  ILS: RenderFiatCoinLogo("₪"),
  HKD: RenderFiatCoinLogo("$"),
  DKK: RenderFiatCoinLogo("kr"),
  CAD: RenderFiatCoinLogo("$"),
  MYR: RenderFiatCoinLogo("RM"),
  NOK: RenderFiatCoinLogo("kr"),
  CZK: RenderFiatCoinLogo("Kč"),
  SEK: RenderFiatCoinLogo("kr"),
  ARS: RenderFiatCoinLogo("$"),
  INR: RenderFiatCoinLogo("₹"),
  THB: RenderFiatCoinLogo("฿"),
  KRW: RenderFiatCoinLogo("₩"),
  JPY: RenderFiatCoinLogo("¥"),
  PLN: RenderFiatCoinLogo("zł"),
  GBP: RenderFiatCoinLogo("£"),
  PHP: RenderFiatCoinLogo("₱"),
  ISK: RenderFiatCoinLogo("kr"),
  COP: RenderFiatCoinLogo("$"),
  SGD: RenderFiatCoinLogo("$"),
  NZD: RenderFiatCoinLogo("$"),
  BRL: RenderFiatCoinLogo("R$"),
}
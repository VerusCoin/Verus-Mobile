import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Styles from "../../../styles";
import { Button, Card, Text, TextInput } from "react-native-paper";
import Colors from "../../../globals/colors";
import { RenderCircleCoinLogo, RenderPlainCoinLogo } from "../../../utils/CoinData/Graphics";
import { TouchableOpacity } from "react-native";

const ConvertCard = ({ 
  coinObj, 
  networkObj, 
  address, 
  amount, 
  setAmount, 
  balance,
  onMaxPressed,
  onSelectPressed,
  selectDisabled
}) => {
  const [cardActive, setCardActive] = useState(false);

  useEffect(() => {
    if (coinObj != null && networkObj != null && address != null) {
      setCardActive(true);
    } else setCardActive(false);
  }, [coinObj, networkObj, address])

  const handleSelectPressed = () => {
    setCardActive(false);

    if (onSelectPressed) onSelectPressed();
  }

  return (
    <Card mode="contained" style={{
      width: "100%",
      borderRadius: 20,
      elevation: 0,
      borderWidth: 0.2,
      borderColor: Colors.ultraLightGrey
    }}>
      <Card.Content style={{
        display: "flex",
        flexDirection: "column"
      }}>
        <View style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <TextInput 
            contentStyle={{
              fontWeight: "600",
              fontSize: 36,
              color: amount == null ? Colors.tertiaryColor : Colors.quaternaryColor
            }}
            style={{
              flex: 1,
              backgroundColor: Colors.secondaryColor
            }}
            outlineStyle={{
              opacity: 0
            }}
            value={amount == null ? "0" : amount}
            onChangeText={x => setAmount(x)}
            mode="outlined"
            keyboardType="numeric"
            disabled={!setAmount}
          />
          {!cardActive ? 
            <Button
              mode="contained"
              style={{
                borderRadius: 15,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onPress={handleSelectPressed}
              disabled={selectDisabled}
            >
              {"Select"}
            </Button> 
            : 
            <TouchableOpacity 
              style={{
                backgroundColor: Colors.ultraUltraLightGrey,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                padding: 8,
                borderRadius: 20
              }}
              onPress={handleSelectPressed}
              disabled={selectDisabled}
            >
              {RenderCircleCoinLogo(coinObj.id)}
              <View style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                marginLeft: 8
              }}>
                <Text style={{
                  fontWeight: "600",
                  fontSize: 24
                }}>
                  {coinObj.display_ticker}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: Colors.quaternaryColor
                }}>
                  {coinObj.display_name}
                </Text>
              </View>
            </TouchableOpacity>
          }
        </View>
        <View style={{
          alignItems: "center",
          justifyContent: "flex-end",
          flexDirection: "row",
          opacity: cardActive ? 1 : 0
        }}>
          <Text style={{
            fontWeight: "600",
            color: Colors.quaternaryColor
          }}>
            {!cardActive ? '' : `${balance != null ? balance : '-'} ${coinObj.display_ticker}`}
          </Text>
          <Button
            mode="text"
            compact
            onPress={onMaxPressed}
          >
            {"Max"}
          </Button>
        </View>
        <View style={{
          backgroundColor: Colors.ultraUltraLightGrey,
          borderRadius: 20,
          paddingHorizontal: 8,
          paddingVertical: 2,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: cardActive ? 1 : 0
        }}>
          <View style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-start",
            alignItems: "center"
          }}>
            <Text style={{
              color: Colors.quaternaryColor
            }}>{"From: "}</Text>
            {cardActive && <Text style={{
              fontWeight: "600",
              color: Colors.quaternaryColor
            }}>{`${networkObj.display_ticker} `}</Text>}
            {cardActive && RenderPlainCoinLogo(networkObj.id, {}, 20, 20)}
          </View>
          {cardActive && <Text style={{
            color: Colors.quaternaryColor
          }}>{address}</Text>}
        </View>
      </Card.Content>
    </Card>
  );
}

export default ConvertCard;
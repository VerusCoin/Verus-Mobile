import React from "react";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { Button, List, Divider, Text } from "react-native-paper";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";

export const DepositSendConfirmRender = function () {
  return (
    <ScrollView style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite }}>
      {this.state.confirmationFields.map((item, index) => {
        if (item.data != null && (item.condition == null || item.condition === true))
          return (
            <React.Fragment key={index}>
              <TouchableOpacity disabled={item.onPress == null} onPress={() => item.onPress()}>
                <List.Item
                  title={item.data}
                  description={item.key}
                  titleNumberOfLines={item.numLines || 1}
                  right={(props) =>
                    item.right ? (
                      <Text
                        {...props}
                        style={{
                          fontSize: 16,
                          alignSelf: "center",
                          color: Colors.verusDarkGray,
                          fontWeight: "300",
                          marginRight: 8,
                        }}
                      >
                        {item.right}
                      </Text>
                    ) : null
                  }
                />
                <Divider />
              </TouchableOpacity>
            </React.Fragment>
          );
        else return null;
      })}
      <View
        style={{
          ...Styles.fullWidthBlock,
          paddingHorizontal: 16,
          flexDirection: "row",
          justifyContent: "space-between"
        }}
      >
        <Button
          textColor={Colors.warningButtonColor}
          style={{ width: 148 }}
          onPress={() => this.goBack()}
        >
          Back
        </Button>
        <Button
          buttonColor={Colors.verusGreenColor}
          textColor={Colors.secondaryColor}
          style={{ width: 148 }}
          onPress={() => this.submitData()}
        >
          Send
        </Button>
      </View>
    </ScrollView>
  );
};
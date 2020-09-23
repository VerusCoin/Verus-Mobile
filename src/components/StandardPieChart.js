import React, { Component } from "react";
import { View, Text } from "react-native";
import Pie from "react-native-pie";

export default class StandardPieChart extends Component {
  render() {
    return (
      <View
        style={{
          width: 175,
          alignItems: "center",
          ...this.props.containerStyle,
        }}
      >
        <Pie
          radius={this.props.radius}
          innerRadius={this.props.radius - 5}
          sections={this.props.sections}
          dividerSize={2}
          strokeCap={"butt"}
        />
        <View
          style={{
            position: "absolute",
            width: 165,
            height: 160,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              backgroundColor: "transparent",
              color: "#000",
              fontSize: 20,
            }}
          >
            {this.props.innerText}
          </Text>
        </View>
      </View>
    );
  }
};

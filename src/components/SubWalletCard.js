import React, { Component } from "react";
import Styles from '../styles/index'
import { Avatar, Card, Text, Paragraph } from 'react-native-paper';
import { View } from "react-native";

export default class SubWalletCard extends Component {
  render() {
    return (
      <Card
        style={{ margin: '2%', width: '46%', height: 120, borderRadius: 10 }}
        onPress={
          this.props.onPress != null ? this.props.onPress : () => {}
        }
      >
        <Card.Content>
          <View style={{ display: "flex", flexDirection: "row", alignItems: "center"}}>
            <Avatar.Icon icon="wallet" color={"white"} style={{ backgroundColor: this.props.color }} size={30} />
            <Text style={{ fontSize: 16, marginLeft: 8 }}>{this.props.nameTitle}</Text>
          </View>
          <Paragraph style={{ fontSize: 16, paddingTop: 8 }}>{this.props.balanceTitle}</Paragraph>
          <Paragraph style={{...Styles.listItemSubtitleDefault, fontSize: 12 }}>
            {this.props.balanceSubtitle}
          </Paragraph>
        </Card.Content>
      </Card>
    );
  }
}

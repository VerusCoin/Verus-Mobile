import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Styles from "../../styles";
import { Button } from "react-native-paper";
import Colors from "../../globals/colors";
import ConvertCard from "./ConvertCard/ConvertCard";

const Convert = (props) => {
  useEffect(() => {
    
  }, [])

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between'
      }}
    >
      <View
        style={{
          width: '90%',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
        }}>
        <ConvertCard />
      </View>
      <View
        style={{
          width: '90%',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
        }}>
        <Button
          buttonColor={Colors.verusGreenColor}
          textColor={Colors.secondaryColor}
          style={{width: 280}}>
          Choose amount to convert
        </Button>
      </View>
    </ScrollView>
  );
}

export default Convert;
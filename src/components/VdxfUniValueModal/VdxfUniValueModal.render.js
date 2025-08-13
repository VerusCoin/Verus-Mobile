// VdxfUniValueModal.render.js (Refactored for Hooks)
import React from "react";
import { SafeAreaView, View } from "react-native";
import { Text, Portal, Button } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Colors from "../../globals/colors";
import SemiModal from "../SemiModal";
import { VdxfUniValueModalInnerAreaRender } from "./VdxfUniValueModalInnerArea.render";
import PartialSignDataModal from "./PartialSignDataModal";
import AnimatedActivityIndicatorBox from "../AnimatedActivityIndicatorBox";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

const Root = createStackNavigator();
const TopTabs = createMaterialTopTabNavigator();

export const VdxfUniValueModalRender = (props) => {
  const { visible, title } = props;

  return (
    <Portal>
      <NavigationContainer>
        <SemiModal
          animationType="slide"
          transparent={true}
          visible={visible}
          onRequestClose={props.cancel}
          contentContainerStyle={{
            height: 600,
            flex: 0,
            backgroundColor: Colors.secondaryColor,
          }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <Root.Navigator
              screenOptions={{
                header: () => (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: Colors.secondaryColor
                  }}>
                    <Button
                      style={{ marginBottom: 16 }}
                      onPress={props.cancel}
                      textColor={Colors.primaryColor}
                      disabled={props.preventExit}
                    >
                      {"Close"}
                    </Button>
                    <Text style={{ marginBottom: 16, fontSize: 16, textAlign: "center" }}>{title}</Text>
                    <Button
                      style={{ marginBottom: 16 }}
                      onPress={props.showHelpModal}
                      textColor={Colors.primaryColor}
                      disabled={props.preventExit}
                    >
                      {"Help"}
                    </Button>
                  </View>
                ),
                headerStyle: {
                  height: 52,
                },
              }}
            >
              <Root.Screen name="VdxfUniValueModalInner">
                {() => <TopTabs.Navigator
                  backBehavior={'none'}
                  tabBarPosition="bottom"
                  screenOptions={{
                    swipeEnabled: false,
                    tabBarPressColor: "transparent",
                    tabBarPressOpacity: 1,
                    tabBarLabelStyle: {
                      fontSize: 12
                    },
                    lazy: true,
                    lazyPlaceholder: () => <AnimatedActivityIndicatorBox />
                  }}>
                  {props.data ?
                    PartialSignDataModal(props, TopTabs)
                    :
                    VdxfUniValueModalInnerAreaRender(props, TopTabs)
                  }
                </TopTabs.Navigator>}
              </Root.Screen>
            </Root.Navigator>
          </SafeAreaView>
        </SemiModal>
      </NavigationContainer>
    </Portal>
  );
};
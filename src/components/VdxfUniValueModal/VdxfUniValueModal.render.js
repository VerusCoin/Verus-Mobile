/*
  VdxfUniValueModal.render
  - 2026-02-02: Use SemiModal standardized header (title + top-right X)
    and remove legacy Close/Help header actions.
*/
import React from "react";
import { SafeAreaView, View } from "react-native";
import { Portal } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Colors from "../../globals/colors";
import SemiModal from "../SemiModal";
import { VdxfUniValueModalInnerAreaRender } from "./VdxfUniValueModalInnerArea.render";
import AnimatedActivityIndicatorBox from "../AnimatedActivityIndicatorBox";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

const Root = createStackNavigator();
const TopTabs = createMaterialTopTabNavigator();

export const VdxfUniValueModalRender = (props) => {
  const { visible, title } = props;
  const items =
    props.items && props.items.length > 0 ? props.items : props.objects || [];
  const hasMultipleItems = items.length > 1;

  return (
    <Portal>
      <NavigationContainer>
        <SemiModal
          animationType="slide"
          transparent={true}
          visible={visible}
          onRequestClose={props.cancel}
          title={title}
          closeDisabled={props.preventExit}
          contentContainerStyle={{
            height: 600,
            flex: 0,
            backgroundColor: Colors.secondaryColor,
          }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <Root.Navigator
              screenOptions={{
                headerShown: false,
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
                    tabBarStyle: hasMultipleItems ? undefined : { display: 'none' },
                    lazy: true,
                    lazyPlaceholder: () => <AnimatedActivityIndicatorBox />
                  }}>
                  {VdxfUniValueModalInnerAreaRender(props, TopTabs)}
                </TopTabs.Navigator>}
              </Root.Screen>
            </Root.Navigator>
          </SafeAreaView>
        </SemiModal>
      </NavigationContainer>
    </Portal>
  );
};

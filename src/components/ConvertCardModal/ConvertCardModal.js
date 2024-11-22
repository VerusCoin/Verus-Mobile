import React, { useState, useEffect } from "react";
import { Platform, SafeAreaView, View } from "react-native";
import { Text, Portal, Button, IconButton } from "react-native-paper";
import Colors from "../../globals/colors";
import SemiModal from "../SemiModal";
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AnimatedActivityIndicatorBox from "../AnimatedActivityIndicatorBox";

import ConvertCardSelectCurrency from "./ConvertCardModalTabs/ConvertCardSelectCurrency";
import { useSelector } from "react-redux";
import { USD } from "../../utils/constants/currencies";
import { extractLedgerData } from "../../utils/ledger/extractLedgerData";
import { API_GET_BALANCES } from "../../utils/constants/intervalConstants";

const TopTabs = createMaterialTopTabNavigator();
const Root = createStackNavigator();

const ConvertCardModal = ({ onClose, visible, setVisible, totalBalances, mode, currencies, onSelectCurrency }) => {
  const [loading, setLoading] = useState(false);
  const [preventExit, setPreventExit] = useState(false);
  const [modalHeight, setModalHeight] = useState(600); // Adjust as needed

  const activeCoinsForUser = useSelector(state => state.coins.activeCoinsForUser);
  const [modalTitle, setModalTitle] = useState("Title");

  useEffect(() => {
    // Handle side effects here if necessary
  }, []);

  const cancel = () => {
    if (!preventExit) {
      setVisible(false);
      if (onClose) {
        onClose();
      }
    }
  };

  const showHelpModal = () => {
    // Implement your help modal logic here
  };

  return (
    <Portal>
      <NavigationContainer>
        <SemiModal
          animationType="slide"
          transparent={true}
          visible={visible}
          onRequestClose={cancel}
          contentContainerStyle={{
            height: modalHeight,
            flex: 0,
            backgroundColor: "white",
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
                    <IconButton icon="close" size={16} iconColor={Colors.verusDarkGray} />
                    <Text style={{ marginBottom: 16, fontSize: 16, textAlign: "center" }}>
                      {modalTitle}
                    </Text> 
                  </View>
                ),
                headerStyle: {
                  height: 52,
                },
              }}
            >
              <Root.Screen name="ModalInner">
                {() => (
                  <TopTabs.Navigator
                    initialRouteName="SelectCurrency"
                    backBehavior="none"
                    tabBarPosition="bottom"
                    screenOptions={{
                      swipeEnabled: false,
                      tabBarPressColor: "transparent",
                      tabBarPressOpacity: 1,
                      tabBarLabelStyle: {
                        fontSize: 12,
                      },
                      lazy: true,
                      lazyPlaceholder: () => <AnimatedActivityIndicatorBox />,
                    }}
                  >
                    <TopTabs.Screen
                      name="SelectCurrency"
                      options={{
                        tabBarLabel: 'Select a Currency',
                      }}
                      listeners={{
                        tabPress: e => {
                          e.preventDefault();
                        },
                      }}
                    >
                      {tabProps => (
                        <ConvertCardSelectCurrency 
                          {...tabProps} 
                          currencies={currencies}
                          setModalTitle={setModalTitle}
                          onSelect={onSelectCurrency}
                        />
                      )}
                    </TopTabs.Screen>
                  </TopTabs.Navigator>
                )}
              </Root.Screen>
            </Root.Navigator>
          </SafeAreaView>
        </SemiModal>
      </NavigationContainer>
    </Portal>
  );
};

export default ConvertCardModal;
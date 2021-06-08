
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
// import BottomNavigation, { FullTab } from 'react-native-material-bottom-navigation';
//import Icon from 'react-native-vector-icons/FontAwesome';
import AddIdentity from './AddIdentity';
import tabs from './tabs';
import Styles from '../../styles/index';

const sizeIcon = 25;

const Identity = (props) => {
  const { route, navigation, activeIdentityId } = props;
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const selectedTab = route.params.selectedScreen;
  const tabIndex = Object.keys(tabs).findIndex((tabKey) => tabs[tabKey].label.toLowerCase() === selectedTab.toLowerCase());

  const renderIcon = (icon) => () => (
    // <Icon size={sizeIcon} name={icon} style={Styles.whiteText} />
    null
  );

  useEffect(() => {
    setActiveTab(tabs[tabIndex]);
  }, [selectedTab, tabIndex, tabs]);

  // const renderTabItem = ({ tab, isActive }) => (
  //   <FullTab
  //     isActive={isActive}
  //     key={tab.key}
  //     label={tab.label}
  //     style={Styles.contentCenter}
  //     renderIcon={renderIcon(tab.icon)}
  //     labelStyle={Styles.labelBold}
  //   />
  // );

  if (!activeIdentityId) {
    return <AddIdentity />;
  }

  const switchTab = (newTab) => {
    navigation.setParams({ selectedScreen: newTab.label });
    setActiveTab(newTab);
  };
  
  return (
    <View style={Styles.flexBackground}>
      <activeTab.screen navigation={navigation} />
      {/* <BottomNavigation
        useLayoutAnimation={false}
        onTabPress={(newTab) => switchTab(newTab)}
        renderTab={renderTabItem}
        tabs={tabs}
        activeTab={activeTab.key}
        style={Styles.linkButtonColor}
      /> */}
    </View>
  );
};

export default Identity;

import React from 'react';
import {SafeAreaView, ScrollView} from 'react-native';
import {Divider, List} from 'react-native-paper';
import Styles from '../../../styles';
import {
  CONNECTED_SERVICE_DISPLAY_INFO,
  CONNECTED_SERVICES,
} from '../../../utils/constants/services';
import Colors from '../../../globals/colors';

export const ServicesOverviewRender = function () {
  const centralized = [];
  const decentralized = [];
  const {disabledServices} = this.props.activeAccount;

  CONNECTED_SERVICES.map((service, index) => {
    if (disabledServices[service]) {
      return;
    }

    const comp = (
      <React.Fragment key={index}>
        <List.Item
          titleStyle={{
            color:this.props.darkMode?Colors.secondaryColor:'black'
          }}
          title={CONNECTED_SERVICE_DISPLAY_INFO[service].title}
          description={CONNECTED_SERVICE_DISPLAY_INFO[service].description}
          descriptionStyle={{
            color:this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor
          }}
          onPress={() => this.openService(service)}
          right={props => (
            <List.Icon {...props} 
            color={this.props.darkMode?Colors.secondaryColor:Colors.defaultGrayColor}
            icon={'chevron-right'} size={20} />
          )}
        />
        <Divider 
        style={{
          backgroundColor:this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor
        }}
        />
      </React.Fragment>
    );

    if (CONNECTED_SERVICE_DISPLAY_INFO[service].decentralized) {
      decentralized.push(comp);
    } else {
      centralized.push(comp);
    }
  });

  return (
    <SafeAreaView style={[
      Styles.defaultRoot,
      {
        backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor
      }
    ]}>
      <ScrollView style={Styles.fullWidth}>
        <Divider 
        style={{
          backgroundColor:this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor
        }}
        />
        {decentralized.length > 0 && (
          <React.Fragment>
            <List.Subheader
            style={{
              color:this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor
            }}
            >{'Decentralized'}</List.Subheader>
            <Divider 
            style={{
              backgroundColor:this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor
            }}
            />
          </React.Fragment>
        )}
        {decentralized}
        {centralized.length > 0 && (
          <React.Fragment>
            <List.Subheader
            style={{
              color:this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor
            }}
            >{'Centralized'}</List.Subheader>
            <Divider 
            style={{
              backgroundColor:this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor
            }}
            />
          </React.Fragment>
        )}
        {centralized}
      </ScrollView>
    </SafeAreaView>
  );
};

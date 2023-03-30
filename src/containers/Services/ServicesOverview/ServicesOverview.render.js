import React from 'react';
import {SafeAreaView, ScrollView} from 'react-native';
import {Divider, List} from 'react-native-paper';
import Styles from '../../../styles';
import {
  CONNECTED_SERVICE_DISPLAY_INFO,
  CONNECTED_SERVICES,
} from '../../../utils/constants/services';

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
          title={CONNECTED_SERVICE_DISPLAY_INFO[service].title}
          description={CONNECTED_SERVICE_DISPLAY_INFO[service].description}
          onPress={() => this.openService(service)}
          right={props => (
            <List.Icon {...props} icon={'chevron-right'} size={20} />
          )}
        />
        <Divider />
      </React.Fragment>
    );

    if (CONNECTED_SERVICE_DISPLAY_INFO[service].decentralized) {
      decentralized.push(comp);
    } else {
      centralized.push(comp);
    }
  });

  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <Divider />
        {decentralized.length > 0 && (
          <React.Fragment>
            <List.Subheader>{'Decentralized'}</List.Subheader>
            <Divider />
          </React.Fragment>
        )}
        {decentralized}
        {centralized.length > 0 && (
          <React.Fragment>
            <List.Subheader>{'Centralized'}</List.Subheader>
            <Divider />
          </React.Fragment>
        )}
        {centralized}
      </ScrollView>
    </SafeAreaView>
  );
};

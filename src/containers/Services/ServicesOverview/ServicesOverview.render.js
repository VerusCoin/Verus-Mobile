import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List } from "react-native-paper";
import Styles from "../../../styles";
import {
  CONNECTED_SERVICE_DISPLAY_INFO,
  CONNECTED_SERVICES,
} from "../../../utils/constants/services";

export const ServicesOverviewRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <Divider />
        {CONNECTED_SERVICES.map((service, index) => {
          return (
            <React.Fragment key={index}>
              <List.Item
                title={CONNECTED_SERVICE_DISPLAY_INFO[service].title}
                description={
                  CONNECTED_SERVICE_DISPLAY_INFO[service].description
                }
                onPress={() => this.openService(service)}
                right={(props) => (
                  <List.Icon {...props} icon={"chevron-right"} size={20} />
                )}
              />
              <Divider />
            </React.Fragment>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

import React from "react";
import { SafeAreaView, ScrollView, View } from "react-native";
import { Divider, List, Button, Text } from "react-native-paper";

import Styles from "../../../styles";

import Colors from '../../../globals/colors';

export const PersonalSelectDataRender = function (props) {

  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView
        style={Styles.fullWidth}
        contentContainerStyle={Styles.focalCenter}>
        <View style={Styles.fullWidth}>

          <Text style={{ fontSize: 20, textAlign: 'center', paddingBottom:20 }}>
            Agree to share the following personal data.
          </Text>
          {this.state.catagoriesRequested && Object.values(this.state.catagoriesRequested).map(request => {
            return (
              <React.Fragment >
                <List.Item
                  title={request.title}
                  description={ <Text style={{color: request.color}}> {request.details}</Text>}
                  onPress={this.state.loading ? () => { } : () => this.openAttributes(request.navigateTo)}
                  right={(props) => <List.Icon {...props} icon={"select-group"} size={20} />}
                />
                <Divider />
              </React.Fragment>

            );
          })}
 

        </View>
      </ScrollView>
        <View
          style={{
            ...Styles.fullWidthBlock,
            paddingHorizontal: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            display: 'flex',
          }}>
          <Button
            color={Colors.warningButtonColor}
            style={{ width: 148 }}
            onPress={() => this.cancel()}>
            Cancel
          </Button>
          <Button
            color={this.state.ready ? Colors.verusGreenColor : Colors.lightGrey}
            style={{ width: 148 }}
            onPress={() => this.handleContinue()}>
            Accept
          </Button>
        </View>
    </SafeAreaView>
  );
};

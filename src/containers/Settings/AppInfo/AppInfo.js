/*
  This component is simply to display the app version data and 
  mobile platform to the user. It is more for debugging or support purposes,
  and any general, non-sensitive, useful information that would help a dev
  help a user should go here.
*/

import React, { Component } from "react";
import {
  ScrollView, 
  Platform, 
  TouchableOpacity,
  SafeAreaView
} from "react-native";
import { List, Divider, Text } from 'react-native-paper'
import Styles from '../../../styles/index'
import { APP_VERSION } from '../../../../env/index'
import { openUrl } from "../../../utils/linking";

const DISCORD_URL = "https://www.verus.io/discord"
const REDDIT_URL = "https://www.reddit.com/r/VerusCoin/"
const GITHUB_URL = "https://github.com/VerusCoin/"
const PRIVACY_URL = "https://github.com/VerusCoin/Verus-Mobile/blob/master/PRIVACY.txt"
const LICENCE_URL = "https://github.com/VerusCoin/Verus-Mobile/blob/master/LICENCE"

class AppInfo extends Component {
  render() {
    return (
      <SafeAreaView style={Styles.defaultRoot}>
        <ScrollView style={Styles.fullWidth}>
          <List.Subheader>{"Information"}</List.Subheader>
          <Divider />
          <List.Item
            title={"App Version"}
            right={() => (
              <Text style={Styles.listItemTableCell}>{APP_VERSION}</Text>
            )}
          />
          <Divider />
          <List.Item
            title={"Platform"}
            right={() => (
              <Text style={Styles.listItemTableCell}>{Platform.OS}</Text>
            )}
          />
          <Divider />
          <List.Item
            title={"Platform Version"}
            right={() => (
              <Text style={Styles.listItemTableCell}>
                {Platform.Version}
              </Text>
            )}
          />
          <Divider />
          <List.Subheader>{"Documentation"}</List.Subheader>
          <Divider />
          <TouchableOpacity onPress={() => openUrl(PRIVACY_URL)}>
            <List.Item
              title={"Privacy"}
              description={"How Verus Mobile handles privacy"}
              right={(props) => (
                <List.Icon {...props} icon={"open-in-new"} size={20} />
              )}
            />
            <Divider />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openUrl(LICENCE_URL)}>
            <List.Item
              title={"Licence"}
              description={"How Verus Mobile is licensed"}
              right={(props) => (
                <List.Icon {...props} icon={"open-in-new"} size={20} />
              )}
            />
            <Divider />
          </TouchableOpacity>
          <List.Subheader>{"Community & News"}</List.Subheader>
          <Divider />
          <TouchableOpacity onPress={() => openUrl(DISCORD_URL)}>
            <List.Item
              title={"Discord"}
              description={"The Verus community Discord"}
              right={(props) => (
                <List.Icon {...props} icon={"open-in-new"} size={20} />
              )}
            />
            <Divider />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openUrl(REDDIT_URL)}>
            <List.Item
              title={"Reddit"}
              description={"The Verus subreddit"}
              right={(props) => (
                <List.Icon {...props} icon={"open-in-new"} size={20} />
              )}
            />
            <Divider />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openUrl(GITHUB_URL)}>
            <List.Item
              title={"GitHub"}
              description={"The Verus Coin GitHub"}
              right={(props) => (
                <List.Icon {...props} icon={"open-in-new"} size={20} />
              )}
            />
            <Divider />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

export default AppInfo;
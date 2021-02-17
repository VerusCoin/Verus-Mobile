/*
  This component is simply to display the app version data and 
  mobile platform to the user. It is more for debugging or support purposes,
  and any general, non-sensitive, useful information that would help a dev
  help a user should go here.
*/

import React, { Component } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  Platform, 
  TouchableOpacity,
  Image,
  Linking,
  SafeAreaView
} from "react-native";
import { List, DataTable, Divider } from 'react-native-paper'
import Styles from '../../../styles/index'
import { APP_VERSION, VERUS_QR_VERSION } from '../../../../env/main.json'
import { CoinLogos } from "../../../utils/CoinData/CoinData";

const DISCORD_URL = "https://discord.gg/VRKMP2S"
const REDDIT_URL = "https://www.reddit.com/r/VerusCoin/"
const TWITTER_URL = "https://twitter.com/VerusCoin"
const PRIVACY_URL = "https://github.com/VerusCoin/Verus-Mobile/blob/master/PRIVACY.txt"
const LICENCE_URL = "https://github.com/VerusCoin/Verus-Mobile/blob/master/LICENCE"
const LOGO_DIR = require('../../../images/customIcons/Verus.png');

class AppInfo extends Component {

  openUrl = (url) => { 
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log("Don't know how to open URI: " + url);
      }
    });
  }

  render() {
    return (
      <SafeAreaView style={Styles.defaultRoot}>
        <ScrollView style={Styles.fullWidthBlock} contentContainerStyle={{ paddingBottom: 16 }}>
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
          <List.Item
            title={"VerusQR Version"}
            right={() => (
              <Text style={Styles.listItemTableCell}>
                {VERUS_QR_VERSION}
              </Text>
            )}
          />
          <Divider />
          <List.Subheader>{"Documentation"}</List.Subheader>
          <Divider />
          <TouchableOpacity onPress={() => this.openUrl(PRIVACY_URL)}>
            <List.Item
              title={"Privacy"}
              description={"How Verus Mobile handles privacy"}
              right={(props) => (
                <List.Icon {...props} icon={"open-in-new"} size={20} />
              )}
            />
            <Divider />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => this.openUrl(LICENCE_URL)}>
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
          <TouchableOpacity onPress={() => this.openUrl(DISCORD_URL)}>
            <List.Item
              title={"Discord"}
              description={"The Verus community Discord"}
              right={(props) => (
                <List.Icon {...props} icon={"open-in-new"} size={20} />
              )}
            />
            <Divider />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => this.openUrl(REDDIT_URL)}>
            <List.Item
              title={"Reddit"}
              description={"The Verus subreddit"}
              right={(props) => (
                <List.Icon {...props} icon={"open-in-new"} size={20} />
              )}
            />
            <Divider />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => this.openUrl(TWITTER_URL)}>
            <List.Item
              title={"Twitter"}
              description={"The Verus Coin Foundation Twitter account"}
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
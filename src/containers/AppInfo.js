import React, { Component } from "react";
import { 
  View, 
  StyleSheet, 
  Text, 
  ScrollView, 
  Platform, 
  TouchableOpacity,
  Image,
  Linking
} from "react-native";

const DISCORD_URL = "https://discord.gg/VRKMP2S"
const REDDIT_URL = "https://www.reddit.com/r/VerusCoin/"
const TWITTER_URL = "https://twitter.com/VerusCoin"
const PRIVACY_URL = "https://github.com/VerusCoin/Verus-Mobile/blob/master/PRIVACY.txt"
const LICENCE_URL = "https://github.com/VerusCoin/Verus-Mobile/blob/master/LICENCE"
const LOGO_DIR = require('../images/customIcons/verusHeaderLogo.png');

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
    return(
      <ScrollView style={styles.root} contentContainerStyle={{alignItems: "center", justifyContent: "center"}}>
        <Image
          style={{width: 50, height: 50, marginTop: 10}}
          source={LOGO_DIR}
        />
        <Text style={styles.verifiedLabel}>Verus Mobile</Text>
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>App Version:</Text>
              <Text style={styles.infoText}>{global.APP_VERSION}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Platform:</Text>
              <Text style={styles.infoText}>{Platform.OS}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>VerusQR Version:</Text>
              <Text style={styles.infoText}>{global.VERUS_QR_VERSION}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Docs:</Text>
              <View style={styles.linkBox}>
              <TouchableOpacity onPress={() => this.openUrl(PRIVACY_URL)}>
                <Text style={styles.linkText}>Privacy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => this.openUrl(LICENCE_URL)}>
                <Text style={styles.linkText}>Licence</Text>
              </TouchableOpacity>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Contact:</Text>
              <View style={styles.linkBox}>
                <TouchableOpacity onPress={() => this.openUrl(DISCORD_URL)}>
                  <Text style={styles.linkText}>
                    Discord
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => this.openUrl(REDDIT_URL)}>
                    <Text style={styles.linkText}>
                      Reddit
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => this.openUrl(TWITTER_URL)}>
                    <Text style={styles.linkText}>
                      Twitter
                    </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>     
      </ScrollView>
    )
  }
}

export default AppInfo;

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
  },
  infoBox: {
    flex: 1,
    flexDirection: 'column',
    alignSelf: 'center',
    justifyContent: 'flex-start',
    width: "85%",
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 10
  },
  infoText: {
    fontSize: 16,
    color: "#E9F1F7"
  },
  linkBox: {
    width: "65%",
  },
  linkText: {
    fontSize: 16,
    color: "#2E86AB",
    textAlign: "right"
  },
  /*warningText: {
    fontSize: 16,
    color: "#E9F1F7",
    width: "70%",
    textAlign: "center"
  },
  rect: {
    height: 1,
    width: 360,
    backgroundColor: "rgb(230,230,230)"
  },
  loadingLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 15,
    marginBottom: 15,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },*/
  verifiedLabel: {
    marginTop: 10,
    marginBottom: 15,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },/*
  explorerBtn: {
    backgroundColor: "rgba(68,152,206,1)",
    flex: 1,
    paddingTop: 6,
    paddingBottom: 6,
    marginTop: 10,
    alignSelf: "center",
  },
  cancelBtn: {
    width: 104,
    height: 45,
    backgroundColor: "rgba(206,68,70,1)",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  confirmBtn: {
    width: 104,
    height: 45,
    backgroundColor: "#009B72",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  buttonContainer: {
    height: 54,
    width: "100%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 0,
    paddingTop: 5,
    marginBottom: 8,
    marginTop: 8,
    left: "0%"
  },
  overBox: {
    width: "100%",
    height: "100%",
  },
  titleLabel: {
    backgroundColor: "transparent",
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7",
  },
  description: {
    backgroundColor: "transparent",
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7",
  },
  */
});
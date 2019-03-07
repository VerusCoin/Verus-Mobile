/*
  This component is meant to display information about a 
  user that could help with debugging. 
*/

import React, { Component } from "react";
import { 
  View, 
  StyleSheet, 
  Text, 
} from "react-native";
import { Icon } from "react-native-elements"
import { connect } from 'react-redux';

class ProfileInfo extends Component {
  render() {
    return(
      <View style={styles.root}>
        <View style={{width: "100%", height: "100%"}}>
          <Icon style={styles.Icon} size={50} color="#E9F1F7" name={"account-circle"} />
          <Text style={styles.profileLabel}>Profile Details</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>Name:</Text>
                <Text style={styles.infoText}>{this.props.activeAccount.id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>Active Coins:</Text>
                <Text style={styles.infoText}>{this.props.activeCoinsForUser.length}</Text>
              </View>
            </View>  
          </View>   
      </View>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    activeCoinsForUser: state.coins.activeCoinsForUser
  }
};

export default connect(mapStateToProps)(ProfileInfo);

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center"
  },
  infoBox: {
    flex: 1,
    flexDirection: 'column',
    alignSelf: 'center',
    justifyContent: 'flex-start',
    width: "85%",
  },
  Icon: {
    marginTop: 10,
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  infoText: {
    fontSize: 16,
    color: "#E9F1F7",
  },
  profileLabel: {
    marginTop: 10,
    marginBottom: 15,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7",
  }
});
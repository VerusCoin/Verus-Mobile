/*
  This component is for displaying a list of all the default coins
  that the user can add to their wallet. These coins should come 
  available with the wallet download and do not need to be added by
  qr.
*/

import React, { Component } from "react";
import { SearchBar, ListItem } from "react-native-elements";
import { View, FlatList, TouchableOpacity, Alert } from "react-native";
import { connect } from 'react-redux';
import styles from './AddCoin.styles'
import Colors from '../../globals/colors';

import {
  defaultAssetsPath,
  namesList,
  findCoinObj
} from '../../utils/CoinData';

class AddCoin extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: true,      
      error: null,    
    };
    //this.arrayholder = [];
  }

  /*componentDidMount() {
    this.arrayholder = coinsList;
  }*/

  componentWillUnmount() {
    if (this.props.navigation.state.params && this.props.navigation.state.params.refresh) {
      this.props.navigation.state.params.refresh()
    }
  }

  renderHeader = () => {    
    return (      
      <SearchBar        
        placeholder="Type Here..."                    
        onChangeText={text => this.searchFilterFunction(text)}
        autoCorrect={false}             
      />    
    );  
  };

  _openDetails = (item) => {  
    let navigation = this.props.navigation 
    let coinData = {}
    
    try {
      coinData = findCoinObj(item, this.props.activeAccount.id)

      navigation.navigate("CoinDetails", {
        data: coinData
      });
    } catch (e) {
      Alert.alert("Error", e.message || "Unknown error");
    }
  };

  /*searchFilterFunction = text => {    
    const newData = this.arrayholder.filter(item => {      
      const itemData = `${item.id.toUpperCase()}   
      ${item.name.toUpperCase()}`;
       const textData = text.toUpperCase();
        
       return itemData.indexOf(textData) > -1;    
    });    
    this.setState({ dataFull: newData });  
  };*/

  onEndReached = () => {
    this.setState({ loading: false });
  }

  render() {
    return (
      <View style={styles.root}>
        <FlatList 
          style={styles.coinList}         
          data={namesList}
          onEndReached={this.onEndReached}
          onEndReachedThreshold={50}
          renderItem={({item}) => (
            <TouchableOpacity onPress={() => this._openDetails(item)}>
              <ListItem     
                roundAvatar                
                title={item}
                avatar={defaultAssetsPath.coinLogo[item.toLowerCase()]}
                containerStyle={styles.listItemContainer}
                titleStyle={{color: "black", fontFamily: 'Avenir'}}
                chevronColor={Colors.quinaryColor}
              />
            </TouchableOpacity>
          )}
          keyExtractor={item => item}                                   
        />       
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
}

export default connect(mapStateToProps)(AddCoin);



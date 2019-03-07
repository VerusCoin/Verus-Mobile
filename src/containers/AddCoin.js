/*
  This component is for displaying a list of all the default coins
  that the user can add to their wallet. These coins should come 
  available with the wallet download and do not need to be added by
  qr.
*/

import React, { Component } from "react";
import { SearchBar, ListItem } from "react-native-elements";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";

import {
  coinsList,
  assetsPath,
  namesList
} from '../utils/CoinData';

export default class AddCoin extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: true,      
      error: null,    
    };
    this.arrayholder = [];
  }

  componentDidMount() {
    this.arrayholder = coinsList;
  }

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
    navigation.navigate("CoinDetails", {
      data: item
    });
  };

  searchFilterFunction = text => {    
    const newData = this.arrayholder.filter(item => {      
      const itemData = `${item.id.toUpperCase()}   
      ${item.name.toUpperCase()}`;
       const textData = text.toUpperCase();
        
       return itemData.indexOf(textData) > -1;    
    });    
    this.setState({ dataFull: newData });  
  };

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
                  avatar={assetsPath.coinLogo[item.toLowerCase()]}
                  containerStyle={{ borderBottomWidth: 0 }}
                  titleStyle={{color: "#E9F1F7"}}
                />
              </TouchableOpacity>
            )}
            keyExtractor={item => item}                                   
          />       
        </View>
    );
  }
}


const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center"
  },
  coinList: {
    width: "100%",
  },
});

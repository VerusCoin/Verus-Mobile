import React, { Component } from "react";
import { Icon, SearchBar, ListItem } from "react-native-elements";
import { View, StyleSheet, Text, FlatList, TouchableOpacity } from "react-native";

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
            //ListHeaderComponent={this.renderHeader}                             
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

  /*foreground: {
    backgroundColor: 'rgba(0,0,0,0.5)'
  },

  foregroundTransparent: {
    backgroundColor: "transparent"
  },

  activeCoinAmountLabel: {
    backgroundColor: "transparent",
    opacity: 0.89,
    marginTop: 15,
    marginBottom: 15,
    paddingBottom: 0,
    paddingTop: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7",
    width: 359,
  },

  coinListLabel: {
    width: "100%",
    backgroundColor: "#E9F1F7",
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 0,
    paddingBottom: 15,
    paddingTop: 15,
    fontSize: 22,
    textAlign: "center",
    color: "#232323"
  },
  rect: {
    height: 1,
    width: 360,

    backgroundColor: "rgb(230,230,230)"
  },
  homeButton: {
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

  receiveBtn: {
    width: 222.32,
    height: 45,
    backgroundColor: "rgba(63,135,182,1)",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  icon: {
    backgroundColor: "transparent",
    color: "grey",
    fontSize: 40,
    height: 46,
    width: 397
  },
  addCoinIcon: {
    marginTop: 35
  },
  */
  coinList: {
    width: "100%",
  },
  /*
  z5erm7: {
    height: 568,
    flexDirection: "column",
    alignSelf: "stretch",
    backgroundColor: "#E6E6E6",
    borderWidth: 0,
    borderColor: "green",
    borderStyle: "dashed"
  },
  jiPwUz: {
    width: 401,
    height: 568,
    backgroundColor: "#E9F1F7"
  },
  addCoinLabel: {
    width: 244,
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 10,
    marginBottom: 15,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  }
  */
});

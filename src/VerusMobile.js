import React from "react";
import { YellowBox, TouchableWithoutFeedback, Keyboard, Alert } from "react-native";
import { RootNavigator } from './utils/navigation/index';
import { fetchUsers, loadServerVersions } from './actions/actionCreators';
import { connect } from 'react-redux';


class VerusMobile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true   
    };
    
    YellowBox.ignoreWarnings([
      "Warning: componentWillMount is deprecated",
      "Warning: componentWillReceiveProps is deprecated",
      "Warning: componentWillUpdate is deprecated"
    ]);
  }
  
  componentDidMount() {
    fetchUsers()
    .then((usersAction) => {
      this.props.dispatch(usersAction);
      return loadServerVersions()
    })
    .then((serversAction) => {
      this.props.dispatch(serversAction);
      this.setState({ loading: false });
    })
    .catch((err) => {
      Alert.alert("Error", err.message)
    })
  }

  render() {
    const Layout = RootNavigator(
      this.props.accountsLength > 0, 
      this.state.loading, 
      this.props.signedIn);
    
    return(
       <Layout />
    );
  }
}

//TODO: Connect this correctly instead of relying on individual cases
const DismissKeyboard = ({children}) => (
  <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    {children}
  </TouchableWithoutFeedback>
);

const mapStateToProps = (state) => {
  return {
    accountsLength: state.authentication.accounts.length,
    signedIn: state.authentication.signedIn,
  }
};

export default connect(mapStateToProps)(VerusMobile);

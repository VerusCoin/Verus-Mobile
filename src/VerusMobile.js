import React from "react";
import { YellowBox, TouchableWithoutFeedback, Keyboard } from "react-native";
import { RootNavigator } from './utils/navigation/index';
import { fetchUsers, fetchActiveCoins } from './actions/actionCreators';
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
    .then((action) => {
      this.props.dispatch(action);
      return fetchActiveCoins();
    })
    .then((action) => {
      this.props.dispatch(action);
      this.setState({ loading: false });
    })
  }

  render() {
    const Layout = RootNavigator(
      this.props.accounts.length > 0, 
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
    accounts: state.authentication.accounts,
    signedIn: state.authentication.signedIn,
  }
};

export default connect(mapStateToProps)(VerusMobile);

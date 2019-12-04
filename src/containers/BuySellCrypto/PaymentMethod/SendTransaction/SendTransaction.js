import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
    View,
    Text,
    ScrollView,
  } from 'react-native';
import { NavigationActions } from 'react-navigation';
import { sendTransaction } from '../../../../actions/actions/PaymentMethod/WyreAccount';
import Button1 from '../../../../symbols/button1';
import styles from './SendTransaction.styles';
import {
    getTransactions
} from '../../../../actions/actions/PaymentMethod/WyreAccount';
import {
    selectTransactionHistoryIsFetching,
    selectTransactionHistory
} from '../../../../selectors/paymentMethods';
import { ListItem } from "react-native-elements";
import Spinner from 'react-native-loading-spinner-overlay';

class SendTransaction extends Component {
    componentDidMount() {
        this.props.getTransactions();
    }


    handleConfirm = () => {
        this.props.sendTransaction(
            this.props.navigation.state.params.paymentMethod.name,
            this.props.navigation.state.params.fromCurr,
            this.props.navigation.state.params.fromVal,
            this.props.navigation.state.params.toCurr,
            this.props.navigation,
        );
    }

    back = () => {
        this.props.navigation.dispatch(NavigationActions.back());
    }

    render() {
        return(
            <View style={styles.root}>
                <View style={styles.containerConfirmTransaction}>
                    <View style={styles.containerTransactionInfo}>
                        <Text style={styles.textStyle}>
                            {`Payment method: ${this.props.navigation.state.params.paymentMethod.name}`}
                        </Text>
                        <Text style={styles.textStyle}>
                            {
                                `From ${this.props.navigation.state.params.fromVal} "${this.props.navigation.state.params.fromCurr}"`
                            }
                        </Text>
                        <Text style={styles.textStyle}>
                            {
                                `To ${this.props.navigation.state.params.toVal} "${this.props.navigation.state.params.toCurr}"`
                            }
                        </Text>
                    </View>    
                    <View style={styles.buttonContainer}>
                        <Button1
                            style={styles.saveChangesButton}
                            buttonContent="Confirm"
                            onPress={this.handleConfirm}
                        />
                        <Button1
                            style={styles.backButton}
                            buttonContent="Cancel"
                            onPress={this.back}
                        />
                    </View>
                </View>
                <Text style={styles.textTransactionHistory}>Transaction history:</Text>
                <ScrollView>
                <Spinner
                    visible={this.props.isTransactionHistoryFetching}
                    textContent="Loading..."
                    textStyle={{ color: '#FFF' }}
                />
                    <View style={styles.containerTransactionHistory} >
                        {
                            this.props.history && this.props.history.data && this.props.history.data.map((item) => (
                                <View key={item.id}>
                                    <ListItem
                                        title={`From ${item.sourceAmount} ${item.sourceCurrency}`}
                                        titleStyle={styles.itemTextTransactionHistory}
                                        subtitle={`To ${item.destAmount} ${item.destCurrency}`}
                                        subtitleStyle={styles.itemTextTransactionHistory}
                                        rightTitle={new Date(item.createdAt).toISOString().split('.')[0]}
                                        rightTitleStyle={styles.itemTextTransactionHistory}
                                        hideChevron
                                        containerStyle={styles.itemContainerTransactionHistory}
                                    />
                                    <ListItem 
                                        title={item.id} 
                                        titleStyle={styles.itemIdTransactionHistory}
                                        hideChevron
                                        rightTitle={item.status}
                                        rightTitleStyle={styles.rightTitleStyle}
                                    />
                                </View>
                            ))
                            
                        }
                    </View>
                </ScrollView>
            </View>
        );
    }
}

const mapStateToProps = (state) => ({
    activeAccount: state.authentication.activeAccount,
    isTransactionHistoryFetching: selectTransactionHistoryIsFetching(state),
    history: selectTransactionHistory(state)
  });
  

const mapDispatchToProps = ({
    sendTransaction,
    getTransactions
  });


export default connect(mapStateToProps, mapDispatchToProps)(SendTransaction)
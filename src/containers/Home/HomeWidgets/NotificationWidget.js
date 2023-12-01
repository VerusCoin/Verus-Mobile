import React, { useState, useEffect, useRef } from 'react';
import { View, Dimensions, TouchableOpacity, Alert, Text } from 'react-native';
import { Card, Paragraph, Button, IconButton } from 'react-native-paper';
import { useSelector } from 'react-redux';
import Colors from '../../../globals/colors';
import { NOTIFICATION_TYPE_VERUSID_READY, NOTIFICATION_MESSAGES } from '../../../utils/constants/notifications';
import { deleteProvisionedIds, deleteAllProvisionedIds } from '../../../actions/actions/services/dispatchers/verusid/verusid';
import { updateVerusIdNotifications } from "../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager"
import { VerusIdAtIcon, ReceivedIcon } from "../../../images/customIcons";
import { tryProcessVerusIdSignIn } from '../../Services/ServiceComponents/VerusIdService/VerusIdLogin';

// has the state changed hook
const useCompare = (val) => {
    const prevVal = usePrevious(val)
    return prevVal !== val
}

// Helper hook
const usePrevious = (value) => {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
}

const createNotificationText = (verusIdName, type) => {

    return (
        <View
            style={{
                display: 'flex',
                flexDirection: 'row',
                width: "60%",
                alignItems: 'center',
            }}>
            <VerusIdAtIcon
                width={20}
                height={20}
                style={{
                    alignSelf: 'center',
                }} />
            <Paragraph style={{ fontSize: 12, color: Colors.primaryColor, fontWeight: 'bold', marginLeft: 10, marginVertical: 5, borderRadius: 1, }}>
                {`${verusIdName.split('.')[0]}@ `}
            </Paragraph>
            <Paragraph style={{ fontSize: 12, color: "black", marginVertical: 5, borderRadius: 1, }}>
                {NOTIFICATION_MESSAGES[type]}
            </Paragraph>
        </View>
    )
}

const actionType = (type, props, data) => {
    try {
        switch (type) {
            case NOTIFICATION_TYPE_VERUSID_READY:
                tryProcessVerusIdSignIn(props, data.loginRequest, data.redirect);
                break;
            case NOTIFICATION_TYPE_RECEIVED:
            default:
                break;
        }
    } catch (e) {
        Alert.alert("Error", e.message);    
    }
}

const getVerusIdNotifications = (pendingIds, props) => {

    let tempNotificaions = [];
    const idKeys = Object.keys(pendingIds);
    idKeys.forEach((coinId) => {

        const keys = Object.keys(pendingIds[coinId]);
        for (const key of keys) {
            if (pendingIds[coinId][key].status === NOTIFICATION_TYPE_VERUSID_READY)
                   tempNotificaions.push({
                    title: createNotificationText(pendingIds[coinId][key].fqn, NOTIFICATION_TYPE_VERUSID_READY),
                    iaddress: key,
                    coinId: coinId,
                    actionName: "log in",
                    action: () => actionType(NOTIFICATION_TYPE_VERUSID_READY, props, pendingIds[coinId][key]),
                    type: NOTIFICATION_TYPE_VERUSID_READY,
                });
        }
    })
    return tempNotificaions;
}

const getCollapedIcon = (type, index) => {

    switch (type) {
        case NOTIFICATION_TYPE_VERUSID_READY:
            return (<VerusIdAtIcon
                key={index}
                width={20}
                height={20}
                marginLeft={7}
                style={{
                    alignSelf: 'center',
                }} />);

        case NOTIFICATION_TYPE_RECEIVED:
        default:
            return (<ReceivedIcon
                key={index}
                width={20}
                height={20}
                marginLeft={7}
                style={{
                    alignSelf: 'center',
                }} />);
    }
}

const NotificationWidget = ( { props } = props) => {
    const { width } = Dimensions.get('window');
    const [notifications, setnotifications] = useState([]);
    const [collapsed, setCollapsed] = useState(false);
    const pendingIds = useSelector(state =>
        state.channelStore_verusid.pendingIds
    );

    const hasItemIdChanged = useCompare(pendingIds);

    const removeNotification = async (iaddress) => {
        for (const coinId of Object.keys(pendingIds)) {
            if (pendingIds[coinId][iaddress]) {
                await deleteProvisionedIds(iaddress, coinId);
                await updateVerusIdNotifications();
                break;
            }
        }
    }

    const removeAllNotification = async () => {
        await deleteAllProvisionedIds();
        await updateVerusIdNotifications();
        setCollapsed(false);
    }

    // Add more notification types here TODO: Recieved payment notifications.
    useEffect(() => {
        if (pendingIds !== null) {
            setnotifications(getVerusIdNotifications(pendingIds, props));
        }

    }, [hasItemIdChanged])


    if (notifications.length === 0) {
        return (<View />);
    }

    return (
        <View
            style={{
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'visible',
                padding: 10,
            }}>
            <Card
                style={{
                    width: width - 20,
                    borderRadius: 10,
                    backgroundColor: '#F1F1F1'
                }}
                mode="elevated"
                elevation={5}>
                <Card.Content>
                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            width: width - 30,
                            height: 10,
                            alignItems: 'center',
                            marginBottom: collapsed ? 0 : 15,
                        }}>
                        <View style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                            <View
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#56B73E',  // Set the background color to green
                                    borderRadius: 5,  // Set the border radius for rounded corners
                                    height: 24,  // Set the height
                                    width: 55,  // Set the width
                                    marginRight: 2
                                }}>
                                <IconButton
                                    icon="bell"
                                    color="white"
                                    size={15}
                                    style={{ marginRight: 3 }}
                                />
                                <View style={{ justifyContent: 'center', alignItems: 'center', borderColor: 'white', borderWidth: 1, borderRadius: 15, width: 16, height: 16 }}>
                                    <Text style={{ color: "white", textAlign: 'center', fontSize: 10 }}>
                                        {notifications.length}
                                    </Text>
                                </View>
                            </View>
                            {collapsed && notifications.map((notification, index) =>
                                getCollapedIcon(notification.type, index))}
                        </View>
                        <View style={{
                            display: 'flex',
                            flexDirection: 'row',

                        }}>
                            <TouchableOpacity
                                onPress={() => { removeAllNotification(); }}>
                                {!collapsed && <Paragraph style={{ fontSize: 12, textDecorationLine: 'underline', marginVertical: 17 }}>
                                    clear all
                                </Paragraph>}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => { setCollapsed(!collapsed) }}>
                                <IconButton
                                    icon={collapsed ? "chevron-down" : "chevron-up"}
                                    color="grey"
                                    size={28}
                                    style={{ marginRight: 10 }}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {!collapsed && notifications.map((notification, index) => {
                        return (
                            <View
                                key={index}
                                style={{
                                    display: 'flex',
                                    width: width - 30,
                                    height: 25,
                                    marginBottom: 5,
                                }}>
                                <View
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        width: width - 30,
                                        alignItems: 'center',
                                    }}>
                                    {notification.title}
                                    <View
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                        }}>
                                        <TouchableOpacity onPress={() => notification.action()}>
                                            <Paragraph style={{ fontSize: 12, color: "black", textDecorationLine: 'underline' }}>
                                                {notification.actionName}
                                            </Paragraph>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => removeNotification(notification.iaddress)}>
                                            <IconButton
                                                icon="close"
                                                color="grey"
                                                size={20}
                                                style={{ marginRight: 16, marginLeft: 12 }}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )
                    })}
                </Card.Content>
            </Card>
        </View>);
};

export default NotificationWidget;
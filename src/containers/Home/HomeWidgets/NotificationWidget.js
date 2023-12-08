import React, { useState, useEffect, useRef } from 'react';
import { View, Dimensions, TouchableOpacity, Alert, Text } from 'react-native';
import { Card, Paragraph, Button, IconButton } from 'react-native-paper';
import { useSelector } from 'react-redux';
import Colors from '../../../globals/colors';
import {
    NOTIFICATION_TYPE_BASIC,
    NOTIFICATION_TYPE_DEEPLINK,
    NOTIFICATION_TYPE_LOADING,
    NOTIFICATION_ICON_TX,
    NOTIFICATION_ICON_VERUSID,
    NOTIFICATION_ICON_ERROR
} from '../../../utils/constants/notifications';
import { VerusIdAtIcon, ReceivedIcon } from "../../../images/customIcons";
import { DeeplinkNotification, BasicNotification, LoadingNotification } from '../../../utils/notification';
import { tryProcessVerusIdSignIn } from '../../../containers/Services/ServiceComponents/VerusIdService/VerusIdLogin';
import { dispatchRemoveNotification, dispatchClearNotifications } from '../../../actions/actions/notifications/dispatchers/notifications';
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

const createNotificationText = (text, icon, index) => {

    return (
        <View
            style={{
                display: 'flex',
                flexDirection: 'row',
                width: "60%",
                alignItems: 'center',
            }}>
            {icon}
            <Paragraph style={{ fontSize: 12, color: Colors.primaryColor, fontWeight: 'bold', marginLeft: 10, marginVertical: 5, borderRadius: 1, }}>
                {typeof (text) === 'object' ? text[0] : ''}
            </Paragraph>
            <Paragraph style={{ fontSize: 12, color: "black", marginVertical: 5, borderRadius: 1, }}>
                {typeof (text) === 'object' ? text[1] : text}
            </Paragraph>
        </View>
    )
}

const getIcon = (type, index) => {

    switch (type) {
        case NOTIFICATION_ICON_VERUSID:
            return (<VerusIdAtIcon
                index={index}
                width={20}
                height={20}
                marginLeft={7}
                style={{
                    alignSelf: 'center',
                }} />);
        case NOTIFICATION_ICON_ERROR:
            return (<View
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#FF0000',
                    borderRadius: 20,
                    height: 20,
                    width: 20,
                    marginLeft: 7,
                }}><Text style={{ color: "white", textAlign: 'center', fontSize: 13, justifyContent: "center" }}>!</Text></View>);
        case NOTIFICATION_ICON_TX:
        default:
            return (<ReceivedIcon
                index={index}
                width={20}
                height={20}
                marginLeft={7}
                style={{
                    alignSelf: 'center',
                }} />);
    }
}

const getNotifications = (directories) => {

    let tempNotificaions = [];
    const keys = Object.keys(directories);

    keys.forEach((uid, index) => {

        if (directories[uid].type === NOTIFICATION_TYPE_DEEPLINK) {
            const tempDeepLinkNotification = DeeplinkNotification.fromJson(directories[uid], tryProcessVerusIdSignIn);
            tempDeepLinkNotification.icon = getIcon(directories[uid].icon, index);
            tempNotificaions.push(tempDeepLinkNotification);
        } else if (directories[uid].type === NOTIFICATION_TYPE_BASIC) {
            const tempBasicNotification = BasicNotification.fromJson(directories[uid]);
            tempBasicNotification.icon = getIcon(directories[uid].icon, index);
            tempNotificaions.push(tempBasicNotification);
        } else if (directories[uid].type === NOTIFICATION_TYPE_LOADING) {
            const tempLoadingNotification = LoadingNotification.fromJson(directories[uid]);
            tempLoadingNotification.icon = getIcon(directories[uid].icon, index);
            tempNotificaions.push(tempLoadingNotification);
        }
    });
    return tempNotificaions;
}

const NotificationWidget = ({ props } = props) => {
    const { width } = Dimensions.get('window');
    const [collapsed, setCollapsed] = useState(false);
    const [traynotifications, setTrayNotifications] = useState([]);
    const notifications = useSelector(state =>
        state.notifications
    );

    const hasItemIdChanged = useCompare(notifications);

    useEffect(() => {
        if (notifications.directory) {
            setTrayNotifications(getNotifications(notifications.directory));
        }

    }, [hasItemIdChanged])

    if (Object.keys(notifications.directory).length === 0) {
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
                                        {traynotifications.length}
                                    </Text>
                                </View>
                            </View>
                            {collapsed && traynotifications.map((notification) =>
                                notification.icon)}
                        </View>
                        <View style={{
                            display: 'flex',
                            flexDirection: 'row',

                        }}>
                            <TouchableOpacity
                                onPress={() => { dispatchClearNotifications(); }}>
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
                    {!collapsed && traynotifications.map((notification, index) => {
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
                                    {createNotificationText(notification.title, notification.icon, index)}
                                    <View
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                        }}>
                                        <TouchableOpacity onPress={() => notification.onAction(props)}>
                                            <Paragraph style={{ fontSize: 12, color: "black", textDecorationLine: 'underline' }}>
                                                {notification.body}
                                            </Paragraph>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => dispatchRemoveNotification(notification.uid)}>
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
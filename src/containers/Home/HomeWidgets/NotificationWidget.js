import React, { useState, useEffect, useRef } from 'react';
import { View, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { Card, Paragraph, Button, IconButton } from 'react-native-paper';
import { useSelector } from 'react-redux';
import Colors from '../../../globals/colors';
import { Icon } from "react-native-elements";
import { NOTIFICATION_TYPE_READY, NOTIFICATION_MESSAGES } from '../../../utils/constants/notifications';
import { getCoinLogo } from '../../../utils/CoinData/CoinData';
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

const getNotifications = (pendingIds) => {

    let tempNotificaions = [];
    const idKeys = Object.keys(pendingIds);
    idKeys.forEach((coinId) => {

        const keys = Object.keys(pendingIds[coinId]);
        for (const key of keys) {
            if (pendingIds[coinId][key].status !== NOTIFICATION_TYPE_READY)
                tempNotificaions.push({
                    title: `VerusID ${NOTIFICATION_MESSAGES[NOTIFICATION_TYPE_READY]}: ${pendingIds[coinId][key].decision.result.fully_qualified_name.split('.')[0]}@`,
                    iaddress: key,
                    coinId: coinId,
                    action: "Take action",
                    type: NOTIFICATION_TYPE_READY
                });
        }
    })
    return tempNotificaions;
}

const handleNotification = (notification) => {

    if(notification.type === NOTIFICATION_TYPE_READY) {

    } else {
        Alert.alert("This will complete the registration")
    }


}

const NotificationWidget = (props) => {
    const { width } = Dimensions.get('window');
    const [notifications, setnotifications] = useState([]);
    const pendingIds = useSelector(state =>
        state.channelStore_verusid.pendingIds
    );

    const Logo = getCoinLogo("VRSC", null, "dark");

    const hasItemIdChanged = useCompare(pendingIds);

    useEffect(() => {
        if (pendingIds !== null) {
            setnotifications(getNotifications(pendingIds));
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
                    height: 70 + notifications.length * 45,
                    width: width - 20,
                    borderRadius: 10,
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
                        }}>
                        <View
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}>
                            <Button icon="bell" mode="contained" dark={true} theme={{ colors: { primary: "#56B73E" } }} onPress={() => { }} style={{ background: "gray", height: 30, alignItems: 'center', }}>
                                <Paragraph style={{ fontSize: 16, color: "white", lineHeight: 16 }}>
                                    {notifications.length}
                                </Paragraph>
                            </Button>
                        </View>
                        <TouchableOpacity
                            onPress={() => { Alert.alert("This will clear items") }}
                        >
                            <View style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}>
                                <Paragraph style={{ fontSize: 16, color: "black", textDecorationLine: 'underline', marginVertical: 10, marginRight: 10 }}>
                                    clear all
                                </Paragraph>
                                <IconButton
                                    icon="chevron-up"
                                    color="white"
                                    size={15}
                                    style={{ backgroundColor: Colors.primaryColor, borderRadius: 50, marginRight: 20 }}
                                />
                            </View>
                        </TouchableOpacity>

                    </View>
                    {notifications.map((notification, index) => {
                        return (
                            <View
                                key={index}
                                style={{
                                    display: 'flex'
                                }}>
                                {(index > 0) && <View
                                    style={{
                                        borderBottomColor: 'lightgrey',
                                        borderBottomWidth: 1,
                                        width: '100%',
                                    }}
                                />}
                                <View
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        width: width - 30,
                                        alignItems: 'center'
                                    }}>
                                    <View
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            width: "60%",
                                            alignItems: 'center',
                                            marginVertical: 5
                                        }}>
                                        <Logo
                                            width={20}
                                            height={20}
                                            style={{
                                                alignSelf: 'center',
                                            }}
                                        />

                                        <Paragraph style={{ fontSize: 16, color: "black", marginLeft: 10, marginVertical: 10, borderRadius: 1, backgroundColor: 'white', }}>
                                            {`${notification.title}`}
                                        </Paragraph>
                                    </View>
                                    <TouchableOpacity onPress={() => { handleNotification(notification);  }}>
                                        <Paragraph style={{ fontSize: 16, color: "black", textDecorationLine: 'underline', marginVertical: 10, marginRight: 20 }}>
                                            {notification.action}
                                        </Paragraph>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )
                    })}
                </Card.Content>
            </Card>
        </View>);
};

export default NotificationWidget;
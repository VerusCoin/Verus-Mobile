import store from "../../../../store";
import { addNotification, clearAccountNotifications, clearNotifications, removeNotification, setNotifications } from "../creators/notifications";

export const dispatchAddNotification = (notification) => store.dispatch(addNotification(notification))

export const dispatchRemoveNotification = (uid) => store.dispatch(removeNotification(uid))

export const dispatchClearNotifications = () => store.dispatch(clearNotifications())

export const dispatchClearAccountNotifications = (acchash) => store.dispatch(clearAccountNotifications(acchash))

export const dispatchSetNotifications = (directory, accounts) => store.dispatch(setNotifications(directory, accounts))
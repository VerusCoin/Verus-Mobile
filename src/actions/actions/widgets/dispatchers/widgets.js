import store from "../../../../store";
import { clearAccountWidgets, removeWidget, setWidgets, addWidget } from "../creators/widgets";

export const dispatchAddWidget = (id, acchash) => store.dispatch(addWidget(id, acchash))

export const dispatchRemoveWidget = (id, acchash) => store.dispatch(removeWidget(id, acchash))

export const dispatchClearAccountWidgets = (acchash) => store.dispatch(clearAccountWidgets(acchash))

export const dispatchSetWidgets = (order) => store.dispatch(setWidgets(order))
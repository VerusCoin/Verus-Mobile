import {createSelector} from 'reselect';

const selectWidgetOrder = state => state.widgets.order;

export const selectWidgets = createSelector(
  [
    selectWidgetOrder
  ],
  (order) => {
    return {
      order
    };
  },
);

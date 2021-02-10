import * as React from "react";
import { Text, View } from "react-native";

import Carousel from "react-native-snap-carousel";

export default class SnapCarousel extends React.Component {
  constructor(props) {
    super(props);
  }

  _renderItem({ item, index }) {
    return (
      <View
        style={{
          backgroundColor: "floralwhite",
          borderRadius: 5,
          height: 250,
          padding: 50,
          marginLeft: 25,
          marginRight: 25,
        }}
      >
        <Text style={{ fontSize: 30 }}>{item.title}</Text>
        <Text>{item.text}</Text>
      </View>
    );
  }

  render() {
    const extraProps = this.props.carouselProps || {}
    return (
        <Carousel
          currentIndex={this.props.currentIndex}
          layout={"default"}
          style={this.props.style || {}}
          ref={(ref) => (this.carousel = ref)}
          data={this.props.items}
          sliderWidth={this.props.sliderWidth || 300}
          itemWidth={this.props.itemWidth || 300}
          renderItem={
            this.props.renderItem ? this.props.renderItem : this._renderItem
          }
          onSnapToItem={(index) => this.props.onSnapToItem(index)}
          {...extraProps}
        />
    );
  }
}

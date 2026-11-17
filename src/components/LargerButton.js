import React from 'react';
import { Button } from 'react-native-paper';

const TallButton = (props) => {
  return (
    <Button
      {...props}
      contentStyle={{
        height: 50,
        justifyContent: 'center',
        ...props.contentStyle,
      }}
    >
      {props.children}
    </Button>
  );
};

export default TallButton;
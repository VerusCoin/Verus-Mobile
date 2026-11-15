import React from 'react';
import Button from './Button';

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
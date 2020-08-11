import React from 'react';
import { TouchableOpacity } from 'react-native';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome5';

const AlphabeticalSort = (props) => {
  const { sortBy, setSortDirection } = props;

  if (sortBy === 'asc') {
    return (
      <TouchableOpacity onPress={() => setSortDirection('desc')}>
        <FontAwesomeIcon name="sort-alpha-down" size={20} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={() => setSortDirection('asc')}>
      <FontAwesomeIcon name="sort-alpha-up" size={20} />
    </TouchableOpacity>
  );
};

export default AlphabeticalSort;

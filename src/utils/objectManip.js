export const getKeyByValue = (value, object) => {
  for( var prop in object ) {
      if( object.hasOwnProperty( prop ) ) {
           if( object[ prop ] === value )
               return prop;
      }
  }
}

export const isJson = (item) => {
  item = typeof item !== "string"
      ? JSON.stringify(item)
      : item;

  try {
      item = JSON.parse(item);
  } catch (e) {
      return false;
  }

  if (typeof item === "object" && item !== null) {
      return true;
  }

  return false;
}
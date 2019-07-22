export const getKeyByValue = (value, object) => {
  for( var prop in object ) {
      if( object.hasOwnProperty( prop ) ) {
           if( object[ prop ] === value )
               return prop;
      }
  }

  return null
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

export const arraysEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
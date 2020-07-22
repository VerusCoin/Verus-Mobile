const updateStoredItems = (storedItems, updatedItems, type) => {
  const oldEntries = storedItems.filter(
    (storedItem) => !updatedItems[type].some(
      (updatedItem) => updatedItem.uid === storedItem.uid,
    ),
  );
  const updatedEntries = oldEntries.concat(updatedItems[type]);
  return updatedEntries;
};

export default updateStoredItems;

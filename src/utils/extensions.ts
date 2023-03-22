export { };

declare global {
  interface Array<T> {
    groupBy<K>(keyGetter: (item: T) => K): Map<K, T[]>;
  }
}

Array.prototype.groupBy = function (keyGetter) {
  const map = new Map();
  this.forEach(item => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return map;
}

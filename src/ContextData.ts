function ContextData<T extends object = {}>(init: T = {} as T): T {

  return new Proxy(init, {
    set(target: T, key: string | symbol, value: any): boolean {
      if (!target.hasOwnProperty(key)) {
        if (typeof value === 'function') {
          value = value(target);
        }
        target[key as keyof T] = value;
      }
      return true;
    },
  });
}

export default ContextData
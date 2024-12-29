class ContextData<T extends Object = {}> {
  context_name = '';
  private wm = new WeakMap();
  private key_map = new Map();
  private key_counter = 0;
  private data: { [key: string]: any } = {}

  constructor(init = {} as T, name: string = '') {
    this.data = init;
    this.context_name = name;
    console.log('created context data', name)
  }

  generate_key = (value: any) => {
    if (!this.key_map.has(value)) {
      this.key_map.set(value, { id: this.key_counter++ })
      // console.log('generated key', this.key_map.get(value))
    }
    return this.key_map.get(value);
  }

  set = (value: any) => {
    // const key = this.generate_key(value);
    // console.log(key)

    if (!this.wm.has(value)) {
      console.log('setted object', this.context_name)

      console.log(value)
      // if (typeof value === 'function') {
      //   value = value(this.data);
      // }
      this.wm.set(value, value)
    } else {
      return this.wm.get(value)
    }

  }
}


export default ContextData
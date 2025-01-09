import { log } from "utils";
import Parser from "./Parser";

type DefaultStartContext = Function & { $name: string };

class Context {

  default: DefaultStartContext = {} as DefaultStartContext;
  context: any = {};
  buffer: any = [];
  current: { name: string, props: any };

  constructor(public Parser: Parser) {

    this.buffer.push({
      name: 'Program',
      props: {}
    })

    this.current = this.buffer.at(-1);
  }

  start = (name: string, props: any = {}, instruction: any = {}, start_offset = 0) => {

    log('start context', `${name} at ${this.Parser.index - start_offset - 1};y`, props)
    this.buffer.push({ name, props })
    this.current = this.buffer.at(-1);
    // if (data.eat) {
    //   this.Parser.eat(data.eat);
    // }
  }

  end() {

  }

  load(name: string, config: any, start_context: DefaultStartContext) {
    if (config?.default) {

      start_context.$name = name;

      if (this.default) {
        log(`default context is "${name}", was "${this.default.$name}";y`)
      }
      this.default = start_context;
    }
    this.context[name] = {
      ...this.context[name],
      ...config
    }
  }
}

export default Context
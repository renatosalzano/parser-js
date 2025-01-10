import { log } from "utils";
import Parser from "./Parser";

type ContextObject = {
  name: string;
  default?: boolean;
  lexical: Map<string, any>;
  has: (lexical: string, updateContext?: any) => boolean;
}

class Context {

  default: ContextObject | null = null;
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

  load(context: ContextObject) {
    if (context?.default) {

      if (this.default) {
        log(`default context is "${context.name}", was "${this.default.name}";y`)
      }
      this.default = context;
    }
    this.context[context.name] = context;
  }
}

export default Context
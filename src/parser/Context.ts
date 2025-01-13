import { log } from "utils";
import Parser from "./Parser";

export type ContextObject = {
  name: string;
  default?: boolean;
  token: Map<string, any>;
  has: (token: string, updateContext?: any) => boolean;
  start(props?: { [key: string]: any }): void;
}

class Context {

  default = {} as ContextObject;
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
    const prev_context_name = this.buffer.at(-1).name;

    log('context', `${prev_context_name} -->;y`, name + ';g', props)
    this.buffer.push({ name, props })
    this.current = this.buffer.at(-1);
    // if (data.eat) {
    //   this.Parser.eat(data.eat);
    // }
    this.Parser.parse[name](props)
  }

  end = () => {
    if (this.buffer.length === 1) {
      log('END PROGRAM?;r')
      return;
    }
    const prev_context_name = this.buffer.at(-1).name;
    this.buffer.pop();
    this.current = this.buffer.at(-1);

    const ctx_name = this.current.name;
    log('context', `${ctx_name};g`, `<-- ${prev_context_name};y`);
    if (ctx_name === 'Program') {
      log('called Program;r')
      this.Parser.parse_program();
    } else {
      this.Parser.parse[this.current.name](this.current.props || {});
    }
  }

  load(context: ContextObject) {
    if (context?.default) {

      if (this.default) {
        log(`default context is "${context.name}", was "${this.default.name}";y`)
      }
      this.default = context as ContextObject;
    }
    this.context[context.name] = context;
  }
}

export default Context
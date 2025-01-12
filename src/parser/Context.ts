import { log } from "utils";
import Parser from "./Parser";

export type ContextObject = {
  name: string;
  default?: boolean;
  token: Map<string, any>;
  has: (token: string, updateContext?: any) => boolean;
}

type ContextObjectDefault = ContextObject & {
  defult: true;
  start(): void;
}

class Context {

  default = {} as ContextObjectDefault;
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
    const prev_context_name = this.buffer.at(-1).name;
    this.buffer.pop();
    this.current = this.buffer.at(-1);

    const ctx_name = this.current.name;
    log('context', `${ctx_name};g`, `<-- ${prev_context_name};y`);
    if (ctx_name === 'Program') {
      this.Parser.parse_program();
    } else {
      this.Parser.parse[this.current.name](this.current.props || {});
    }
  }

  load(context: ContextObject | ContextObjectDefault) {
    if (context?.default) {

      if (this.default) {
        log(`default context is "${context.name}", was "${this.default.name}";y`)
      }
      this.default = context as ContextObjectDefault;
    }
    this.context[context.name] = context;
  }
}

export default Context
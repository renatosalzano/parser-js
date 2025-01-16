import { log } from "utils";
import Tokenizer from "./Tokenizer";

export type ContextObject = {
  name: string;
  default?: boolean;
  token: Map<string, any>;
  has: (token: string, updateContext?: any) => boolean;
  start(props?: { [key: string]: any }, instruction?: { [key: string]: any }): any;
}

class Context {

  default = {} as ContextObject;
  ctx: { [key: string]: string } = {};
  context: any = {};
  buffer: any = [];
  current: { name: string, props: any };

  constructor(public Tokenizer: Tokenizer) {

    this.buffer.push({
      name: 'Program',
      props: {}
    })

    this.current = this.buffer.at(-1);
  }

  get_current = () => {
    return this.current.name;
  }

  start = (name: string, props: any = {}, instruction: any = {}, start_offset = 0) => {

    if (this.Tokenizer.end_program) {
      log('unexpected start context;r')
      return;
    }

    const prev_context_name = this.buffer.at(-1).name;

    log('context', `${prev_context_name} -->;y`, name + ';g', props)
    this.buffer.push({ name, props });

    this.current = { name, props };
    // if (data.eat) {
    //   this.Parser.eat(data.eat);
    // }
    this.Tokenizer.parse[name](props)
  }

  end = () => {

    if (this.Tokenizer.end_program || this.buffer.length === 1) {
      log('unexpected end context;r')
      return;
    }

    const prev_context_name = this.buffer.at(-1).name;
    this.buffer.pop();
    this.current = this.buffer.at(-1);

    const ctx_name = this.current.name;
    log('context', `${ctx_name};g`, `<-- ${prev_context_name};y`);
    if (ctx_name === 'Program') {
      this.Tokenizer.parse_program();
    } else {
      this.Tokenizer.parse[this.current.name](this.current.props || {});
    }
  }

  load(context: ContextObject) {
    if (context?.default) {

      if (this.default) {
        log(`default context is "${context.name}", was "${this.default.name}";y`)
      }
      this.default = context as ContextObject;
    }

    this.ctx[context.name.toLowerCase()] = context.name;
    this.context[context.name] = context;
  }
}

export default Context
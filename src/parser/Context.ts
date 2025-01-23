import { log } from "utils";
import Tokenizer from "./Tokenizer";

export type ContextObject = {
  name: string;
  props: { [key: string]: any };
  default?: boolean;
  token: Map<string, any>;
  has: (token: string) => boolean;
  end: () => void;
}


class Context {

  default = () => null;
  context: { [key: string]: ContextObject } = {};
  buffer: any = [];
  current: ContextObject;

  constructor(public Tokenizer: Tokenizer) {

    this.buffer.push({
      name: 'Program',
      props: {}
    })

    this.current = this.buffer.at(-1);
  }

  get_current = () => {
    return this.current;
  }

  start = (name: string, props: any = {}) => {

    if (this.Tokenizer.end_program) {
      log('unexpected start context;r')
      return;
    }

    const prev_context_name = this.buffer.at(-1).name;

    log('CTX:;c', `${prev_context_name} -->`, name + ';g', props)
    this.buffer.push(this.context[name]);

    this.current = this.buffer.at(-1);
    // if (data.eat) {
    //   this.Parser.eat(data.eat);
    // }
    return this.Tokenizer.parser[name](props);
  }

  end = (name: string) => {

    this.buffer.pop();
    this.current = this.buffer.at(-1);

    const ctx_name = this.current.name;

    log('CTX:;c', `${ctx_name};g`, `<-- ${name}`);
    // console.log('end at this token', this.Tokenizer.Token.value)
    if (ctx_name === 'Program') {
      this.Tokenizer.parse_program();
    }
  }


  extend = (context: any) => {

    const Tokenizer = this.Tokenizer;

    for (const name of Object.keys(context)) {

      const Context = context[name];

      if (!Context?.keyword && !Context?.token) {
        log(`invalid context ${name};r`);
        continue;
      }

      const key = Context.hasOwnProperty('keyword') ? 'keyword' : 'token';

      Context.token = new Map(Object.entries(Context[key]));
      Context.name = name;
      Context.props = Context.props || {};

      if (key === 'keyword') {

        const context_keyword: string[] = []

        for (const [token] of Context.token) {

          if (Tokenizer.is.alpha(token)) {
            if (!Tokenizer.keyword.has(token)) {
              // Parser.keyword.set(lexical, name);
              context_keyword.push(token)
            } else {
              Context.token.delete(token);
              log(`duplicate keyword "${token}", found in context: ${name};r`);
            }
          } else {
            Context.token.delete(token);
            log(`invalid "${token}", should be [a-z] found in context: ${name};r`);
          }
        }

        Tokenizer.extend_token('keyword', context_keyword);
      } else {
        delete Context.keyword;
      }

      // Function.has(sequence, { props: {}, eat: {}})
      Context.has = function (token: string) {
        return this.token.has(token);
      }

      Context.end = () => {
        return this.end(Context.name);
      }

      for (const [token] of Context.token) {
        Tokenizer.program.set(token, (props = {}) => {
          props = Context.token.get(token) || {};
          props = { ...Context.props, ...props };
          return this.start(name, props);
        })
      }

      if (context?.default) {
        if (this.default) {
          log(`default context is "${context.name}", was "${this.default.name}";y`)
        }
        this.default = (props = {}) => {
          props = Context.props;
          return this.start(name, props);
        };
      }

      Object.freeze(Context);

      this.context[name] = Context;
    } // end for

  }


}

export default Context
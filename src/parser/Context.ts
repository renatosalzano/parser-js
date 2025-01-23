import { log } from "utils";
import Tokenizer from "./Tokenizer";

export type ContextObject = {
  name: string;
  props: { [key: string]: any };
  default?: boolean;
  token: Map<string, any>;
  has: (token: string, parse?: boolean) => boolean;
  start: (props: any) => any;
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

  start = (name: string, props: any = {}) => {

    if (this.Tokenizer.end_program) {
      log('unexpected start parser;r')
      return;
    }

    log('Parsing:;c', name + ';g', props);
    // this.buffer.push(this.context[name]);

    // this.current = this.buffer.at(-1);

    return this.Tokenizer.parser[name](props);
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
      Context.has = function (token: string, parse?: boolean) {
        const check = this.token.has(token);
        if (check && parse) {
          let props = this.token.get(token) || {};
          Tokenizer.parser[this.name]({ ...this.props, ...props });
        }
        return this.token.has(token);
      }

      Context.start = (props = {}) => {
        props = { ...Context.props, ...props };

        console.log('CONTEXT', name, Context.props)
        return this.Tokenizer.parser[name](props);
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
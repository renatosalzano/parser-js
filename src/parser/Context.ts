import { log } from "utils";
import Tokenizer from "./Tokenizer";

export type ContextObject = {
  name: string;
  props: { [key: string]: any };
  default?: boolean;
  token: Map<string, any>;
  has: (token: string, updateContext?: any) => boolean;
  start(props?: { [key: string]: any }, instruction?: { [key: string]: any }): any;
  next(): void;
}


class Context {

  default = {} as ContextObject;
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

  start = (name: string, props: any = {}, instruction: any = {}) => {

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
    return this.Tokenizer.parse[name](props);
  }

  end = () => {

    const prev_context_name = this.buffer.at(-1).name;
    this.buffer.pop();
    this.current = this.buffer.at(-1);

    const ctx_name = this.current.name;

    log('CTX:;c', `${ctx_name};g`, `<-- ${prev_context_name}`);
    // console.log('end at this token', this.Tokenizer.Token.value)
    if (ctx_name === 'Program') {
      this.Tokenizer.parse_program();
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

  extend = (context: any) => {

    const Tokenizer = this.Tokenizer;

    const program_ctx = new Set<string>(context?.Program || []);
    const invalid_ctx = new Set<string>(program_ctx);

    delete context.Program;

    for (const name of Object.keys(context)) {

      const Context = context[name];

      if (!Context?.keyword && !Context?.token) {
        log(`invalid context ${name};r`);
        continue;
      }

      const key = Context.hasOwnProperty('keyword') ? 'keyword' : 'token';

      Context.token = new Map(Object.entries(Context[key]));
      Context.name = name;
      Context.props = Object.freeze(Context.props || {});

      if (key === 'keyword') {

        const context_keyword: string[] = []

        for (const [lexical] of Context.token) {

          if (Tokenizer.is.alpha(lexical)) {
            if (!Tokenizer.keyword.has(lexical)) {
              // Parser.keyword.set(lexical, name);
              context_keyword.push(lexical)
            } else {
              Context.token.delete(lexical);
              log(`duplicate keyword "${lexical}", found in context: ${name};r`);
            }
          } else {
            Context.token.delete(lexical);
            log(`invalid "${lexical}", should be [a-z] found in context: ${name};r`);
          }
        }

        Tokenizer.extend('keyword', context_keyword);
      } else {
        delete Context.keyword;
      }

      // Function.has(sequence, { props: {}, eat: {}})
      Context.has = function (token: string, updateContext?: boolean | any) {

        const check = this.token.has(token);
        if (check && updateContext !== undefined) {

          let { props = {}, ...instruction } = this.token.get(token) || {};

          if (updateContext.constructor === Object) {
            let { props: props_override = {}, ...instruction_override } = updateContext || {};
            props = props_override;
            instruction = instruction_override;
          }

          props = { ...this.props, ...props }

          Tokenizer.Context.start(name, props, instruction);
        }

        return check;
      }

      Context.start = function (props?: any, instruction?: any) {
        const token = Tokenizer.Token.value;
        props = props || this.token.get(token)?.props || {};
        props = { ...this.props, ...props };

        return Tokenizer.Context.start(name, props, instruction);
      }


      if (program_ctx.has(name)) {
        for (const [lexical] of Context.token) {
          Tokenizer.program.set(lexical, () => Context.has(lexical, true))
        }
        invalid_ctx.delete(name)
      }

      Tokenizer.Context.load(Context);
    }

    for (const name of invalid_ctx) {
      log(`invalid context: ${name};r`)
    }

  }
}

export default Context
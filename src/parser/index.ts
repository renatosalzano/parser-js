import javascript from 'plugin/javascript';
import Tokenizer from './Tokenizer';
import { log } from 'utils';

namespace ParserConfig {
  export type Plugin = (prev: ParserStructure) => ParserStructure;
  export type ParserStructure = {
    context: any;
    operator?: { [key: string]: string };
    bracket?: { [key: string]: string };
    keyword?: { [key: string]: string };
    separator?: { [key: string]: string };
    parse: (api: any) => {}
  }
}

type DefaultStartContext = Function & { $name: string };

let instance: ParserConfig | null = null;
class ParserConfig {

  private allow_config = true;
  private Tokenizer = new Tokenizer();
  private plugin: any

  private constructor(config = {}) {
    this.plugin = javascript(config);
    this.extend_parser(this.plugin);
  }

  private extend_parser = (plugin: ParserConfig.Plugin | ParserConfig.ParserStructure) => {

    const { context = {}, keyword = {}, operator = {}, bracket = {}, separator = {}, parse } = typeof plugin === "function"
      ? plugin(this.plugin)
      : plugin;

    this.Tokenizer.extend('separator', separator);
    this.Tokenizer.extend('bracket', bracket);
    this.Tokenizer.extend('operator', operator);
    this.Tokenizer.extend('keyword', keyword);
    this.extend_context(context);
    Object.assign(this.Tokenizer.parse, parse(this.Tokenizer.api))
    log('extended parser;y')
  }

  private extend_context = (context: any) => {

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

      if (!Context?.id) {
        log(`invalid context ${name}: missing "id";r`);
        continue;
      }

      const key = Context.hasOwnProperty('keyword') ? 'keyword' : 'token';

      Context.token = new Map(Object.entries(Context[key]));
      Context.name = name;

      if (key === 'keyword') {

        const context_keyword: { [key: string]: string } = {}

        for (const [lexical] of Context.token) {

          if (Tokenizer.is.alpha(lexical)) {
            if (!Tokenizer.keyword.has(lexical)) {
              // Parser.keyword.set(lexical, name);
              context_keyword[lexical] = name;
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

          Tokenizer.Context.start(name, Object.assign(Context.props || {}, props), instruction);
        }

        return check;
      }

      Context.start = function (props?: any, instruction?: any) {
        const token = Tokenizer.Token.value;
        props = props || this.token.get(token)?.props || {};

        return Tokenizer.Context.start(name, Object.assign(this.props || {}, props), instruction);
      }

      Tokenizer.api[name] = Context;

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

  static config = (config: any) => {
    instance ??= new this(config)
    if (!instance.allow_config) {
      throw 'should be before extend'
    }
    return instance;
  }

  static extend = (plugin: ParserConfig.Plugin | ParserConfig.ParserStructure) => {
    instance ??= new this();
    instance.allow_config = false;
    // TODO EXTEND PLUG IN
    return instance;
  }

  static parse = async (code: string) => {
    instance ??= new this() as ParserConfig;
    await instance.Tokenizer.Parse(code)
  }
}



export default ParserConfig;
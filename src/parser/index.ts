import javascript from 'plugin/javascript';
import Parser from './Parser';
import { log } from 'utils';

namespace ParserConfig {
  export type Plugin = (prev: ParserStructure) => ParserStructure;
  export type ParserStructure = {
    context: any;
    operators?: { [key: string]: string };
    brackets?: { [key: string]: string };
    separators?: { [key: string]: string };
    parse: (api: any) => {}
  }
}

type DefaultStartContext = Function & { $name: string };

let instance: ParserConfig | null = null;
class ParserConfig {

  private allow_config = true;
  private parser = new Parser();
  private plugin: any

  private constructor(config = {}) {
    this.plugin = javascript(config);
    this.extend_parser(this.plugin);
  }

  private extend_parser = (plugin: ParserConfig.Plugin | ParserConfig.ParserStructure) => {

    const { context = {}, operators = {}, brackets = {}, separators = {}, parse } = typeof plugin === "function"
      ? plugin(this.plugin)
      : plugin;

    this.extend_context(context);
    this.parser.extend('separators', separators);
    this.parser.extend('brackets', brackets);
    this.parser.extend('operators', operators);
    Object.assign(this.parser.parse, parse(this.parser.api))

  }

  private extend_context = (context: any) => {

    const Parser = this.parser;
    const start_context_map: { [key: string]: DefaultStartContext } = {};
    let context_to_check = new Set<string>();

    for (const name of Object.keys(context)) {

      if (name === 'Program') {
        context_to_check = new Set(context.Program);
        continue;
      }

      const Context = context[name];

      const has_token = Context.hasOwnProperty('token');
      const has_keyword = Context.hasOwnProperty('keyword')

      if (has_token && has_keyword) {
        // ERROR
        continue;
      }


      const TT = Context.token || Context.keyword;

      Parser.api[`in${name}`] = function (sequence: string, updateContext?: boolean) {

        const ret = TT.hasOwnProperty(sequence);

        if (ret && updateContext) {
          const { props = {}, ...instruction } = TT[sequence] || {};
          Parser.context.start(name, Object.assign(Context.props || {}, props), instruction, sequence.length);
        }

        return ret;
      }

      start_context_map[name] = function (token: string) {
        log('start context', name + ';y')
        const { props = {}, ...instruction } = Context;
        Parser.api.startContext(name, Object.assign(props, TT[token] || {}), instruction, token.length);
      } as any

      start_context_map[name].$name = name;
      Parser.context.load(name, Context, start_context_map[name]);
    }

    let valid_context = '';

    for (const name of context_to_check) {

      if (!context.hasOwnProperty(name)) {
        log('[warn];y', `Program: [${valid_context}`, `"${name}";y`, 'is not defined')
      } else {
        valid_context += `'${name}',`;

        const Context = context[name];
        const key = Context?.token ? "token" : Context?.keyword ? "keyword" : undefined;

        if (key) {

          for (const t of Object.keys(Context[key])) {
            if (Parser.program[key].has(t)) {
              log(`duplicate ${key} "${t}" in: ${name};r`)
            } else {
              Parser.program[key].set(t, () => start_context_map[name](t))
            }
          }
        }
      }
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
    await instance.parser.Parse(code)
  }
}



export default ParserConfig;
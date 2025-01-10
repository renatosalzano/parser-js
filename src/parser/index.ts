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

    this.parser.extend('separator', separators);
    this.parser.extend('bracket', brackets);
    this.parser.extend('operator', operators);
    this.extend_context(context);
    Object.assign(this.parser.parse, parse(this.parser.api))

  }

  private extend_context = (context: any) => {

    const Parser = this.parser;
    const start_context_map: { [key: string]: DefaultStartContext } = {};

    const program_ctx = new Set<string>(context?.Program || []);
    const invalid_ctx = new Set<string>(program_ctx);

    delete context.Program;

    for (const name of Object.keys(context)) {

      const Context = context[name];

      if (!Context?.lexical && !Context?.startWith) {
        log(`invalid context ${name};r`);
        continue;
      }

      const key = Context.hasOwnProperty('lexical') ? 'lexical' : 'startWith';

      Context.lexical = new Map(Object.entries(Context[key]));

      if (key === 'lexical') {

        for (const [lexical] of Context.lexical) {

          if (Parser.is.alpha(lexical)) {
            if (!Parser.lexical.has(lexical)) {
              Parser.keyword.set(lexical, name);
            } else {
              log(`duplicate "${lexical}", found in context: ${name};r`);
            }
          } else {
            Context.lexical.delete(lexical);
            log(`invalid "${lexical}", should be [a-z] found in context: ${name};r`);
          }
        }
      } else {
        delete Context.startWith;
      }

      // Function.has(sequence, { props: {}, eat: {}})
      Context.has = function (sequence: string, updateContext?: boolean | any) {
        const check = this.lexical.has(sequence);
        if (check && updateContext !== undefined) {

          let { props = {}, ...instruction } = this.lexical[sequence] || {};

          if (updateContext.constructor === Object) {
            let { props: props_override = {}, ...instruction_override } = updateContext || {};
            props = props_override;
            instruction = instruction_override;
          }

          Parser.context.start(name, Object.assign(Context.props || {}, props), instruction);
        }

        return check;
      }

      if (program_ctx.has(name)) {
        for (const [lexical] of Context.lexical) {

          if (!Parser.program.has(lexical)) {
            Parser.program.set(lexical, () => Context.has(lexical, true))
          } else {
            log(`duplicate '${lexical}'`)
          }
        }
      }

      start_context_map[name] = function (token: string) {
        log('start context', name + ';y')
        const { props = {}, ...instruction } = Context;
        Parser.api.startContext(name, Object.assign(props, Context.lexical[token] || {}), instruction, token.length);
      } as any

      start_context_map[name].$name = name;
      Parser.context.load(name, Context, start_context_map[name]);
    }

    let valid_context = '';

    // for (const name of context_to_check) {

    //   if (!context.hasOwnProperty(name)) {
    //     log('[warn];y', `Program: [${valid_context}`, `"${name}";y`, 'is not defined')
    //   } else {
    //     valid_context += `'${name}',`;
    //     const Context = context[name];

    //     for (const lexical of Object.keys(Context?.lexical || {})) {
    //       if (!invalid_lexical.has(lexical)) {
    //         Parser.program.set(lexical, () => start_context_map[name](lexical))
    //       }
    //     }
    //   }
    // }

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
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

      if (!Context?.keyword && !Context?.startWith) {
        log(`invalid context ${name};r`);
        continue;
      }

      const key = Context.hasOwnProperty('keyword') ? 'keyword' : 'startWith';

      Context.lexical = new Map(Object.entries(Context[key]));
      Context.name = name;

      if (key === 'keyword') {

        for (const [lexical] of Context.lexical) {

          if (Parser.is.alpha(lexical)) {
            if (!Parser.lexical.has(lexical)) {
              Parser.keyword.set(lexical, name);
            } else {
              Context.lexical.delete(lexical);
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

      if (Context.default) {
        Context.start = function(props: any = {}) {
          Parser.context.start(name, Object.assign(this.props || {}, props));
        }
      }

      if (program_ctx.has(name)) {
        for (const [lexical] of Context.lexical) {
          Parser.program.set(lexical, () => Context.has(lexical, true))
        }
        invalid_ctx.delete(name)
      }

      Parser.context.load(Context);
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
    await instance.parser.Parse(code)
  }
}



export default ParserConfig;
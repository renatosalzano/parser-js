import javascript from 'javascript';
import Tokenizer from './Tokenizer';
import { log } from 'utils';

namespace ParserConfig {
  export type Plugin = (prev: ParserStructure) => ParserStructure;
  export type ParserStructure = {
    name: string;
    program: any;
    tokens?: {
      operator?: string[];
      bracket?: string[];
      keyword?: string[];
      separator?: string[];
      specialToken?: string[];
      comment?: string[][];
      context?: Function[];
    }
    parser: (api: any) => {}
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

    const { name = '', program = {}, tokens = {}, parser } = typeof plugin === "function"
      ? plugin(this.plugin)
      : plugin;

    log(`plugin: ${name};y`);
    this.Tokenizer.extend(name, program, tokens, parser);
  }

  static config = (config: any) => {
    instance ??= new this(config)
    if (!instance.allow_config) {
      throw 'should be before extend'
    }
    return instance;
  }

  static extend = (plugin: ParserConfig.Plugin) => {
    instance ??= new this();
    instance.allow_config = false;
    // TODO EXTEND PLUG IN
    instance.extend_parser(plugin)
    return this
  }

  static parse = async (code: string) => {
    instance ??= new this() as ParserConfig;
    await instance.Tokenizer.Parse(code)
  }

  static tokenize = (code: string) => {
    instance ??= new this() as ParserConfig;
    instance.Tokenizer.start(code);
  }
}



export default ParserConfig;
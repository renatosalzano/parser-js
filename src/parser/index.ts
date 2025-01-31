import javascript from 'javascript/index';
import Tokenizer from './Tokenizer';
import { log } from 'utils';
import Parser from './Parser';

namespace ParserConfig {
  export type Plugin = (prev: ParserStructure) => ParserStructure;
  export type ParserStructure = {
    name: string;
    tokens?: {
      operator?: string[];
      bracket?: string[];
      keyword?: string[];
      separator?: string[];
      specialToken?: string[];
      comment?: string[][];
      context?: Function[];
    }
    parser: Parser
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

    // TODO REWORK
    const { name = '', tokens = {}, parser } = typeof plugin === "function"
      ? plugin(this.plugin)
      : plugin;

    log(`plugin: ${name};y`);
    this.Tokenizer.extend(name, tokens, parser);
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
    instance.Tokenizer.parse(code)
  }

  static tokenize = (code: string) => {
    instance ??= new this() as ParserConfig;
    instance.Tokenizer.start(code);
    return {
      parse: () => {
        instance!.Tokenizer.parse(code);
      }
    }
  }
}



export default ParserConfig;
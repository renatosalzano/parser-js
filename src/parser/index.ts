import javascript from 'plugin/javascript';
import Tokenizer from './Tokenizer';
import { log } from 'utils';

namespace ParserConfig {
  export type Plugin = (prev: ParserStructure) => ParserStructure;
  export type ParserStructure = {
    context: any;
    tokens?: {
      operator?: string[];
      bracket?: string[];
      keyword?: string[];
      separator?: string[];
      specialToken?: string[];
    }
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

    const { context = {}, tokens = {}, parse } = typeof plugin === "function"
      ? plugin(this.plugin)
      : plugin;

    const { keyword = [], operator = [], bracket = [], separator = [], specialToken = [] } = tokens;

    this.Tokenizer.extend('separator', separator);
    this.Tokenizer.extend('bracket', bracket);
    this.Tokenizer.extend('operator', operator);
    this.Tokenizer.extend('keyword', keyword);
    this.Tokenizer.extend('special', specialToken);
    this.Tokenizer.Context.extend(context);
    Object.assign(this.Tokenizer.parse, parse(this.Tokenizer.api));
    log('extended parser;y')
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
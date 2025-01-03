import { log } from "utils";
import javascript from "plugin/javascript";
import { Plugin, plugin } from "plugin";
import Program from "Progam";

let program: Parser | null = null;

type Config = {

}

class Parser {

  private allow_config = true;
  private plugin: any = {};

  private constructor(config = {}) {
    this.plugin = javascript(config);
  }

  static config = (config: Config) => {
    program ??= new this(config)
    if (!program.allow_config) {
      throw 'should be before extend'
    }
    return program;
  }

  static extend = (plugin: Plugin) => {
    program ??= new this();
    program.allow_config = false;

    log('Extend parser;y');
    // TODO EXTEND PLUG IN

    return program;
  }

  static parse = async (code: string) => {
    program ??= new this() as Parser;
    const parser = new ParserJS(code, program.plugin);
    await parser.Parse()

    console.log('end program')
  }
}


class Context {

  context: any = {};
  buffer: any = [];

  constructor(public Parser: ParserJS) {

    this.buffer.push({
      name: 'Program',
      props: {}
    })
  }

  start = (name: string, data: any = {}, start_offset = 0) => {
    const props = data?.props || {}
    log('start context', `${name} at ${this.Parser.index - start_offset - 1};y`, props)
    this.buffer.push({ name, props })
    if (data.eat) {
      this.Parser.eat(data.eat);
    }
  }

  end() {

  }

  current() {
    return this.buffer.at(-1)
  }

  load(name: string, config: any) {
    this.context[name] = {
      ...this.context[name],
      ...config
    }
  }

}

type ParserRules = {
  avoidWhitespace?: boolean | "multiple",
  hasExpression?: boolean,
}

class ParserJS {

  Program = new Program();
  source = '';
  program_context = new Set<string>()
  context: Context;
  api: any = {};
  rules: ParserRules = {
    avoidWhitespace: 'multiple'
  }

  constructor(source: string, plugin: plugin) {
    this.context = new Context(this);
    this.source = source;

    const isBracket = {
      L: (cc = false) => this.is_bracket(cc, '('),
      R: (cc = false) => this.is_bracket(cc, ')'),
      squareL: (cc = false) => this.is_bracket(cc, '['),
      squareR: (cc = false) => this.is_bracket(cc, ']'),
      curlyL: (cc = false) => this.is_bracket(cc, '{'),
      curlyR: (cc = false) => this.is_bracket(cc, '}'),
    }

    const setRules = (rules?: ParserRules) => {
      if (rules) {
        this.rules = rules;
      } else {
        this.rules = {};
      }
    }

    this.api = {
      setRules,
      createNode: this.Program.createNode,
      appendNode: this.Program.appendNode,
      startContext: this.context.start,
      endContext: this.context.end,
      next: this.next,
      isBracket
    }

    this.load_plugin(plugin)

  }

  load_plugin({ context, api, parse }: plugin) {

    let context_to_check = new Set<string>();

    for (const ctx of Object.keys(context)) {

      if (ctx === 'Program') {
        context_to_check = new Set(context.Program);
        continue;
      }

      this.context.load(ctx, context[ctx]);

      const parser = this;

      this.api[`in${ctx}`] = function (sequence: string, updateContext?: boolean) {

        const ret = context[ctx].keyword.hasOwnProperty(sequence);

        if (ret && updateContext) {
          const props = context[ctx].keyword[sequence];
          parser.api.startContext(ctx, props, sequence.length)
        }

        return ret;
      }
    }

    let valid_context = ''
    for (const ctx of context_to_check) {

      if (!context.hasOwnProperty(ctx)) {
        log('[warn];y', `Program: [${valid_context}`, `"${ctx}";y`, 'is not defined in', context)
      } else {
        valid_context += `'${ctx}',`;
        this.program_context.add(`in${ctx}`);
      }
    }

    for (const k of Object.keys(api)) {

      this.api[k] = function (sequence: string) {
        const reg = api[k as keyof typeof api] as RegExp;
        return reg.test(sequence);
      }

    }

    this.parse = parse(this.api);

  }

  start_node = (type: string, ...props: any[]) => {

  }

  is_bracket = (next_char = false, bracket: string) => {
    if (next_char) {
      return this.next_char === bracket;
    }
    return this.char === bracket;
  }

  line = 1
  index = 0;
  char = '';
  prev_char = '';
  next_char = '';
  sequence = '';
  parse_string = '';
  parse: any = {}

  is_new_line() {
    if (/[\r\n]/.test(this.char)) {
      if (this.char === '\r') {
        // if is windows eat \r\n
        this.index += 2
      } else {
        this.index += 1
      }
      this.pos = 1;
      ++this.line;
      log('new line;c')
      return true;
    }
    return false;
  }

  is_parsing_string() {
    if (/['|"|`]/.test(this.char)) {
      if (this.parse_string) {
        if (`${this.prev_char}${this.char}` !== `\\${this.parse_string}`) {
          // end parsing string
          this.parse_string = '';
        }
      } else {
        this.parse_string = this.char;
      }
    }
    if (!!this.parse_string) {
      ++this.index;
      ++this.pos;
    }
    return !!this.parse_string;
  }

  avoid_whitespace = () => {
    // dont eat whitespace during parse string
    if (this.parse_string) return false;

    const rule = this.rules?.avoidWhitespace;

    if (rule) {
      const check_prev = rule === 'multiple'
        ? this.char === this.prev_char
        : true

      if (/\s/.test(this.char) && check_prev) {
        ++this.index;
        ++this.pos;
        return true;
      }

    }
  }

  pos = 1;

  eat = (sequence: string) => {
    this.next();
    if (this.sequence !== sequence) {
      this.prev();
    } else {
      log('eated', `${sequence};y`)
    }
  }

  prev = () => {
    const len = this.sequence.length + 1;
    this.index -= len;
    this.pos -= len;
  }

  next = (breakReg = /[\s()\[\]]/) => {
    let walk = true;
    this.sequence = '';

    while (walk && this.index < this.source.length) {

      this.char = this.source[this.index];
      this.prev_char = this.source[this.index - 1];
      this.next_char = this.source[this.index + 1];

      if (this.is_new_line()) {
        continue
      }

      if (this.is_parsing_string()) {
        continue;
      }

      if (this.avoid_whitespace()) {
        continue;
      }

      if (!breakReg.test(this.char)) {
        this.sequence += this.char;
      } else {
        log(`"${this.sequence}";y`)
        walk = false;
        ++this.pos;
        ++this.index;
        return this.sequence;
      }

      ++this.pos;
      ++this.index;
    }

  }

  parseProgram() {
    this.rules = { avoidWhitespace: "multiple" };
    this.next();

    for (const inContext of this.program_context) {
      if (this.api[inContext](this.sequence, true)) {
        const curr = this.context.current()
        this.parse[curr.name](curr.props)
        break;
      }
    }

  }


  async Parse() {
    this.parseProgram()
  }

}

export {
  ParserRules
}

export default Parser;

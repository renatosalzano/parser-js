import { log } from "utils";
import javascript from "plugin/javascript";
import { Plugin, plugin } from "plugin";
import Program from "Progam";
import { toRegExp } from "./utils/parser";

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
      eat: this.eat,
      expected: this.expected,
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
    console.log('char', this.char, 'bracket', bracket)
    return this.char === bracket;
  }

  line = 1
  pos = 1;

  index = 0;
  char = '';
  prev_char = '';
  next_char = '';
  sequence = '';
  parse_string = '';
  parse: any = {};
  expected_test?: [number, RegExp];

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
      // log('new line;c')
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
      const prev_char = this.prev_char !== undefined
        ? this.prev_char
        : ' ';

      const check_prev = rule === 'multiple'
        ? this.char === prev_char
        : true

      if (/\s/.test(this.char) && check_prev) {
        ++this.index;
        ++this.pos;
        return true;
      }

    }
  }

  eat = (sequence: string, breakReg?: RegExp) => {

    if (sequence !== this.next(breakReg)) {
      this.prev();
    }
  }

  expected = (value: string) => {

    const len = value.replace('\\', '').length;
    const reg = toRegExp(value);
    if (!reg) return false;

    this.expected_test = [len, reg]

    return this.next()
  }

  prev = () => {
    const len = this.sequence.length + 1;
    this.index -= len;
    this.pos -= len;
  }

  next = (
    include: RegExp | true = true,
    exclude: RegExp | true = /[\s(\[{;:]/,
    debug = false
  ) => {

    let should_continue = true;
    this.sequence = '';

    if (debug) {
      var debug_include = typeof include === 'boolean' ? 'boolean' : include;
      var debug_exclude = typeof exclude === 'boolean' ? 'boolean' : exclude;
    }

    while (should_continue && this.index < this.source.length) {



      this.char = this.source[this.index];
      this.prev_char = this.source[this.index - 1];
      this.next_char = this.source[this.index + 1];

      if (!this.char) {
        log('undefined;r')
      }

      if (this.is_new_line()) {
        continue
      }

      if (this.is_parsing_string()) {
        continue;
      }

      if (this.avoid_whitespace()) {
        continue;
      }

      if (this.expected_test) {
        this.sequence += this.char;
        if (this.sequence.length === this.expected_test[0]) {

          const expectation = this.expected_test[1].test(this.sequence);
          this.expected_test = undefined;
          ++this.index;
          ++this.pos;

          return expectation;

        } else {
          ++this.index;
          ++this.pos;
        }
        continue;
      }

      let _include = typeof include === 'boolean' ? true : include.test(this.char);
      let _exclude = typeof exclude === 'boolean' ? true : !exclude.test(this.char);

      if (debug) {
        // @ts-ignore
        log('test:;m', this.char, 'include:;m', debug_include, _include, 'exclude:;m', debug_exclude, !_exclude)
      }


      if (_include && _exclude) {
        this.sequence += this.char;
      } else {
        if (this.sequence) {
          if (debug) {
            log('sequence:;m', `"${this.sequence}";y`);
          }
          should_continue = false;
          return this.sequence;
        }
      }

      ++this.pos;
      ++this.index;
    }

  }

  parseProgram() {
    this.rules = { avoidWhitespace: "multiple" };
    this.next()
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

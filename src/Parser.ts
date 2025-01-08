import { log } from "utils";
import javascript from "plugin/javascript";
import { Plugin, plugin } from "plugin";
import Program from "Progam";
import { isQuote, toRegExp } from "./utils/parser";

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
  }
}

type DefaultStartContext = Function & { $name: string };

class Context {

  default: DefaultStartContext = {} as DefaultStartContext;
  context: any = {};
  buffer: any = [];
  current: { name: string, props: any };

  constructor(public Parser: ParserJS) {

    this.buffer.push({
      name: 'Program',
      props: {}
    })

    this.current = this.buffer.at(-1);
  }

  start = (name: string, props: any = {}, instruction: any = {}, start_offset = 0) => {

    log('start context', `${name} at ${this.Parser.index - start_offset - 1};y`, props)
    this.buffer.push({ name, props })
    this.current = this.buffer.at(-1);
    // if (data.eat) {
    //   this.Parser.eat(data.eat);
    // }
  }

  end() {

  }

  load(name: string, config: any, start_context: DefaultStartContext) {
    if (config?.default) {

      start_context.$name = name;

      if (this.default) {
        log(`default context is "${name}", was "${this.default.$name}";y`)
      }
      this.default = start_context;
    }
    this.context[name] = {
      ...this.context[name],
      ...config
    }
  }

}

type ParserRules = {
  skipWhitespace?: boolean | "multiple",
  hasOperators?: boolean,
}

class ParserJS {

  Program = new Program();
  source = '';
  program_token = new Map<string, Function>();
  program = {
    token: new Map<string, Function>(),
    keyword: new Map<string, Function>()
  }

  context: Context;
  api: any = {};
  operators: { [key: string]: string } = {};
  rules: ParserRules = {
    skipWhitespace: 'multiple'
  }

  reference = new Map<string, string>();

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
      char: this.char,
      currentContext: this.context.current,
      eachChar: this.each_char,
      setRules,
      createNode: this.Program.createNode,
      appendNode: this.Program.appendNode,
      startContext: this.context.start,
      endContext: this.context.end,
      next: this.next,
      nextChar: this.next_char,
      eat: this.eat,
      expected: this.expected,
      error: this.error
    }

    this.load_plugin(plugin);

  }

  load_plugin({ context, api, operators, parse }: plugin) {

    let context_to_check = new Set<string>();
    const start_context_map: { [key: string]: DefaultStartContext } = {}

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

      const parser = this;
      const TT = Context.token || Context.keyword;

      log('context:;m', name)

      this.api[`in${name}`] = function (sequence: string, updateContext?: boolean) {

        const ret = TT.hasOwnProperty(sequence);

        if (ret && updateContext) {
          const { props = {}, ...instruction } = TT[sequence] || {};
          parser.api.startContext(name, Object.assign(Context.props || {}, props), instruction, sequence.length);
        }

        return ret;
      }

      start_context_map[name] = function (token: string) {
        log('start context', name + ';y')
        const { props = {}, ...instruction } = Context;
        parser.api.startContext(name, Object.assign(props, TT[token] || {}), instruction, token.length);
      } as any

      start_context_map[name].$name = name;

      this.context.load(name, Context, start_context_map[name]);
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
            if (this.program[key].has(t)) {
              log(`duplicate ${key} "${t}" in: ${name};r`)
            } else {
              this.program[key].set(t, () => start_context_map[name](t))
            }
          }

        }
      }
    }

    for (const k of Object.keys(api)) {
      let isApi: any = (api as any)[k];

      if (isApi instanceof RegExp) {
        this.api[k] = function (sequence: string) {
          return isApi.test(sequence)
        }
        continue;
      }

    }

    this.operators = operators;

    this.parse = parse(this.api);

  }


  line = 1
  pos = 1;

  index = 0;
  char = {
    curr: '',
    prev: '',
    next: ''
  }
  sequence = ''


  history = new History(this);

  parse_string = '';
  should_continue = false;
  blocking_error = false;

  parse: any = {};

  is = {
    bracket: (char: string) => /[()\[\]{}]/.test(char),
    identifier: (sequence: string) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(sequence)
  }

  is_identifier = (sequence: string) => {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(sequence);
  }

  expected_test: { is_testing?: boolean } & (() => boolean | undefined | void) = function () { };

  skip_new_line() {
    if (/[\r\n]/.test(this.char.curr)) {
      if (this.char.curr === '\r') {
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

  parsing_string() {

    if (this.expected_test.is_testing) {
      return false;
    }

    if (/['|"|`]/.test(this.char.curr)) {
      if (this.parse_string) {
        if (`${this.char.prev}${this.char.curr}` !== `\\${this.parse_string}`) {
          // end parsing string
          this.parse_string = '';
          this.should_continue = false;
          this.sequence += this.char.curr;
        }
      } else {
        this.parse_string = this.char.curr;
      }
    }
    if (!!this.parse_string) {
      this.sequence += this.char.curr
      ++this.index;
      ++this.pos;
    }
    return !!this.parse_string;
  }

  is_ws = (char: string) => /[\s\t]/.test(char)
  skip_multiple_whitespace = (debug = false) => {
    // dont eat whitespace during parse string
    if (this.parse_string) return false;
    if (this.is_ws(this.char.curr) && (this.is_ws(this.char.next) || this.sequence === '')) {
      ++this.index, ++this.pos;
      return true
    }
  }

  parsing_operator = false;

  parsing_operators = (debug = false) => {

    if (!this.parsing_operator) {

      if (this.sequence && this.operators.hasOwnProperty(this.char.curr)) {
        if (debug) log('operator found stop immediate;y')
        this.stop_immediate = true;
        return false;
      }

    }


    let sequence = this.sequence + this.char.curr;
    const is_operator = this.operators.hasOwnProperty(sequence);

    if (is_operator) {
      this.parsing_operator = true;
      this.sequence += this.char.curr;
      ++this.index, ++this.pos;
      return true;
    } else {
      if (this.parsing_operator) {
        this.stop_immediate = true;
        this.parsing_operator = false;
        if (debug) log('operator:;m', `"${this.sequence}";y`, 'type:;m', this.operators[this.sequence] + ';g')
      }

    }

    return false;
  }

  eat = (sequence: string, breakReg?: RegExp) => {

    // if (sequence !== this.next(breakReg)) {
    //   this.prev();
    // }
  }

  expected = (value: string, debug = false) => {

    let expectation = false;

    const values = value
      .split('|')
      .sort((a, b) => a.length - b.length) // [x, xx, xxx]
      .reduce<{ [key: number]: Set<string> }>((ret, curr) => {
        if (!ret[curr.length]) ret[curr.length] = new Set([curr]);
        else ret[curr.length].add(curr);
        return ret;
      }, {})

    this.expected_test = function () {

      this.sequence += this.char.curr;

      ++this.index, ++this.pos;

      if (values[this.sequence.length]) {

        for (const value of values[this.sequence.length]) {

          if (debug) {
            log('expected;m', `"${value}";y`, 'sequence:;m', `"${this.sequence}";y`)
          }

          if (this.sequence === value) {
            expectation = true;
            this.should_continue = false;
            this.expected_test = function () { };
            this.expected_test.is_testing = false
            return false; // stop test
          }

        }

        delete values[this.sequence.length]
      }

      if (Object.values(values).length === 0) {
        this.expected_test = function () { };
        this.expected_test.is_testing = false;
        return false
      }

      return true;
    }

    this.expected_test.is_testing = true;

    this.next()

    if (!expectation) {

      if (debug) {
        log('expected failed;r')
      }
      this.history.prev();

    }

    return expectation;
  }

  prev = () => {
    // const len = this.sequence.length + 1;
    // this.index -= len;
    // this.pos -= len;
  }

  next_char = (debug = false) => {

    // clean old sequence
    this.sequence = '';

    while (this.index < this.source.length) {

      this.char.curr = this.source[this.index];

      if (this.skip_new_line()) {
        continue
      }

      if (this.skip_multiple_whitespace(debug)) {
        continue;
      }

      if (isQuote(this.char.curr)) {
        /*
          se il carattere corrente è un apice (',",`) "index" non viene incrementato,
          perché alla successiva esecuzione di next() il parser non sarebbe in grado di parsare
          correttamente la stringa.

          if the current character is a quote (',",`), "index" is not incremented,
          because on the next execution of next() the parser would not be able to parse
          the string correctly.
        */
        if (debug) log('next char is quote:;m', `(${this.char.curr})`)
        return this.char.curr;
      }

      if (debug) log('current char:;m', `${this.source[this.index + 0]}`)

      ++this.index, ++this.pos, this.history.push();
      return this.char.curr;
    }

    return this.char.curr;
  }

  stop_immediate = false;

  next = (debug = false) => {

    this.history.push()

    this.should_continue = true;
    this.sequence = '';

    while (this.should_continue && this.index < this.source.length) {

      this.char.prev = this.source[this.index - 1];
      this.char.curr = this.source[this.index];
      this.char.next = this.source[this.index + 1];

      if (this.parsing_string()) {
        continue;
      }

      if (this.skip_multiple_whitespace()) {
        continue;
      }

      if (this.parsing_operators(debug)) {
        continue;
      }

      if (this.is.bracket(this.char.curr)) {
        if (this.sequence) {
          this.should_continue = false;
        } else {
          log('bracket:;m', this.char.curr)
          ++this.index, ++this.pos;
          return this.char.curr;
        }
      }

      if (this.stop_immediate) {
        this.stop_immediate = false;
        return this.sequence;
      }

      if (!this.should_continue) {
        if (debug) log('sequence:;m', this.sequence);

        ++this.index, ++this.pos;
        return this.sequence;
      }


      if (/[\s\r\n,:;]/.test(this.char.curr)) {
        if (debug) log('sequence:;m', this.sequence);
        ++this.index, ++this.pos;
        return this.sequence;
      }

      this.sequence += this.char.curr;

      ++this.index, ++this.pos;

    }

  }

  parse_program() {
    log('start parse program;y');
    let index = 36
    while (index !== 0) {
      this.next(true);
      log(`curr char;g`, this.char.curr)
      --index;
    }


    // console.log(this.next())

    log('end parse program;g')


  }

  error = (message: string) => {
    log('ERROR;R', `${message} at ${this.line}:${this.pos}`);
  }

  each_char = (callback: (char: string, sequence: string) => boolean | undefined) => {

    this.should_continue = true;
    this.sequence = '';

    while (this.should_continue && this.index < this.source.length) {

      this.char.prev = this.source[this.index - 1];
      this.char.curr = this.source[this.index];
      this.char.next = this.source[this.index + 1];

      if (this.skip_new_line()) {
        continue
      }

      if (this.skip_multiple_whitespace()) {
        continue;
      }

      this.sequence += this.char.curr;

      if (callback(this.char.curr, this.sequence)) {
        this.should_continue = false;
        return;
      }

      ++this.index, ++this.pos;
    }

  }


  async Parse() {
    this.parse_program()
  }

}


class History {

  history: [number, number, number][] = []

  constructor(public Parser: ParserJS) {

  }

  push = () => {
    const { index, line, pos } = this.Parser;
    this.history.push([index, line, pos])
  }

  prev = () => {
    if (this.history.length !== 1) {
      this.history.pop()
    }
    const [index, line, pos] = this.history.at(-1) as [number, number, number];
    // console.log('history prev', index)
    this.Parser.index = index;
    this.Parser.line = line;
    this.Parser.pos = pos;
    this.Parser.char.prev = this.Parser.source[index - 1]
    this.Parser.char.curr = this.Parser.source[index]
    this.Parser.char.next = this.Parser.source[index + 1]
    // console.log(this.Parser.char)

  }

}

export {
  ParserRules
}

export default Parser;

import { log } from "utils";
import Context from "./Context";
import History from "./History";
import parser from './index'
import Program from "./Progam";

type SequenceType = 'unknown' | 'string' | 'operator' | 'bracket' | 'keyword' | 'separator' | 'identifier' | 'number';

class Parser {

  Program = new Program();
  source = '';
  program_token = new Map<string, Function>();
  program = {
    token: new Map<string, Function>(),
    keyword: new Map<string, Function>()
  }

  context: Context;

  api: any = {};

  keywords = new Map<string, string>();
  tokens = new Map<string, string>();
  operators = new Map<string, string>();
  brackets = new Map<string, string>();
  separators = new Map<string, string>();

  reference = new Map<string, string>();

  constructor() {
    this.context = new Context(this);
    // this.source = source;

    this.api = {
      char: this.char,
      currentContext: this.context.current,
      eachChar: this.each_char,
      createNode: this.Program.createNode,
      appendNode: this.Program.appendNode,
      startContext: this.context.start,
      endContext: this.context.end,
      next: this.next,
      eat: this.eat,
      error: this.error
    }
  }

  async Parse(source: string) {
    this.source = source;
    this.parse_program()
  }

  extend = (type: "operators" | "brackets" | 'separators', map: { [key: string]: string } = {}) => {

    const entries = Object.entries(map)
    this[type] = new Map([...this[type], ...entries]);
    this.tokens = new Map([...this.tokens, ...entries]);

    let key = type.slice(0, -1) as keyof typeof this.is;
    this.is[key] = (_: string) => this[type].has(_);
    this.is.token = (_: string) => this.tokens.has(_);
  }

  line = 1
  pos = 1;

  index = 0;
  char = {
    curr: '',
    prev: '',
    next: ''
  }
  sequence = {
    value: '',
    type: 'unknown' as SequenceType,

  }
  sequence_debug_label = 'sequence';


  history = new History(this);


  should_continue = false;
  blocking_error = false;

  parse: any = {};

  is = {
    operator: (_: string) => false,
    bracket: (_: string) => false,
    separator: (_: string) => false,
    token: (_: string) => false,
    quote: (char: string) => /['|"|`]/.test(char),
    space: (char: string) => /[\s\t]/.test(char),
    identifier: (sequence: string) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(sequence),
    number: (sequence: any) => !isNaN(sequence)
  }

  expected_test: { is_testing?: boolean } & (() => boolean | undefined | void) = function () { };

  check_new_line(debug = false) {
    if (/[\r\n]/.test(this.char.curr)) {
      if (this.char.curr === '\r') {
        // if is windows eat \r and go to the next char
        this.index += 1
        return true;
      }

      this.pos = 1, ++this.line;
      this.history.push();
      if (debug) log('line:;c', this.line);


    }
  }

  parsing_string = '';
  parse_string() {

    if (this.parsing_token) {
      return false;
    }

    if (this.is.quote(this.char.curr)) {
      if (this.parsing_string) {
        this.sequence.type = 'string';

        switch (true) {
          case (this.char.curr !== this.parsing_string):
            return true;
          case (`${this.char.prev}${this.char.curr}` !== `\\${this.parsing_string}`): {
            // end parsing string
            this.parsing_string = '';
            this.stop_immediate = true;
            this.sequence.value += this.char.curr;
            ++this.index, ++this.pos;
            return false;
          }
        }
      } else {
        this.parsing_string = this.char.curr;
      }
    }

    if (!!this.parsing_string) {
      this.sequence.value += this.char.curr
      ++this.index, ++this.pos;
    }

    return !!this.parsing_string;
  }

  parse_number() {

  }

  skip_multiple_whitespace = (debug = false) => {
    // dont eat whitespace during parse string
    if (this.parsing_string) return false;
    if (this.is.space(this.char.curr) && (this.is.space(this.char.next) || this.sequence.value === '')) {
      ++this.index, ++this.pos;
      return true
    }
  }

  parsing_token = false;
  parse_tokens = (debug = false) => {

    if (!this.parsing_token) {

      if (this.sequence.value && this.is.token(this.char.curr)) {
        this.stop_immediate = true;
        return false;
      }

    }

    let sequence = this.sequence.value + this.char.curr;
    const is_token = this.is.token(sequence);

    if (is_token) {
      this.parsing_token = true;
      this.sequence.value += this.char.curr;
      ++this.index, ++this.pos;
      return true;
    } else {

      if (this.parsing_token) {
        // end parsing operator
        if (this.is.operator(this.sequence.value)) {
          this.sequence.type = 'operator'
        } else if (this.is.bracket(this.sequence.value)) {
          this.sequence.type = 'bracket'
        } else if (this.is.separator(this.sequence.value)) {
          this.sequence.type = 'separator'
        }

        this.stop_immediate = true;
        this.parsing_token = false;
        if (debug) log(this.history.loc(), 'operator:;m', `"${this.sequence.value}";y`, 'type:;m', this.tokens.get(this.sequence.value) + ';g')
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

    // let expectation = false;

    // const values = value
    //   .split('|')
    //   .sort((a, b) => a.length - b.length) // [x, xx, xxx]
    //   .reduce<{ [key: number]: Set<string> }>((ret, curr) => {
    //     if (!ret[curr.length]) ret[curr.length] = new Set([curr]);
    //     else ret[curr.length].add(curr);
    //     return ret;
    //   }, {})

    // this.expected_test = function () {

    //   this.sequence += this.char.curr;

    //   ++this.index, ++this.pos;

    //   if (values[this.sequence.length]) {

    //     for (const value of values[this.sequence.length]) {

    //       if (debug) {
    //         log('expected;m', `"${value}";y`, 'sequence:;m', `"${this.sequence}";y`)
    //       }

    //       if (this.sequence === value) {
    //         expectation = true;
    //         this.should_continue = false;
    //         this.expected_test = function () { };
    //         this.expected_test.is_testing = false
    //         return false; // stop test
    //       }

    //     }

    //     delete values[this.sequence.length]
    //   }

    //   if (Object.values(values).length === 0) {
    //     this.expected_test = function () { };
    //     this.expected_test.is_testing = false;
    //     return false
    //   }

    //   return true;
    // }

    // this.expected_test.is_testing = true;

    // this.next()

    // if (!expectation) {

    //   if (debug) {
    //     log('expected failed;r')
    //   }
    //   this.history.prev();

    // }

    return false;
  }

  prev = () => {
    // const len = this.sequence.length + 1;
    // this.index -= len;
    // this.pos -= len;
  }

  stop_immediate = false;

  next = (debug = false) => {

    this.history.push()

    this.should_continue = true;
    this.sequence.value = '';
    this.sequence.type = 'unknown';

    var print = () => log(this.history.loc(), this.sequence.type + ';m', this.sequence.value || this.char.curr)

    while (!this.blocking_error && this.index < this.source.length) {

      this.char.prev = this.source[this.index - 1];
      this.char.curr = this.source[this.index];
      this.char.next = this.source[this.index + 1];

      if (this.check_new_line(debug)) {
        continue;
      }

      if (this.parse_string()) {
        continue;
      }

      if (this.skip_multiple_whitespace()) {
        continue;
      }

      if (this.parse_tokens()) {
        continue;
      }

      if (/[\s\r\n]/.test(this.char.curr)) {
        if (this.sequence.value) {
          this.stop_immediate = true;
        } else {
          if (debug) print();
          ++this.index, ++this.pos;
          return this.char.curr;
        }
      }

      if (this.stop_immediate) {

        if (this.program.keyword.has(this.sequence.value)) {
          this.sequence.type = 'keyword'
        } else if (this.is.identifier(this.sequence.value)) {
          this.sequence.type = 'identifier'
        } else if (this.is.number(this.sequence.value)) {
          this.sequence.type = 'number'
        }

        if (debug) print();
        this.stop_immediate = false;
        return this.sequence;
      }

      this.sequence.value += this.char.curr;

      ++this.index, ++this.pos;

    }

  }

  parse_program() {
    log('start parse program;y');
    let index = 36
    while (index !== 0) {
      this.next(true);
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
    this.sequence.value = '';

    while (this.should_continue && this.index < this.source.length) {

      this.char.prev = this.source[this.index - 1];
      this.char.curr = this.source[this.index];
      this.char.next = this.source[this.index + 1];

      if (this.skip_multiple_whitespace()) {
        continue;
      }

      this.sequence.value += this.char.curr;

      if (callback(this.char.curr, this.sequence.value)) {
        this.should_continue = false;
        return;
      }

      ++this.index, ++this.pos;
    }

  }




}

export default Parser
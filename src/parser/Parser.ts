import { log } from "utils";
import Context from "./Context";
import History from "./History";
import parser from './index'
import Program from "./Progam";

type SequenceType = 'unknown' | 'string' | 'operator' | 'bracket' | 'keyword' | 'separator' | 'identifier' | 'number';

class Parser {

  Program = new Program();
  source = '';


  context: Context;

  api: any = {};

  program = new Map<string, Function>()

  keyword = new Map<string, string>();
  lexical = new Map<string, string>();

  operator = new Map<string, string>();
  bracket = new Map<string, string>();
  separator = new Map<string, string>();

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

  extend = (type: "operator" | "bracket" | 'separator', map: { [key: string]: string } = {}) => {

    for (const [l, t] of Object.entries(map)) {

      if (this.lexical.has(l)) {
        log(`warn: duplicate "${l}" found in ${type};y`)
      } else {
        if (this.is.alpha(l)) {
          this.keyword.set(l, t);
          this.is.keyword = (_: string) => this.keyword.has(_);
        }
        this.lexical.set(l, t);
        this[type].set(l, t);
        this.is.lexical = (_:string) => this.lexical.has(_);
        this.is[type] = (_:string) => this[type].has(_);
      }
    }
  }

  is = {
    operator: (_: string) => false,
    bracket: (_: string) => false,
    separator: (_: string) => false,
    lexical: (_: string) => false,
    keyword: (_: string) => false,
    quote: (char: string) => /['|"|`]/.test(char),
    space: (char: string) => /[\s\t]/.test(char),
    identifier: (sequence: string) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(sequence),
    alpha: (sequence: string) => /^[a-z]*$/.test(sequence),
    number: (sequence: any) => !isNaN(sequence)
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
    name: '',
    type: 'unknown' as SequenceType,

  }
  sequence_debug_label = 'sequence';


  history = new History(this);


  should_continue = false;
  blocking_error = false;

  parse: any = {};

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

    if (this.parsing_lexical) {
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

  skip_multiple_whitespace = (debug = false) => {
    // dont eat whitespace during parse string
    if (this.parsing_string) return false;
    if (this.is.space(this.char.curr) && (this.is.space(this.char.next) || this.sequence.value === '')) {
      ++this.index, ++this.pos;
      return true
    }
  }

  parsing_lexical = false;
  parse_lexical = (debug = false) => {

    if (!this.parsing_lexical && this.sequence.value && this.is.lexical(this.char.curr)) {
      this.stop_immediate = true;
      return false;
    }

    let sequence = this.sequence.value + this.char.curr;
    const is_lexical = this.is.lexical(sequence);

    if (is_lexical) {

      this.parsing_lexical = true;
      this.sequence.value += this.char.curr;
      ++this.index, ++this.pos;
      return true;

    } else {

      if (this.parsing_lexical && this.is.identifier(sequence)) {
        if (debug) {
          log('is not lexical;r', sequence);
        }
        this.parsing_lexical = false;
        return false;
      }

      if (this.parsing_lexical) {
        // end parsing lexical
        if (debug) {
          log('end parse lexical;y')
        }

        if (this.is.operator(this.sequence.value)) {
          this.sequence.type = 'operator';
          this.sequence.name = this.operator.get(this.sequence.value) || "";
        } else if (this.is.bracket(this.sequence.value)) {
          this.sequence.type = 'bracket';
          this.sequence.name = this.bracket.get(this.sequence.value) || "";
        } else if (this.is.separator(this.sequence.value)) {
          this.sequence.type = 'separator';
          this.sequence.name = this.separator.get(this.sequence.value) || "";
        } else {
          this.parsing_lexical = false;
          return false;
        }

        this.stop_immediate = true;
        this.parsing_lexical = false;

        // @ts-ignore
        if (debug) log(this.history.loc(), this.sequence.type.magenta(), `"${this.sequence.value}";y`, 'type:;m', this.lexical.get(this.sequence.value) + ';g')
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
    this.sequence.name = '';

    // @ts-ignore
    var print = () => log(this.history.loc(), this.sequence.type.magenta() + (this.sequence.name ? ` ${this.sequence.name}`.green() : ''), this.sequence.value || this.char.curr)

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

      if (this.parse_lexical()) {
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

        if (this.sequence.type === 'unknown') {

          if (this.is.keyword(this.sequence.value)) {
            this.sequence.type = 'keyword'
          } else if (this.is.identifier(this.sequence.value)) {
            this.sequence.type = 'identifier'
          } else if (this.is.number(this.sequence.value)) {
            this.sequence.type = 'number'
          }
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

    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);
    this.next(true);







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
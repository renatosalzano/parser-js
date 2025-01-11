import { log } from "utils";
import Context from "./Context";
import History from "./History";
import parser from './index'
import Program from "./Progam";

type SequenceType = 'unknown' | 'literal' | 'operator' | 'bracket' | 'keyword' | 'separator' | 'identifier' | 'number';

class Parser {

  Program = new Program();
  source = '';

  context: Context;
  history = new History(this);

  api: any = {};

  program = new Map<string, Function>()

  
  token = new Map<string, 'operator' | 'bracket' | 'separator'>();

  keyword = new Map<string, string>();
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

  extend = (type: "operator" | "bracket" | 'separator' | 'keyword', map: { [key: string]: string } = {}) => {

    for (const [token, t] of Object.entries(map)) {

      if (this.token.has(token)) {
        log(`warn: duplicate "${token}" found in ${type};y`)
      } else {
        if (this.is.alpha(token) || type === 'keyword') {
          this.keyword.set(token, t);
          this.is.keyword = (_: string) => this.keyword.has(_);
        } else {
          this.token.set(token, type);
          this.is.token = (_:string) => this.token.has(_);
        }
        this[type].set(token, t);
        this.is[type] = (_:string) => this[type].has(_);
      }
    }
  }

  is = {
    operator: (_: string) => false,
    bracket: (_: string) => false,
    separator: (_: string) => false,
    token: (_: string) => false,
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

  maybe = new Set<SequenceType | 'token'>();
  expected = new Set<SequenceType>();

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

  parsing_literal = '';
  parse_literal() {

    if (this.parsing_token) {
      return false;
    }

    if (this.is.quote(this.char.curr)) {

      if (this.parsing_literal) {
        this.sequence.type = 'literal';

        switch (true) {
          case (this.char.curr !== this.parsing_literal):
            return true;
          case (`${this.char.prev}${this.char.curr}` !== `\\${this.parsing_literal}`): {
            // end parsing string
            this.parsing_literal = '';
            this.stop_immediate = true;
            this.sequence.value += this.char.curr;
            ++this.index, ++this.pos;
            return true;
          }
        }
      } else {
        this.parsing_literal = this.char.curr;
      }
    }

    if (!!this.parsing_literal) {
      this.sequence.value += this.char.curr
      ++this.index, ++this.pos;
    }

    return !!this.parsing_literal;
  }

  parsing_number = false;
  parse_number = () => {

    if (this.expected.has('identifier')) return false;
    if (this.is.space(this.char.curr)) return false;

    const is_number = this.is.number(this.sequence.value + this.char.curr);

    if (is_number) {
      this.expected.add('number');
      this.sequence.type = 'number';
      
      this.parsing_number = true;
      this.sequence.value += this.char.curr;
      ++this.index, ++this.pos;
      return true;
    } else {
      
      if (this.parsing_number) {
        this.parsing_number = false;
        this.stop_immediate = true;
        ++this.index, ++this.pos;
        return true;
      }
    }

    return false;
  }

  skip_multiple_whitespace = (debug = false) => {
    // dont eat whitespace during parse string
    if (this.parsing_literal) return false;

    if (this.is.space(this.char.curr) && (this.is.space(this.char.next) || this.sequence.value === '')) {
      ++this.index, ++this.pos;
      return true
    }
  }

  parsing_token = false;
  token_type?: 'token' | 'keyword';
  parse_token = (debug = false) => {

    let sequence = this.sequence.value + this.char.curr;

    if (this.expected.has('identifier') || this.expected.has('number')) {
      this.parsing_token = false;
      return false
    }

    if (!this.maybe.has('token') && !this.maybe.has('keyword')) {
      this.parsing_token = false;
    }

    if (this.maybe.has('token')) {
      this.token_type = 'token';
      this.parsing_token = this.is.token(sequence);
    }

    if (this.maybe.has('keyword')) {
      this.token_type = 'keyword';
      this.parsing_token = true;
    }

    if (this.parsing_token) {
      this.sequence.value += this.char.curr;
      ++this.index, ++this.pos;
      return true;

    } else {

      // expected end token
      
      if (this.token_type === 'token') {
        // operator | bracket | separator
        const type = this.token.get(this.sequence.value);
        if (type) {
          this.sequence.type = type
          this.sequence.name = this[type].get(this.sequence.value) || '';
          this.stop_immediate = true;
          return true
        } else {
          log('unexpected error;r')
        }
      } else {

        if (this.keyword.get(this.sequence.value)) {
          this.sequence.type = 'keyword';
          this.sequence.name = this.keyword.get(this.sequence.name) || '';
          this.stop_immediate = true;
          return true
        } else {
          this.sequence.type = 'identifier';
          this.expected.add('identifier');
        }
      }

      // console.log(tt, this.sequence.value)
    }

    return false;

  }


  eat = (sequence: string, breakReg?: RegExp) => {

    // if (sequence !== this.next(breakReg)) {
    //   this.prev();
    // }
  }

  // expected = (value: string, debug = false) => {

  //   // let expectation = false;

  //   // const values = value
  //   //   .split('|')
  //   //   .sort((a, b) => a.length - b.length) // [x, xx, xxx]
  //   //   .reduce<{ [key: number]: Set<string> }>((ret, curr) => {
  //   //     if (!ret[curr.length]) ret[curr.length] = new Set([curr]);
  //   //     else ret[curr.length].add(curr);
  //   //     return ret;
  //   //   }, {})

  //   // this.expected_test = function () {

  //   //   this.sequence += this.char.curr;

  //   //   ++this.index, ++this.pos;

  //   //   if (values[this.sequence.length]) {

  //   //     for (const value of values[this.sequence.length]) {

  //   //       if (debug) {
  //   //         log('expected;m', `"${value}";y`, 'sequence:;m', `"${this.sequence}";y`)
  //   //       }

  //   //       if (this.sequence === value) {
  //   //         expectation = true;
  //   //         this.should_continue = false;
  //   //         this.expected_test = function () { };
  //   //         this.expected_test.is_testing = false
  //   //         return false; // stop test
  //   //       }

  //   //     }

  //   //     delete values[this.sequence.length]
  //   //   }

  //   //   if (Object.values(values).length === 0) {
  //   //     this.expected_test = function () { };
  //   //     this.expected_test.is_testing = false;
  //   //     return false
  //   //   }

  //   //   return true;
  //   // }

  //   // this.expected_test.is_testing = true;

  //   // this.next()

  //   // if (!expectation) {

  //   //   if (debug) {
  //   //     log('expected failed;r')
  //   //   }
  //   //   this.history.prev();

  //   // }

  //   return false;
  // }

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

    this.maybe = new Set(['token']);
    this.expected = new Set();

    let check_is_keyword = true;

    // @ts-ignore
    var print = () => log(this.history.loc(), this.sequence.type.magenta() + (this.sequence.name ? ` ${this.sequence.name}`.green() : ''), this.sequence.value || this.char.curr)

    while (!this.blocking_error && this.index < this.source.length) {

      this.char.prev = this.source[this.index - 1];
      this.char.curr = this.source[this.index];
      this.char.next = this.source[this.index + 1];

      if (this.stop_immediate) {
        if (debug) {
          print()
        }
        this.stop_immediate = false;
        return this.sequence;
      }

      if (this.check_new_line(debug)) {
        continue;
      }

      if (this.parse_literal()) {
        continue;
      }

      if (this.parse_number()) {
        continue;
      }

      if (this.skip_multiple_whitespace()) {
        continue;
      }

      if (check_is_keyword) {

        check_is_keyword = this.is.alpha(this.sequence.value + this.char.curr);
        if (check_is_keyword) {
          if (!this.maybe.has('keyword')) {
            // log('is keyword;y')
            this.maybe.add('keyword').delete('token');
          }
        } else {
          this.maybe.delete('keyword');
          if (this.is.identifier(this.sequence.value + this.char.curr)) {
            this.sequence.type = 'identifier';
            this.expected.add('identifier');
          }

        } 
      }

      if (this.parse_token()) {
        continue;
      }

      if (this.expected.has('identifier')) {
        if (!this.is.identifier(this.sequence.value + this.char.curr)) {
          if (debug) print();
          return this.sequence;
        }
      }

      if (/[\s\r\n]/.test(this.char.curr)) {
        if (this.sequence.value) {
          this.stop_immediate = true;
          continue;
        } else {
          if (debug) print();
          ++this.index, ++this.pos;
          return this.char.curr;
        }
      }

      // if (this.stop_immediate) {

      //   if (this.sequence.type === 'unknown') {

      //     if (this.is.keyword(this.sequence.value)) {
      //       this.sequence.type = 'keyword'
      //     } else if (this.is.identifier(this.sequence.value)) {
      //       this.sequence.type = 'identifier'
      //     } else if (this.is.number(this.sequence.value)) {
      //       this.sequence.type = 'number'
      //     }
      //   }

      //   if (debug) print();
      //   this.stop_immediate = false;
      //   return this.sequence;
      // }

      this.sequence.value += this.char.curr;

      ++this.index, ++this.pos;

    }

  }

  parse_program() {
    log('start parse program;y');
    let index = 40;

    while(index > 0) {
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
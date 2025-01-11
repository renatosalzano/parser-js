import { log } from "utils";
import Context from "./Context";
import History from "./History";
import parser from './index'
import Program from "./Progam";

type TokenType = 'unknown' | 'literal' | 'operator' | 'bracket' | 'keyword' | 'separator' | 'identifier' | 'number';

class Parser {

  Program = new Program();
  source = '';

  context: Context;
  history = new History(this);

  api: any = {};

  program = new Map<string, Function>()

  
  token = new Map<string, 'operator' | 'bracket' | 'separator'>();
  uniform_token = new Map<string, 'operator' | 'bracket' | 'separator'>();
  unexpected_token = new Set<string>();

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
          if (this.is_uniform_token(token)) {
            this.uniform_token.set(token, type)
          }
          this.token.set(token, type);
          this.is.token = (_:string) => this.token.has(_);
        }

        this[type].set(token, t);
        this.is[type] = (_:string) => this[type].has(_);
      }
    }
  }

  is_uniform_token = (str: string) => {
    if (str.length === 1) return false;
    const first_char = str[0];
    return str.split('').every(ch => ch === first_char)
  }


  check_uniform_token = () => {

    for (const [token, type] of this.uniform_token) {
      let len = token.length -2;
      let char = token[0];
      while(len > 0) {
        char += char;
        if (!this.token.has(char)) {
          // TODO DESCRIBE WHAT HAPPEN
          this.unexpected_token.add(char);
          this.token.set(char, type);
        }
        --len;
      }

      this.uniform_token.delete(token);
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
    type: 'unknown' as TokenType,

  }

  maybe?: 'keyword';
  expected?: TokenType | 'token';

  should_continue = false;
  blocking_error = false;

  parse: any = {};

  expected_test: { is_testing?: boolean } & (() => boolean | undefined | void) = function () { };

  increment() {
    this.sequence.value += this.char.curr;
    ++this.index, ++this.pos;
  }

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

  skip_whitespace = (debug = false) => {
    // dont eat whitespace during parse string
    if (this.expected === 'literal') return false;
    if (this.sequence.value === '' && (this.is.space(this.char.curr) || /[\n]/.test(this.char.curr))) {
      ++this.index, ++this.pos;
      return true;
    }

    if (this.is.space(this.char.curr) && this.is.space(this.char.next)) {
      ++this.index, ++this.pos;
      return true
    }
  }

  check_token_type = (debug = false) => {
    if (this.expected || this.maybe) return;
    // console.log('check token:', this.char.curr);
    switch (true) {
      case this.is.quote(this.char.curr): {
        this.sequence.type = 'literal';
        this.expected = 'literal';
        break;
      }
      case this.is.number(this.char.curr): {
        this.expected = 'number';
        break;
      }
      case this.is.identifier(this.char.curr): {
        if (this.is.alpha(this.char.curr)) {
          this.maybe = 'keyword';
        } else {
          this.sequence.type = 'identifier';
          this.expected = 'identifier';
        }
        break;
      }
      default: {
        this.expected = 'token';
      }
    }
    if (this.expected) {
      if (debug) log(this.history.loc(), this.char.curr, 'expected:;g', this.expected)
    } else {
      if (debug) log(this.history.loc(), this.char.curr, 'maybe:;y', 'keyword')
    }
  }

  end_quote = '';
  parse_literal() {

    if (this.expected === 'literal') {

      if (!this.end_quote) {
        this.end_quote = this.char.curr;
        this.sequence.value += this.char.curr;
        ++this.index, ++this.pos;
        return true;
      }

      switch (true) {
        case (this.char.curr !== this.end_quote):
          return false;
        case (`${this.char.prev}${this.char.curr}` !== `\\${this.end_quote}`): {
          // end parsing string
          this.end_quote = '';
          this.stop_immediate = true;
          this.sequence.value += this.char.curr;
          ++this.index, ++this.pos;
          return true;
        }
      }
      return true;
    }

   return false
  }

  parsing_number = false;
  parse_number = () => {

    // if (this.expected.has('identifier')) return false;
    // if (this.is.space(this.char.curr)) return false;

    // const is_number = this.is.number(this.sequence.value + this.char.curr);

    // if (is_number) {
    //   this.expected.add('number');
    //   this.sequence.type = 'number';
      
    //   this.parsing_number = true;
    //   this.sequence.value += this.char.curr;
    //   ++this.index, ++this.pos;
    //   return true;
    // } else {
      
    //   if (this.parsing_number) {
    //     this.parsing_number = false;
    //     this.stop_immediate = true;
    //     ++this.index, ++this.pos;
    //     return true;
    //   }
    // }

    return false;
  }


  parse_token = (debug = false) => {

    if (this.expected === 'token') {

      const is_token = this.is.token(this.sequence.value + this.char.curr);

      if (is_token) {
        this.sequence.value += this.char.curr;
        ++this.index, ++this.pos;
        return true;
      } else {
        // end token
        console.log('end token', this.sequence.value)
        const type = this.token.get(this.sequence.value);
        if (this.is.token(this.char.curr)) {
          const next_type = this.token.get(this.char.curr);
          if (type === 'operator' && next_type === 'operator') {
            log(`unexpected operator "${this.sequence.value + this.char.curr}";r`)
          }
        }

        if (type) {
          this.sequence.type = type
          this.sequence.name = this[type].get(this.sequence.value) || '';
          this.stop_immediate = true;
          return true
        } else {
          log('unexpected token;r')
        }
        return false
      }

    }
    return false
  }


  parse_keyword = (debug = false) => {
    if (this.maybe === 'keyword') {
      if (this.is.alpha(this.sequence.value + this.char.curr)) {
        this.sequence.value += this.char.curr;
        ++this.index, ++this.pos;
        return true;
      } else {

        if (this.is.identifier(this.sequence.value + this.char.curr)) {
          this.sequence.type = 'identifier';
          this.expected = 'identifier';
          this.maybe = undefined;
          return false;
        }

        // check if keyword exist
        if (this.keyword.get(this.sequence.value)) {
          this.sequence.type = 'keyword';
          this.sequence.name = this.keyword.get(this.sequence.name) || '';
          this.stop_immediate = true;
          return true
        } else {
          log('unexpected keyword;r')
        }

      }
    }
    return false;
  }


  parse_identifier = (debug = false) => {
    if (this.expected === 'identifier') {
      if (this.is.identifier(this.sequence.value + this.char.curr)) {
        this.sequence.value += this.char.curr;
        ++this.index, ++this.pos;
        return true;
      } else {
        // end identifier
        this.stop_immediate = true;
        return true
      }
    }
    return false;
  }


  eat = (sequence: string, breakReg?: RegExp) => {

    // if (sequence !== this.next(breakReg)) {
    //   this.prev();
    // }
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

    this.maybe = undefined;
    this.expected = undefined;

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

      if (this.skip_whitespace()) {
        continue;
      }

      this.check_token_type()

      if (this.parse_literal()) {
        continue;
      }

      if (this.parse_token()) {
        continue;
      }

      if (this.parse_keyword()) {
        continue;
      }

      if (this.parse_identifier()) {
        continue;
      }

      this.sequence.value += this.char.curr;

      ++this.index, ++this.pos;

    }

  }

  parse_program() {
    log('start parse program;y');
    let index = 10;

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

      if (this.skip_whitespace()) {
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
import { log } from "utils";
import Context from "./Context";
import History from "./History";
import Program from "./Progam";
import { create_fast_get } from "./utils";

export type TokenType = 'unknown' | 'literal' | 'operator' | 'bracket' | 'keyword' | 'separator' | 'identifier' | 'number';
export type Token = {
  value: string;
  type: TokenType;
  name?: string;
  eq(comparator: string | RegExp): boolean;
} & {
  [K in TokenType]?: boolean;
}

export type DebugNext = {
  comment?: boolean;
  newLine?: boolean;
  token?: boolean;
  number?: boolean;
  keyword?: boolean;
  literal?: boolean;
  checkToken?: boolean;
  expected?: boolean;
}

class Tokenizer {

  source = '';

  Context: Context;

  Program: Program;
  History = new History(this);

  api: any = {};

  program = new Map<string, Function>()

  token = new Map<string, 'operator' | 'bracket' | 'separator'>();
  token_max_len = 4;
  get_token = create_fast_get('token', 4);

  keyword = new Map<string, string>();
  keyword_type = new Map<string, TokenType>();
  keyword_max_len = 8;
  get_keyword = create_fast_get('keyword', 8);

  operator = new Map<string, string>();
  bracket = new Map<string, string>();
  separator = new Map<string, string>();

  reference = new Map<string, string>();

  constructor() {
    this.Context = new Context(this);
    this.Program = new Program(this);

    this.api = {
      ctx: this.Context.ctx,
      char: this.char,
      token: this.Token,
      expectedToken: this.expected_token,
      nextLiteral: this.next_literal,
      currentContext: this.Context.get_current,
      isIdentifier: this.is.identifier,
      eachChar: this.each_char,
      createNode: this.Program.createNode,
      appendNode: this.Program.appendNode,
      createRef: this.Program.createRef,
      logNode: this.Program.log,
      startContext: this.Context.start,
      endContext: this.Context.end,
      next: this.next,
      expected: this.expected_next,
      eat: this.eat,
      error: this.error
    }
  }

  async Parse(source: string) {
    this.source = source;
    log('start parse program;y');
    await this.parse_program()
    log('end parse program;g')
  }

  extend = (type: "operator" | "bracket" | 'separator' | 'keyword', map: { [key: string]: string } = {}) => {

    for (const [token, t] of Object.entries(map)) {

      if (this.token.has(token)) {
        log(`warn: duplicate "${token}" found in ${type};y`)
      } else {

        if (this.is.alpha(token) || type === 'keyword') {
          this.keyword.set(token, t);
          this.keyword_type.set(token, type);

          if (token.length > this.keyword_max_len) {
            this.keyword_max_len = token.length;
            this.get_keyword = create_fast_get('keyword', token.length);
          }
        } else {
          this.token.set(token, type);

          if (token.length > this.token_max_len) {
            this.token_max_len = token.length;
            this.get_token = create_fast_get('token', token.length);
          }
        }

        this[type].set(token, t);
        // this.is[type] = (_: string) => this[type].has(_);
      }
    }
  }


  is = {
    quote: (char: string) => /['|"]/.test(char),
    space: (char: string) => /[\s\t]/.test(char),
    nl: (char: string) => /[\r\n]/.test(char),
    identifier: (sequence: string) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(sequence),
    alpha: (sequence: string) => /^[a-z]*$/.test(sequence),
    number: (sequence: any) => !isNaN(sequence),
    comment: () => {
      const sequence = `${this.char.curr}${this.char.next}`;
      if (sequence === '//') return 'comment';
      if (sequence === '/*') return 'comment multiline';
    }
  }

  line = 1
  pos = 1;

  index = 0;
  char = { curr: '', prev: '', next: '' };

  Token: Token = {
    value: '',
    type: 'unknown' as TokenType,
    eq(_: string | RegExp) {
      if (_ instanceof RegExp) {
        return _.test(this.value);
      }
      return this.value === _;
    }
  }

  set_token_type = (type?: TokenType) => {
    if (type) {
      switch (type) {
        case 'keyword': {
          type = this.keyword_type.get(this.Token.value) || 'keyword';

          this.Token.type = type;
          this.Token[type] = true;
          this.Token.name = this.keyword.get(this.Token.value) || '';

          break;
        }
        case 'bracket':
        case 'separator':
        case 'operator': {
          this.Token.type = type;
          this.Token[type] = true;
          this.Token.name = this[type].get(this.Token.value) || '';
          break;
        }
        default: {
          this.Token.type = type;
          this.Token[type] = true;
        }
      }
    } else {
      delete this.Token.name;
      delete this.Token[this.Token.type];
      this.Token.type = 'unknown';
    }
  }

  expected_token = {} as Token;

  maybe?: TokenType;
  expected?: TokenType | 'token' | 'comment' | 'comment multiline';
  forced_expected?: TokenType;
  blocking_error = false;

  parse: any = {};
  debug: DebugNext = {};
  command: 'next' | 'expected' = 'next';

  check_new_line(debug: DebugNext = {}) {
    if (/[\r\n]/.test(this.char.curr)) {
      if (this.char.curr === '\r') {
        // if is windows eat \r and go to the next char
        this.index += 1
        return true;
      }

      if (this.expected === 'comment') {
        if (debug.comment) log(this.History.loc(), 'comment end;g');
        this.expected = undefined;
        this.Token.value = '';
      }

      this.pos = 1, ++this.line;
      if (debug.newLine) log('Ln:;c', this.line);
    }
  }

  skip_whitespace = (debug: DebugNext = {}) => {
    // dont eat whitespace during parse string
    if (this.expected === 'literal') return false;

    if (this.Token.value === '' && (this.is.space(this.char.curr) || /[\n]/.test(this.char.curr))) {
      ++this.index, ++this.pos;
      return true;
    }

    if (this.is.space(this.char.curr) && this.is.space(this.char.next)) {
      ++this.index, ++this.pos;
      return true
    }
  }

  check_token_type = (debug: DebugNext = {}) => {
    if (this.expected || this.maybe) return;
    const is_comment = this.is.comment();

    switch (true) {
      case !!is_comment: {
        if (debug.comment) log(this.History.loc(), 'comment start;g')
        this.expected = is_comment;
        break;
      }
      case this.is.quote(this.char.curr): {
        this.set_token_type('literal');
        this.expected = 'literal';
        break;
      }
      case this.is.number(this.char.curr): {
        this.set_token_type('number');
        this.expected = 'number';
        break;
      }
      case this.is.identifier(this.char.curr): {

        if (/[_$]/.test(this.char.curr)) {
          // when char is $ | '_'
          const possibly_token = this.get_token(this);
          if (possibly_token) {
            if (!this.is.identifier(possibly_token)) {
              this.expected = 'token';
              break;
            }
          }
        }

        if (this.is.alpha(this.char.curr)) {
          this.maybe = 'keyword';
        } else {
          this.set_token_type('identifier');
          this.expected = 'identifier';
        }
        break;
      }
      default: {
        this.expected = 'token';
      }
    }
    if (this.expected) {
      if (debug.checkToken) log(this.History.loc(), this.char.curr, 'expected:;g', this.expected)
    } else {
      if (debug.checkToken) log(this.History.loc(), this.char.curr, 'maybe:;y', 'keyword')
    }
  }

  parse_comment(debug: DebugNext = {}) {

    if (this.expected === 'comment multiline') {
      if (`${this.char.curr}${this.char.next}` === '*/') {
        this.index += 2, this.pos += 2;
        if (debug.comment) log(this.History.loc(), 'comment multine end;g');
        this.expected = undefined;
        this.Token.value = '';
        return true;
      }
    }
  }

  next_literal = (end_token: string | string[]) => {
    if (end_token) {
      this.set_token_type();
      this.forced_expected = 'literal';
      this.set_token_type('literal');

      if (typeof end_token === 'string') {
        this.end_token = [end_token];
      } else {
        this.end_token = end_token;
      }

      let token_len = 1;
      for (const token of this.end_token) {
        if (!this.token.has(token)) {
          log(`invalid token "${token}";r`);
        } else {
          token_len = Math.max(token_len, token.length);
        }
      }
      this.get_token_in_literal = create_fast_get('token', token_len);
      const token = this.next();

      this.forced_expected = undefined;
      this.get_token_in_literal = undefined;
      return token;
    } else {
      'Endtoken;r'
    }
  }

  end_token?: string[];
  get_token_in_literal?: Function;
  parse_literal() {

    if (this.expected === 'literal') {

      if (!this.end_token) {
        // "regular string" '' | ""
        this.end_token = [this.char.curr];
        this.Token.value += this.char.curr;
        ++this.index, ++this.pos;
        return true;
      }

      const token = this.get_token_in_literal
        ? this.get_token_in_literal(this)
        : undefined;

      switch (true) {
        case (token !== undefined): {
          this.stop_immediate = true;
          break;
        }
        case (this.char.curr !== this.end_token[0]):
          return false;
        case (`${this.char.prev}${this.char.curr}` !== `\\${this.end_token[0]}`): {
          // end parsing "regular string"
          this.end_token = undefined;
          this.stop_immediate = true;
          this.Token.value += this.char.curr;
          this.Token.value = this.Token.value.slice(1, -1);
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

    if (this.expected === 'number') {

      if (!this.is.space(this.char.curr) && this.is.number(this.Token.value + this.char.curr)) {
        this.Token.value += this.char.curr;
        ++this.index; ++this.pos;
        return true;
      } else {
        // expected end number;
        this.stop_immediate = true;
        return true;
      }
    }

    return false;
  }


  parse_token = (debug: DebugNext = {}) => {

    if (this.expected === 'token') {

      const token = this.get_token(this);

      if (token) {
        const token_type = this.token.get(token);
        if (!token_type) return; // unexpected error;
        this.index += token.length;
        this.pos += token.length;

        // if (token === '-' || token === '+') {
        //   const next_token = this.next();
        //   if (next_token?.type === 'number') {
        //     if (token === '-') {
        //       this.Token.value = '-' + this.Token.value;
        //     }
        //     this.stop_immediate = true;
        //     return true;
        //   } else {
        //     this.History.back();
        //   }
        // }

        if (token_type === 'operator') {
          const next_token = this.get_token(this);
          if (next_token && this.token.get(next_token) === 'operator') {
            log(`unexpected operator: ${token + next_token} at ${this.History.loc(true)};r`)
            // TODO BLOCKING ERROR
          }
        }

        this.Token.value = token;
        this.set_token_type(token_type)

        this.stop_immediate = true;
        return true;
      } else {
        log(`error: unexpected token`)
      }

    }
    return false
  }


  parse_keyword = (debug: DebugNext = {}) => {
    if (this.maybe === 'keyword') {

      const keyword = this.get_keyword(this);
      if (!keyword) {
        this.maybe = undefined;
        this.expected = 'identifier';
        return false;
      }

      this.index += keyword.length;
      this.pos += keyword.length;
      this.Token.value += keyword;

      const next_char = this.source[this.index];
      if (this.is.identifier(keyword + next_char)) {
        this.set_token_type('identifier');
        this.expected = 'identifier';
        this.maybe = undefined;
        return true;
      }

      this.set_token_type('keyword');
      this.stop_immediate = true;
      return true;
    }
    return false;
  }


  parse_identifier = (debug: DebugNext = {}) => {
    if (this.expected === 'identifier') {

      if (this.is.identifier(this.Token.value + this.char.curr)) {
        this.Token.value += this.char.curr;
        ++this.index, ++this.pos;
        return true;
      } else {
        // end identifier
        this.set_token_type('identifier');
        this.stop_immediate = true;
        return true
      }
    }
    return false;
  }


  eat = (from: string, to?: string, config?: any) => {

    // if (sequence !== this.next(breakReg)) {
    //   this.prev();
    // }
  }

  prev = () => {
    // const len = this.sequence.length + 1;
    // this.index -= len;
    // this.pos -= len;
  }

  expected_next = (comparator?: string | ((token: Token) => boolean), debug = false) => {

    const print = () => {
      if (this.debug.expected || debug) {
        log(this.History.loc(), '(cached);c', this.expected_token.type + ';m', this.expected_token.value);
      }
    }

    if (this.History.stashed && this.History.compare(this.History.stashed)) {

      print();

    } else {

      const next_token = this.next("suppress");

      this.expected_token.value = next_token.value;
      this.expected_token.type = next_token.type;
      this.expected_token[next_token.type] = true;
      if (next_token.name) this.expected_token.name = next_token.name;
      // cache position next token
      this.History.stash();

      print();
    }

    let expected = false;

    if (comparator) {

      if (typeof comparator === 'function') {
        expected = comparator(this.expected_token);

        if (this.debug.expected || debug) {
          log('expected test:;c', this.expected_token.value, this.expected_token.type, '=>;m', expected);
        }
      } else {
        expected = this.expected_token.value === comparator || this.expected_token.type === comparator;

        if (this.debug.expected || debug) {
          log('expected test:;c', comparator, 'eq;m', this.expected_token.value, '|;m', this.expected_token.type, expected);
        }
      }
    }

    return expected;
  }

  stop_immediate = false;

  next = (debug: boolean | 'suppress' = false) => {

    this.Token.value = '';

    if (!this.forced_expected) {

      this.set_token_type();
      this.maybe = undefined;
      this.expected = undefined;
    } else {

      this.expected = this.forced_expected;
    }


    const print = () => {
      if (this.debug.token || debug) {
        // @ts-ignore
        log(this.History.loc(), this.Token.type.magenta() + (this.Token.name ? ` ${this.Token.name}`.green() : ''), this.Token.value || this.char.curr)
      }
    }

    if (this.History.stashed) {

      try {

        this.expected_token = {} as Token;

        this.History.apply();

        print();

        this.History.push();

        return this.Token;
      } catch (error) {
        // @ts-ignore
        console.log(error.red());
        this.next();
      }
    }

    while (!this.blocking_error && this.index < this.source.length) {

      this.char.prev = this.source[this.index - 1];
      this.char.curr = this.source[this.index];
      this.char.next = this.source[this.index + 1];

      if (this.parse_comment()) {
        continue;
      }

      if (this.stop_immediate) {

        print();

        this.stop_immediate = false;

        if (this.Token.unknown) {
          log('unexpected token;r')
        }
        this.History.push();

        return this.Token;
      }

      if (this.check_new_line()) {
        continue;
      }

      if (this.skip_whitespace()) {
        continue;
      }

      this.check_token_type()

      if (this.parse_literal()) {
        continue;
      }

      if (this.parse_number()) {
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

      this.Token.value += this.char.curr;

      ++this.index, ++this.pos;

    }

    if (this.index === this.source.length) {
      this.Token.value = 'end';
      return this.Token;
    }

    return this.Token;
  }

  end_program = false;

  parse_program() {

    // this.debug.token = true;

    // let index = 10
    // while (index > 0) {
    //   this.next()
    //   --index;
    // }
    this.debug.token = true;
    this.debug.expected = true;

    this.next();
    this.next();
    this.next();
    this.next();
    this.next();
    this.next();
    this.next();
    this.next();
    this.program.get(this.Token.value)();
    this.next();
    this.next();
    this.next();
    this.next();
    this.program.get(this.Token.value)();


    // this.next()
    // if (this.Token.value === 'end') {
    //   console.log('end source');
    //   console.log(this.Program.toString())
    //   this.end_program = true;
    //   return;
    // }
    // log('Program token:;g', this.Token.value);
    // const start_context = this.program.get(this.Token.value);
    // if (start_context) {
    //   start_context()
    // } else {
    //   this.Context.default.start()
    // }

  }

  error = (message: string) => {
    log('ERROR;R', `${message} at ${this.line}:${this.pos}`);
  }

  each_char = (callback: (char: string, sequence: string) => boolean | undefined) => {

    //   this.should_continue = true;
    //   this.sequence.value = '';

    //   while (this.should_continue && this.index < this.source.length) {

    //     this.char.prev = this.source[this.index - 1];
    //     this.char.curr = this.source[this.index];
    //     this.char.next = this.source[this.index + 1];

    //     if (this.skip_whitespace()) {
    //       continue;
    //     }

    //     this.sequence.value += this.char.curr;

    //     if (callback(this.char.curr, this.sequence.value)) {
    //       this.should_continue = false;
    //       return;
    //     }

    //     ++this.index, ++this.pos;
    //   }

  }

}

export default Tokenizer
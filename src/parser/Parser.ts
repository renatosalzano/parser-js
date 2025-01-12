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
  eq(comparator: string): boolean;
} & {
  [K in TokenType]?: boolean;
}

class Parser {

  Program = new Program();
  source = '';

  context: Context;
  history = new History(this);

  api: any = {};

  program = new Map<string, Function>()


  token = new Map<string, 'operator' | 'bracket' | 'separator'>();
  token_max_len = 4;
  get_token = create_fast_get('token', 4);

  keyword = new Map<string, string>();
  keyword_max_len = 8;
  get_keyword = create_fast_get('keyword', 8);

  operator = new Map<string, string>();
  bracket = new Map<string, string>();
  separator = new Map<string, string>();

  reference = new Map<string, string>();

  constructor() {
    this.context = new Context(this);
    // this.source = source;

    this.api = {
      char: this.char,
      token: this.Token,
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
          // this.is.keyword = (_: string) => this.keyword.has(_);
          if (token.length > this.keyword_max_len) {
            this.keyword_max_len = token.length;
            this.get_keyword = create_fast_get('keyword', token.length);
          }
        } else {
          this.token.set(token, type);
          // this.is.token = (_: string) => this.token.has(_);
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
    // operator: (_: string) => false,
    // bracket: (_: string) => false,
    // separator: (_: string) => false,
    // token: (_: string) => false,
    // keyword: (_: string) => false,
    quote: (char: string) => /['|"|`]/.test(char),
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
  char = {
    curr: '',
    prev: '',
    next: ''
  }

  Token: Token = {
    value: '',
    type: 'unknown' as TokenType,
    eq(_: string) {
      return this.value === _;
    }
  }

  reset_token() {
    this.Token = {
      value: '',
      name: '',
      type: 'unknown',
      eq(_: string) {
        return this.value === _;
      }
    }
  }

  maybe?: TokenType;
  expected?: TokenType | 'token' | 'comment' | 'comment multiline';
  blocking_error = false;

  parse: any = {};

  check_new_line(debug = false) {
    if (/[\r\n]/.test(this.char.curr)) {
      if (this.char.curr === '\r') {
        // if is windows eat \r and go to the next char
        this.index += 1
        return true;
      }

      if (this.expected === 'comment') {
        log(this.history.loc(), 'comment end;g');
        this.expected = undefined;
        this.Token.value = '';
      }

      this.pos = 1, ++this.line;
      this.history.push();
      if (debug) log('Ln:;c', this.line);
    }
  }

  skip_whitespace = (debug = false) => {
    // dont eat whitespace during parse string
    if (this.expected === 'literal') return false;
    if (this.expected === 'number') {
      if (this.is.space(this.char.curr)) {
        log('unexpected number;r')
      }
    }
    if (this.Token.value === '' && (this.is.space(this.char.curr) || /[\n]/.test(this.char.curr))) {
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
    const is_comment = this.is.comment();

    switch (true) {
      case !!is_comment: {
        log(this.history.loc(), 'comment start;g')
        this.expected = is_comment;
        break;
      }
      case this.is.quote(this.char.curr): {
        this.Token.type = 'literal';
        this.Token['literal'] = true;
        this.expected = 'literal';
        break;
      }
      case this.is.number(this.char.curr): {
        this.Token.type = 'number';
        this.Token['number'] = true;
        this.expected = 'number';
        break;
      }
      case this.is.identifier(this.char.curr): {
        if (this.is.alpha(this.char.curr)) {
          this.Token.type = 'identifier';
          this.maybe = 'keyword';
        } else {
          this.Token.type = 'identifier';
          this.Token['identifier'] = true;
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

  parse_comment() {

    if (this.expected === 'comment multiline') {
      if (`${this.char.curr}${this.char.next}` === '*/') {
        this.index += 2, this.pos += 2;
        log(this.history.loc(), 'comment multine end;g');
        this.expected = undefined;
        this.Token.value = '';
        return true;
      }
    }
  }

  end_quote = '';
  parse_literal() {

    if (this.expected === 'literal') {

      if (!this.end_quote) {
        this.end_quote = this.char.curr;
        this.Token.value += this.char.curr;
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
          this.Token.value += this.char.curr;
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

      if (this.is.number(this.Token.value + this.char.curr)) {
        this.Token.value += this.char.curr;
        ++this.index; ++this.pos;
        return true;
      } else {
        // expected end number;
        this.stop_immediate = true;
        ++this.index; ++this.pos;
        return true;
      }
    }

    return false;
  }


  parse_token = (debug = false) => {

    if (this.expected === 'token') {

      const token = this.get_token(this);

      if (token) {
        const token_type = this.token.get(token);
        if (!token_type) return; // unexpected error;
        this.index += token.length;
        this.pos += token.length;

        if (token === '-' || token === '+') {
          const next_token = this.next();
          if (next_token?.type === 'number') {
            if (token === '-') {
              this.Token.value = '-' + this.Token.value;
            }
            this.stop_immediate = true;
            return true;
          } else {
            this.history.prev();
          }
        }

        if (token_type === 'operator') {
          const next_token = this.get_token(this);
          if (next_token && this.token.get(next_token) === 'operator') {
            log(`unexpected operator: ${token + next_token} at ${this.history.loc(true)};r`)
            // TODO BLOCKING ERROR
          }
        }

        this.Token.value = token;
        this.Token.type = token_type;
        this.Token[token_type] = true;
        this.Token.name = this[token_type].get(token) || '';
        this.stop_immediate = true;
        return true;
      } else {
        log(`error: unexpected token`)
      }

    }
    return false
  }


  parse_keyword = (debug = false) => {
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
        this.Token.type = 'identifier';
        this.Token['identifier'] = true;
        this.expected = 'identifier';
        this.maybe = undefined;
        return true;
      }

      this.Token.type = 'keyword';
      this.Token['keyword'] = true;
      this.Token.name = this.keyword.get(keyword) || '';
      this.stop_immediate = true;
      return true;
    }
    return false;
  }


  parse_identifier = (debug = false) => {
    if (this.expected === 'identifier') {

      if (this.is.identifier(this.Token.value + this.char.curr)) {
        this.Token.value += this.char.curr;
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

    this.Token.value = '';
    delete this.Token.name;
    delete this.Token[this.Token.type];
    this.Token.type = 'unknown';

    this.maybe = undefined;
    this.expected = undefined;

    // @ts-ignore
    var print = () => log(this.history.loc(), this.Token.type.magenta() + (this.Token.name ? ` ${this.Token.name}`.green() : ''), this.Token.value || this.char.curr)

    while (!this.blocking_error && this.index < this.source.length) {

      this.char.prev = this.source[this.index - 1];
      this.char.curr = this.source[this.index];
      this.char.next = this.source[this.index + 1];

      if (this.parse_comment()) {
        continue;
      }

      if (this.stop_immediate) {
        if (debug) {
          print()
        }
        this.stop_immediate = false;
        if (this.Token.unknown) {
          log('unexpected token;r')
        }
        return this.Token;
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

  }

  parse_program() {
    log('start parse program;y');

    this.next();
    const start_context = this.program.get(this.Token.value);
    if (start_context) {
      start_context()
    } else {
      console.log(this.Token)
      this.context.default.start()
    }

    // let index = 10;
    // while (index > 0) {
    //   this.next(true);
    //   --index;
    // }

    log('end parse program;g')


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

export default Parser
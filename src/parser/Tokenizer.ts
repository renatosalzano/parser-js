import { log } from "utils";
import Context from "./Context";
import History from "./History";
import Program from "./Progam";
import { create_fast_get } from "./utils";

export type TokenType = 'unknown' | 'string' | 'operator' | 'bracket' | 'keyword' | 'separator' | 'identifier' | 'number' | 'special' | 'newline';
export type Token = {
  value: string;
  type: TokenType;
  location: { line: number; start: number; end: number };
  eq(comparator: string | RegExp): boolean;
}

export type DebugNext = {
  comment?: boolean;
  newline?: boolean;
  token?: boolean;
  number?: boolean;
  keyword?: boolean;
  literal?: boolean;
  checkToken?: boolean;
  expected?: boolean;
  TokenBuffer?: boolean;
}

export type Error = {
  title?: string;
  message: string;
  type?: 'error' | 'warn' | 'info';
  at?: string;
}


type Extend = (
  type: "operator" | "bracket" | "separator" | "keyword" | "special" | "comment",
  token: string[] | string[][]
) => void;

type Tokenize = { [key: string]: () => "next" | "continue" | void }

class Tokenizer {

  source = '';

  Context: Context;

  Program: Program;
  History = new History(this);

  api: any = {}

  program = new Map<string, Function>()

  token = new Map<string, 'operator' | 'bracket' | 'separator' | 'special' | 'comment'>();

  max_len = { token: 1, keyword: 1 };
  get_token = create_fast_get('token', 1);

  keyword = new Map<string, string>();
  get_keyword = create_fast_get('keyword', 1);

  comment_token = new Map<string, { multiline: boolean, end_token: string }>();

  parse: any = {};

  constructor() {
    this.Context = new Context(this);
    this.Program = new Program();

    this.api = new Proxy({
      char: this.char,
      token: this.Token,
      nextToken: this.next_token,
      debug: this.debug,
      next: this.next,
      nextString: this.next_string,
      expected: this.expected,
      traverseTokens: this.traverse_tokens,
      currentContext: this.Context.get_current,
      isIdentifier: this.is.identifier,
      eachChar: this.each_char,
      eat: this.eat,
      error: this.error,
      /* PROGRAM */
      createNode: this.Program.createNode,
      appendNode: this.Program.appendNode,
      logNode: this.Program.log,
      /* CONTEXT */
      ctx: this.Context.context,
      startContext: this.Context.start,
      endContext: this.Context.end,
    }, {
      get(api, p) {
        return Reflect.get(api, p)
      },
      set(api, p, v) {
        return Reflect.set(api, p, v)
      }
    })


    this.api.char

  }

  async Parse(source: string) {
    this.source = source;
    log('start parse program;y');
    await this.parse_program()
    log('end parse program;g')
  }

  extend: Extend = (type, tokens) => {

    if (type === 'comment') {

      for (const [start, end] of tokens as string[][]) {

        if (end) {

          if (this.token.has(end)) {
            log(`Duplicate token "${end}" found in ${this.token.get(end)};y`);
          } else {
            this.token.set(end, 'comment');
          }
        }

        if (this.token.has(start)) {
          log(`Duplicate token "${start}" found in ${this.token.get(start)};y`);
        } else {
          this.token.set(start, 'comment');
        }

        this.comment_token.set(start, {
          multiline: end !== undefined,
          end_token: end || '\n'
        });

      };

      return;
    }

    for (const token of tokens as string[]) {

      if (this.token.has(token)) {
        log(`warn: duplicate "${token}" found in ${type};y`);
      } else {

        if (this.is.alpha(token) || type === 'keyword') {

          this.keyword.set(token, type);

          if (token.length > this.max_len.keyword) {
            this.max_len.keyword = token.length;
            this.get_keyword = create_fast_get('keyword', token.length);
          }

        } else {
          this.token.set(token, type);

          if (token.length > this.max_len.token) {
            this.max_len.token = token.length;
            this.get_token = create_fast_get('token', token.length);
          }
        }
      }
    }
  }


  is = {
    quote: (char: string) => /['|"]/.test(char),
    space: (char: string) => /[\s\t]/.test(char),
    nl: (char: string) => /[\r\n]/.test(char),
    identifier: (sequence: string) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(sequence),
    alpha: (sequence: string) => /^[a-z]*$/.test(sequence),
    number: (_: string) => /^\d+$/.test(_)
  }


  line = 1
  pos = 1;

  index = 0;
  char = { curr: '', next: '' };

  Token: Token = {
    value: '',
    type: 'unknown' as TokenType,
    location: {} as Token['location'],
    eq(_: string | RegExp) {
      if (_ instanceof RegExp) {
        switch (true) {
          case (_.test(this.value)):
            return true;
          case (_.test(this.type)):
            return true;
        }
        return false;
      }
      return this.value === _ || this.type === _;
    }
  }

  next_token: Partial<Token> = {};

  set_token_type = (type?: TokenType) => {
    if (type) {
      this.Token.type = type;
    } else {
      this.Token.type = 'unknown';
    }
  }

  expected_token: keyof Tokenizer['tokenize'] = 'token';
  skip_newline = true;

  blocking_error = false;

  debug: DebugNext = {};


  skip_whitespace = () => {

    const skip_reg = this.skip_newline
      ? /\s/
      : / /;

    while (this.index < this.source.length) {
      this.char.curr = this.source[this.index];

      if (skip_reg.test(this.char.curr)) {

        if (this.skip_newline && this.char.curr === '\n') {
          ++this.index, ++this.line, this.pos = 1;
          if (this.debug.newline) log('Ln:;c', this.line);
        } else {
          ++this.index, ++this.pos;
        }

      } else { break };

    };

  }

  check_new_line() {
    if (/[\r\n]/.test(this.char.curr)) {

      if (this.char.curr === '\r') {
        return "next";
      }

      this.pos = 1, ++this.line;
      if (this.debug.newline) log('Ln:;c', this.line);
    }
  }

  check_token_type = () => {

    this.History.set_token_start();

    switch (true) {
      case (this.is.nl(this.char.curr)): {
        if (this.char.curr === '\r') {
          ++this.index, ++this.pos;
        }
        this.expected_token = 'newline';
        break;
      }
      case this.is.quote(this.char.curr): {
        this.expected_token = 'string';
        break;
      }
      case this.is.number(this.char.curr): {
        this.Token.type = 'number';
        this.expected_token = 'number';
        break;
      }
      case this.is.identifier(this.char.curr): {

        if (/[_$]/.test(this.char.curr)) {
          // when char is $ | '_'
          const possibly_token = this.get_token(this);
          if (possibly_token) {
            if (!this.is.identifier(possibly_token)) {
              // ignore
              break;
            }
          }
        }

        if (this.is.alpha(this.char.curr)) {
          this.Token.type = 'keyword';
          this.expected_token = 'keyword';
        } else {
          this.Token.type = 'identifier';
          this.expected_token = 'identifier';
        }
        break;
      }
      default:
        this.expected_token = 'token';
    }

    if (this.debug.checkToken) log('check token;c', 'expected:;g', this.expected_token);
  }

  comment_type = { multiline: false, end_token: '' };

  end_token = '';
  get_end_token?: Function;

  tokenize: Tokenize = {
    number: () => {
      if (!this.is.space(this.char.curr) && this.is.number(this.Token.value + this.char.curr)) {
        return "next";
      }
    },
    keyword: () => {

      const keyword = this.get_keyword(this);

      if (!keyword) {
        this.Token.type = 'identifier';
        this.expected_token = 'identifier';
        return "next";
      }

      this.index += keyword.length;
      this.pos += keyword.length;
      this.Token.value += keyword;

      const next_char = this.source[this.index];
      if (this.is.identifier(keyword + next_char)) {
        this.Token.type = 'identifier';
        this.expected_token = 'identifier';
        return "next";
      }

      this.Token.type = 'keyword';
    },
    string: () => {

      if (!this.end_token) {
        // "string" '' | ""
        this.end_token = this.char.curr;

        this.Token.value = '';
        ++this.index, ++this.pos; // over quote
        return "continue";
      }

      const end_token = this.get_end_token
        ? this.get_end_token(this)
        : undefined;

      switch (true) {
        case (end_token !== undefined): {
          return;
        }
        case (this.char.curr + this.char.next === `\\${this.end_token}`):
          ++this.index, ++this.pos; // over escaped quote
          return "next"
        case (this.char.curr !== this.end_token):
          return "next";
        default: {
          // end "string"
          this.end_token = '';
          this.Token.value = this.Token.value;
          ++this.index, ++this.pos; // over quote
          return;
        }
      }

    },
    identifier: () => {
      if (this.is.identifier(this.Token.value + this.char.curr)) {
        return "next";
      }
    },
    token: () => {
      const token = this.get_token(this);

      if (token) {
        const token_type = this.token.get(token);

        if (!token_type) {
          this.error({ title: 'Unexpected error', message: 'unexpected token not found' });
          return;
        }

        this.index += token.length;
        this.pos += token.length;

        if (token_type === 'comment') {

          this.expected_token = 'comment';

          const comment = this.comment_token.get(token);

          if (comment) {
            const { multiline, end_token } = comment;
            this.comment_type = { multiline, end_token };
          }

          this.index -= token.length;
          this.pos -= token.length;

          return this.tokenize.comment()
        }

        if (token_type === 'operator') {
          const next_token = this.get_token(this);
          if (next_token && this.token.get(next_token) === 'operator') {
            // TODO
            this.error({ title: 'Unexpected token', message: `unexpected token: '${token + next_token}'` });
          }
        }

        this.Token.value = token;
        this.Token.type = token_type;

      } else {
        this.error({ title: 'Unexpected token', message: 'unexpected token' });
      }
    },
    comment: () => {

      if (this.comment_type.multiline) {

        // TODO CHECK IF TOKEN LEN IS > 2
        if ((this.char.curr + this.char.next) !== this.comment_type.end_token) {
          return "next"
        } else {
          if (this.debug.comment) log(this.Token.value + this.comment_type.end_token + ';g');
          this.Token.value = '';
          this.index += 2, this.pos += 2;
          this.skip_whitespace();
          this.check_token_type();

          return "continue"
        }

      } else {

        if (this.char.curr !== '\n') {
          return "next";
        } else {
          if (this.debug.comment) log(this.Token.value + ';g');
          this.Token.value = '';
          ++this.index; // skip \n
          this.skip_whitespace();
          this.check_token_type();

          return "continue"
        }

      }


      throw { title: "Porco dio", 'message': 'dio cane' }
    },
    newline: () => {
      this.Token.type = 'newline';
      this.Token.value = '\n';
      ++this.index, ++this.pos;
    }
  }

  next_string = (end_token: string | string[]) => {
    if (end_token) {
      // this.forced_expected = 'string';

      if (typeof end_token === 'string') {
        end_token = [end_token];
      }

      let token_len = 1;
      for (const token of end_token) {
        if (!this.token.has(token)) {
          log(`invalid token "${token}";r`);
        } else {
          token_len = token.length > token_len ? token.length : token_len;
        }
      }
      this.get_end_token = create_fast_get('token', token_len);
      const token = this.next();

      // this.forced_expected = undefined;
      this.get_end_token = undefined;
      return token;
    } else {
      'Endtoken;r'
    }
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

  expected = (comparator?: string | ((token: Partial<Token>) => boolean), debug = false) => {

    const print = (message = 'get cached;y') => {
      if (this.debug.expected || debug) {
        log(this.History.log(), message, this.next_token.type + ';m', this.next_token.value);
      }
    }

    const next_token_cached = this.History.get_next();

    if (next_token_cached) {

      if (Object.values(this.next_token).length === 0) {
        Object.assign(this.next_token, next_token_cached);
      }

      print();

    } else {

      this.History.start();
      const { value, type, ...t } = this.next("suppress");
      this.History.stop();

      Object.assign(this.next_token, t);
      this.next_token.value = value;
      this.next_token.type = type;

      print('cache next token;y');
    }

    let expected = false;

    if (comparator) {

      if (typeof comparator === 'function') {
        expected = comparator(this.next_token);

        if (this.debug.expected || debug) {
          log('expected test:;c', this.next_token.value, this.next_token.type, '=>;m', expected);
        }
      } else {
        expected = this.next_token.value === comparator || this.next_token.type === comparator;

        if (this.debug.expected || debug) {
          log('expected test:;c', comparator, 'eq;m', this.next_token.value, '|;m', this.next_token.type, expected);
        }
      }
    }

    return expected;
  }

  traverse_tokens = (startToken: string, endToken: string) => {

    const { History, next, recursive_next } = this;
    let then_pipe = false;

    function then(callback: () => any) {

      History.start();
      if (then_pipe) {
        recursive_next(startToken, endToken);
        next();
      }
      callback();
      History.stop();

      return ({ eat: () => { History.eat() } })
    }

    function eat(this: Tokenizer) {
      History.eat();
      return ({ then })
    };


    return ({
      eat: () => {
        History.start();
        recursive_next(startToken, endToken);
        History.stop();
        History.eat();

        return ({ then })
      },
      each: (callback: (token: Token) => void) => {

        History.start(callback);
        recursive_next(startToken, endToken);
        History.stop();

        return ({
          eat,
          then
        })
      },
      then: (callback: () => any) => {
        then_pipe = true;
        return then(callback);
      },
      catch() { }
    })
  }

  pairs_buffer: string[] = [];
  pairs_end: string = '';

  next_pairs = (token_pairs: [string, string]) => {
    const [start_token, end_token] = token_pairs;
    this.pairs_end = end_token;
    return this.recursive_next(start_token, end_token);
  }

  recursive_next = (start_token: string, end_token: string, output: Token[] = []): Token[] => {

    let end_recursion = false;

    this.next();
    if (this.Token.value === start_token) {
      this.pairs_buffer.push(this.Token.value);
    }

    if (this.Token.value === end_token) {
      this.pairs_buffer.pop();

      if (this.pairs_buffer.length === 0) {
        end_recursion = true;
      }
    }

    if (!end_recursion) {
      return this.recursive_next(start_token, end_token);
    }

    return output;
  }

  stop_immediate = false;
  next = (debug: boolean | 'suppress' = false) => {

    this.Token.value = '';

    // if (!this.forced_expected) {

    //   this.set_token_type();
    //   this.maybe = undefined;
    //   this.expected = undefined;
    // } else {

    //   this.expected = this.forced_expected;
    // }

    const print = () => {
      if ((this.debug.token || debug) && debug !== 'suppress') {
        let value = (this.Token.value || this.char.curr);
        if (this.Token.type === 'newline') value = value.replace('\n', '"\\n"')
        log(this.History.log(), this.Token.type + ';m', value)
      }
    }

    if (this.next_token.type) {
      // clean next token
      delete this.next_token.type;
      delete this.next_token.value;
      delete this.next_token.eq;
      delete this.next_token.location;
    }

    if (this.History.shift()) {
      // if cached return it
      return this.Token;
    }

    this.skip_whitespace();

    this.check_token_type();

    while (this.index < this.source.length) {

      this.char.curr = this.source[this.index];
      this.char.next = this.source[this.index + 1];

      if (this.check_new_line()) {
        ++this.index, ++this.pos;
        continue;
      }

      switch (this.tokenize[this.expected_token]()) {
        case "next": {
          this.Token.value += this.char.curr;
          ++this.index, ++this.pos;
          continue;
        }
        case "continue": {
          continue;
        }
        default: {
          // end tokenize
          this.History.push();

          print();

          return this.Token;
        }

      }
    }

    if (this.index === this.source.length) {
      this.end_program = true;
    }

    if (this.end_program) {
      if (this.pairs_buffer.length > 0) {
        throw {
          title: 'Token not found',
          message: `token '${this.pairs_end}' was not found before end of source'`,
          at: 'Tokenizer.api.traverseTokens',
          type: 'error'
        }
      }
      // await closing current context
      if (this.Context.current.name === 'Program') {
        throw { message: 'end source', type: 'end' };
      }
    }

    return this.Token;
  }

  end_program = false;

  parse_program = () => {

    // this.debug.token = true

    try {

      if (this.end_program) {
        throw { message: 'end program', type: 'end' };
      }

      if (this.index === 0) this.next();

      log('Program token:;g', this.Token.value);
      const start_context = this.program.get(this.Token.value);

      if (start_context) {
        // @ts-ignore
        start_context()
      } else {
        this.Context.default.start()
      }

    } catch (error: any) {

      if (error.type && error.message) {
        const title = error.title || 'Error';
        const at = " at " + (error.at || this.History.log(true));
        switch (error.type) {
          case 'error':
            log(` ${title} ;R`, `\n  ${error.message}${at};r`);
            console.log(this.History.tokens)
            return;
          case 'warn':
            log(`${error.message};y`)
            return;
          case 'info':
            console.log(`${error.message}\n    at ${this.line}:${this.pos}`)
            return;
          case 'end': {
            // console.log(this.Program.body)
            console.log(this.Program.body);
            this.Program.check_references();
            // console.log(this.Program.body)
            return;
          }
        }
      }

      console.log(error);
    }

  }

  error = (error: Error) => {
    throw { type: 'error', ...error };
  }

  each_char = (callback: (char: string, sequence: string) => boolean | undefined) => {

  }

}



export default Tokenizer
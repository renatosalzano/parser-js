import { log } from "utils";
import Context from "./Context";
import History from "./History";
import Program from "./Progam";
import { create_fast_get } from "./utils";
import TokenBuffer from "./TokenBuffer";

export type TokenType = 'unknown' | 'literal' | 'operator' | 'bracket' | 'keyword' | 'separator' | 'identifier' | 'number' | 'special' | 'newline';
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
    this.Program = new Program(this);

    this.api = new Proxy({
      ctx: this.Context.context,
      char: this.char,
      token: this.Token,
      nextToken: this.next_token,
      debug: this.debug,
      next: this.next,
      nextLiteral: this.next_literal,
      expected: this.expected_next,
      traverseTokens: this.traverse_tokens,
      currentContext: this.Context.get_current,
      isIdentifier: this.is.identifier,
      eachChar: this.each_char,
      createNode: this.Program.createNode,
      appendNode: this.Program.appendNode,
      logNode: this.Program.log,
      startContext: this.Context.start,
      endContext: this.Context.end,
      eat: this.eat,
      error: this.error
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

        if (end && this.token.has(end)) {
          log(`Duplicate token "${end}" found in ${this.token.get(end)};y`);
        } else {
          this.token.set(end, 'comment');
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
  char = { curr: '', prev: '', next: '' };

  Token: Token = {
    value: '',
    type: 'unknown' as TokenType,
    location: {} as Token['location'],
    eq(_: string | RegExp) {
      if (_ instanceof RegExp) {
        return _.test(this.value);
      }
      return this.value === _;
    }
  }

  TokenBuffer = new TokenBuffer(this);

  next_token: Partial<Token> = {};

  set_token_type = (type?: TokenType) => {
    if (type) {
      this.Token.type = type;
    } else {
      this.Token.type = 'unknown';
    }
  }

  expected_token: keyof Tokenizer['tokenize'] = 'token';
  skip_newline = false;

  blocking_error = false;

  debug: DebugNext = {};


  check_new_line() {
    if (/[\r\n]/.test(this.char.curr)) {

      if (this.char.curr === '\r') {
        return true;
      }

      this.pos = 1, ++this.line;
      if (this.debug.newline) log('Ln:;c', this.line);
    }
  }

  check_token_type = () => {

    switch (true) {
      case (this.is.nl(this.char.curr)): {
        if (this.char.curr === '\r') {
          ++this.index, ++this.pos;
        }
        this.expected_token = 'newline';
        break;
      }
      case this.is.quote(this.char.curr): {
        this.expected_token = 'literal';
        break;
      }
      case this.is.number(this.char.curr): {
        this.expected_token = 'number';
        break;
      }
      case this.is.identifier(this.char.curr): {

        if (/[_$]/.test(this.char.curr)) {
          // when char is $ | '_'
          const possibly_token = this.get_token(this);
          if (possibly_token) {
            if (!this.is.identifier(possibly_token)) {
              break;
            }
          }
        }

        if (this.is.alpha(this.char.curr)) {
          this.expected_token = 'keyword';
        } else {
          this.expected_token = 'identifier';
        }
        break;
      }
      default:
        this.expected_token = 'token';
    }

    if (this.debug.checkToken) log('expected:;g', this.expected_token);
  }

  skip_comment = { multiline: false, end_token: '' };

  tokenize = {
    number: () => {
      if (!this.is.space(this.char.curr) && this.is.number(this.Token.value + this.char.curr)) {
        return true;
      }
    },
    keyword: () => {

      const keyword = this.get_keyword(this);

      if (!keyword) {
        this.Token.type = 'identifier';
        this.expected_token = 'identifier';
        return true;
      }

      this.index += keyword.length;
      this.pos += keyword.length;
      this.Token.value += keyword;

      const next_char = this.source[this.index];
      if (this.is.identifier(keyword + next_char)) {
        this.Token.type = 'identifier';
        this.expected_token = 'identifier';
        return true;
      }

      this.Token.type = 'keyword';
    },
    literal: () => {

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

    },
    identifier: () => {
      if (this.is.identifier(this.Token.value + this.char.curr)) {
        return true;
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
            this.skip_comment = { multiline, end_token };
          }

          this.index -= token.length;
          this.pos -= token.length;

          return this.tokenize.comment()
        }

        if (token_type === 'operator') {
          const next_token = this.get_token(this);
          if (next_token && this.token.get(next_token) === 'operator') {
            // TODO
            this.error({ title: 'Unexpected operator', message: 'unexpected token' });
          }
        }

        this.Token.value = token;
        this.Token.type = token_type;

      } else {
        this.error({ title: 'Unexpected token', message: 'unexpected token' });
      }
    },
    comment: () => {

      if (this.skip_comment.multiline) {

      } else {

        if (this.char.curr !== '\n') {
          return true;
        } else {

          log(this.Token.value + ';g');
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

  next_literal = (end_token: string | string[]) => {
    if (end_token) {
      // this.forced_expected = 'literal';
      // this.set_token_type('literal');

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

      // this.forced_expected = undefined;
      this.get_token_in_literal = undefined;
      return token;
    } else {
      'Endtoken;r'
    }
  }

  end_token?: string[];
  get_token_in_literal?: Function;


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

  expected_next = (comparator?: string | ((token: Partial<Token>) => boolean), debug = false) => {

    const print = (message = 'get cached;y') => {
      if (this.debug.expected || debug) {
        log(this.History.loc(), message, this.next_token.type + ';m', this.next_token.value);
      }
    }

    const next_token_cached = this.History.get_next();

    if (next_token_cached) {

      if (Object.values(this.next_token).length === 0) {
        Object.assign(this.next_token, next_token_cached);
      }

      print();

    } else {

      this.TokenBuffer.start();
      const { value, type, ...t } = this.next("suppress");
      this.TokenBuffer.stop();

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

    const { TokenBuffer, next, recursive_next } = this;
    let then_pipe = false;

    function then(callback: (token: Token) => any) {

      TokenBuffer.start();
      if (then_pipe) {
        recursive_next(startToken, endToken);
        next();
      }
      callback(TokenBuffer.token);
      TokenBuffer.stop();

      return ({ eat })
    }

    function eat(this: Tokenizer) {
      TokenBuffer.eat();
      return ({ then })
    };


    return ({
      eat: () => {
        TokenBuffer.start();
        recursive_next(startToken, endToken);
        TokenBuffer.stop();
        TokenBuffer.eat();

        return ({ then })
      },
      each: (callback: (token: Token) => void) => {

        TokenBuffer.start(callback);
        recursive_next(startToken, endToken);
        TokenBuffer.stop();


        return ({
          eat,
          then
        })
      },
      then: (callback: (token: Token) => any) => {
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
        log(this.History.loc(), this.Token.type + ';m', value)
      }
    }

    if (this.next_token.type) {
      // clean next token
      delete this.next_token.type;
      delete this.next_token.value;
      delete this.next_token.eq;
    }

    if (this.History.shift()) {
      // if cached return it
      return this.Token;
    }

    const skip_reg = this.skip_newline
      ? /\s/
      : / /;

    // SKIP WHITESPACE / NEWLINE
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

    this.check_token_type();

    while (this.index < this.source.length) {

      this.char.curr = this.source[this.index];
      this.char.next = this.source[this.index + 1];

      if (this.check_new_line()) {
        ++this.index, ++this.pos;
        continue;
      }

      if (this.tokenize[this.expected_token]()) {

        this.Token.value += this.char.curr;
        ++this.index, ++this.pos;
        continue;

      } else {

        this.History.push();

        print();

        return this.Token;
      }

      // if (this.stop_immediate) {


      //   this.stop_immediate = false;

      //   this.History.push();

      //   print();

      //   return this.Token;
      // }





      // if (this.skip_whitespace()) {
      //   continue;
      // }



      // if (this.parse_literal()) {
      //   continue;
      // }

      // if (this.parse_number()) {
      //   continue;
      // }

      // if (this.parse_token()) {
      //   continue;
      // }

      // if (this.parse_keyword()) {
      //   continue;
      // }

      // if (this.parse_identifier()) {
      //   continue;
      // }



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

    try {

      if (this.end_program) {
        throw { message: 'end program', type: 'end' };
      }

      this.debug.token = true;
      this.debug.checkToken = true;
      this.debug.newline = true;
      this.skip_newline = true;

      let max = 100;

      while (max > 0) {

        this.next();
        --max;

        if (this.end_program) {
          throw { message: 'end program', type: 'end' };
        }


      }

      if (this.index === 0) this.next()
      log('Program token:;g', this.Token.value);
      const start_context = this.program.get(this.Token.value);
      if (start_context) {
        start_context()
      } else {
        this.Context.default.start()
      }

    } catch (error: any) {

      if (error.type && error.message) {
        const title = error.title || 'Error';
        const at = " at " + (error.at || this.History.loc(true));
        switch (error.type) {
          case 'error':
            log(` ${title} ;R`, `\n  ${error.message}${at};r`);
            break;
          case 'warn':
            log(`${error.message};y`)
            break;
          case 'info':
            console.log(`${error.message}\n    at ${this.line}:${this.pos}`)
            break;
          case 'end': {
            this.Program.check_references();
            // console.log(this.Program.body)
            return;
          }
        }
      }

      console.log(error);
    }


    // this.debug.expected = true


    // let index = 10
    // while (index > 0) {
    //   this.next()
    //   --index;
    // }
    // this.debug.token = true;
    // this.debug.expected = true;



  }

  error = (error: Error) => {
    throw { type: 'error', ...error };
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
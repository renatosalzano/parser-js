import { log } from "utils";
import History from "./History";
import Program from "./Progam";
import { create_fast_get } from "./utils";
import { extend, ParserObject } from "./extend";
import Context from "./Context";

export type TokenType<T> = 'string' | 'operator' | 'bracket' | 'keyword' | 'separator' | 'identifier' | 'number' | 'special' | 'newline' | T;
export type Token = {
  value: string;
  type: string;
  start: number;
  end: number;
  loc: { start: { ln: number; col: number }; end: { ln: number; col: number } };
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

type Tokenize = { [key: string]: () => "next" | "skip" | void }

class Tokenizer {

  source = '';

  Program: Program;
  History = new History(this);
  Context = new Context(this);

  program = new Map<string, Function>();

  token = new Map<string, string>();

  max_len = { token: 1, keyword: 1 };
  get_token = create_fast_get('token', 1);

  keyword = new Map<string, string>();
  get_keyword = create_fast_get('keyword', 1);

  comment_token = new Map<string, { multiline: boolean, end_token: string }>();

  parser: { [key: string]: Function } = {};

  constructor() {
    this.Program = new Program();

    Object.assign(this.api, {
      isFnBody: this.Program.is_fn_body,
      createNode: this.Program.create_node,
      appendNode: this.Program.append_node
    });
  }

  async Parse(source: string) {
    this.source = source;
    log('start parse program;y');
    this.parse_program();
    this.History.JSON(process.cwd() + '\\dist\\history.json')
    log('end parse program;g')
  }

  extend = (...plugin: [string, any, any, any]) => extend.apply(this, plugin);

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
    type: 'unknown',
    start: 0,
    end: 0,
    loc: {
      start: { ln: 0, col: 0 },
      end: { ln: 0, col: 0 },
    },
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

  Tokens: Token[] = [];

  next_token: Partial<Token> = {};

  expected_token: keyof Tokenizer['tokenize'] = 'token';
  skip_newline = true;
  skip_whitespace = true;

  blocking_error = false;

  debug: DebugNext = {};

  sync_ch = () => {
    this.char.curr = this.source[this.index];
    this.char.next = this.source[this.index + 1];
  }

  increment = (value: number) => {
    console.log(this.char.curr, this.source[this.index])
    while (value > 0) {
      console.log('value', this.source[this.index])
      ++this.index, ++this.pos;
      // this.check_new_line();
      this.sync_ch();
      --value;
    }
  }

  skip_ws = () => {

    if (!this.skip_whitespace) {
      this.skip_whitespace = true;
      return;
    }

    const skip_reg = this.skip_newline
      ? /\s/
      : / /;

    while (this.index < this.source.length) {

      this.sync_ch();

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

  tokenize_type = () => {

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
        this.expected_token = 'number';
        break;
      }
      case this.is.identifier(this.char.curr): {

        if (/[_$]/.test(this.char.curr)) {
          // when char is $ | '_'
          const possibly_token = this.get_token(this);
          if (possibly_token) {
            if (!this.is.identifier(possibly_token)) {
              this.expected_token = 'token';
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

    if (this.debug.checkToken) log('check token;c', 'expected:;g', this.expected_token);
  }

  comment_type = { multiline: false, end_token: '' };

  end_token = '';
  get_end_token?: Function;

  tokenize: Tokenize = {
    number: () => {
      if (!this.is.space(this.char.curr) && this.is.number(this.Token.value + this.char.curr)) {
        return "next";
      } else {
        // end
        this.Token.type = 'number';
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
        return "skip";
      }

      switch (true) {
        case (this.char.curr + this.char.next === `\\${this.end_token}`):
          ++this.index, ++this.pos; // over escaped quote
          return "next"
        case (this.char.curr !== this.end_token):
          return "next";
        default: {
          // end "string"
          this.end_token = '';
          this.Token.type = 'string';
          this.Token.value = this.Token.value;
          ++this.index, ++this.pos; // over quote
          return;
        }
      }

    },
    identifier: () => {
      if (this.is.identifier(this.Token.value + this.char.curr)) {
        return "next";
      } else {
        this.Token.type = 'identifier';
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
        this.sync_ch();

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
        this.error({ title: 'Unexpected token', message: `unexpected token from "${this.char.curr}"` });
      }
    },
    comment: () => {

      if (this.comment_type.multiline) {

        // TODO CHECK IF TOKEN LEN IS > 2
        if ((this.char.curr + this.char.next) !== this.comment_type.end_token) {
          return "next"
        } else {
          if (this.debug.comment) log(this.line, this.Token.value + this.comment_type.end_token + ';g');
          this.Token.value = '';
          this.index += 2, this.pos += 2;
          this.skip_ws();
          this.tokenize_type();

          return "skip"
        }

      } else {

        if (/[\r\n]/.test(this.char.curr)) {
          return "next";
        } else {
          if (this.debug.comment) log(this.line, this.Token.value + ';g');
          this.Token.type = 'comment'
          // ++this.index; // skip \n

          this.skip_ws();

          return;
        }

      }
    },
    newline: () => {
      this.Token.type = 'newline';
      this.Token.value = '\n';
      ++this.index, ++this.pos;
    }
  }

  eat = (from: string, to?: string) => {

    // if (sequence !== this.next(breakReg)) {
    //   this.prev();
    // }
  }

  expected = (comparator?: string | ((token: Partial<Token>) => boolean), debug = false) => {
    this.debug.expected = true;

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
      const { value, type, start, end, ...t } = this.next("suppress");
      this.History.stop();

      Object.assign(this.next_token, t);
      this.next_token.value = value;
      this.next_token.type = type;
      this.next_token.start = start;
      this.next_token.end = end;

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

    const { History, next, init_recursive_next } = this;
    let then_pipe = false;

    function then(callback: () => any) {

      History.start();
      if (then_pipe) {
        init_recursive_next(startToken, endToken);
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
        init_recursive_next(startToken, endToken);
        History.stop();
        History.eat();

        return ({ then });
      },
      each: (callback: (token: Token) => void) => {

        History.start(callback);
        init_recursive_next(startToken, endToken);
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

  pairs_buffer: number[][] = [];
  get_ref = () => this.Token.start;

  init_recursive_next = (ts: string, te: string) => {

    if (!this.expected(ts)) {
      this.error({ message: 'Invalid' });
    }

    if (this.Context.has(ts)) {
      this.get_ref = () => this.Context.len();
    }

    console.log('after expected', this.Token)

    this.recursive_next(ts, te);
  }

  recursive_next = (ts: string, te: string, layer = 0) => {

    const t = this.Token;
    let end_recursion = true;

    this.pairs_buffer[layer] = [];

    next: while (!this.source_end) {

      this.next();

      switch (true) {
        case (t.value == ts && !this.pairs_buffer[layer][0]): {
          console.log('ts found')
          this.pairs_buffer[layer][0] = this.get_ref();
          break;
        }
        case (t.value == ts && !!this.pairs_buffer[layer][0]): {
          if (this.get_ref() !== this.pairs_buffer[layer][0]) {
            console.log('new layer')
          }
        }
      }

    }


    // if (t.value == ts && !this.pairs_buffer[layer][0]) {
    //   this.pairs_buffer[layer][0] = t.start;
    // }

    // if (t.value == te && !this.pairs_buffer[layer][1]) {

    //   this.pairs_buffer.pop();

    //   if (this.pairs_buffer.length === 0) {
    //     end_recursion = true;
    //   }
    // }

    if (!end_recursion) {
      this.recursive_next(ts, te, layer);
    } else {
      this.pairs_buffer = [];
    }

  }

  next = (debug: boolean | 'suppress' = false) => {

    this.Token.value = '';
    this.Token.type = '';

    const print = () => {
      if ((this.debug.token || debug) && debug !== 'suppress') {
        let value = (this.Token.value || this.char.curr);
        if (this.Token.type == 'newline') value = value.replace('\n', '"\\n"');
        if (this.Token.type == 'string') {
          let line = this.Token.loc.start.ln;
          for (const ln of this.Token.value.split('\n')) {
            // @ts-ignore
            console.log(`${line}`.cyan() + ':' + `"${ln}"`.yellow());
            ++line;
          }
          return;
        }
        log(this.History.log(), this.Token.type + ';m', value)
      }
    }

    // if (this.next_token.type) {
    //   // clean next token
    //   delete this.next_token.type;
    //   delete this.next_token.value;
    //   delete this.next_token.loc;
    //   delete this.next_token.eq;
    // }

    // if (this.History.shift()) {
    //   // if cached return it
    //   return this.Token;
    // }

    this.Context.load();

    let check_nl = !this.skip_whitespace;

    this.skip_ws();

    this.History.set_token_start();

    if (this.Context.tokenize == undefined) {
      this.tokenize_type();
    }

    while (this.index < this.source.length) {

      this.sync_ch();

      if (check_nl && this.check_new_line()) {
        ++this.index, ++this.pos;
        continue;
      }

      switch ((this.Context.tokenize || this.tokenize[this.expected_token])()) {
        case "next": {
          this.Token.value += this.char.curr;
          ++this.index, ++this.pos;
          continue;
        }
        case "skip": {
          continue;
        }
        default: {
          // end tokenize
          this.sync_ch();

          this.History.push();
          print();

          if (this.Token.type === '') {
            throw { title: 'Tokenizer Error:', message: 'Token.type miss', type: 'error' }
          }

          this.Context.check();

          return this.Token;
        }

      }
    }

    if (this.index === this.source.length) {
      log('source end;y');

      this.source_end = true;

      if (this.pairs_buffer.length > 0) {
        throw {
          title: 'Token not found',
          message: `token '' was not found before end of source'`,
          at: 'Tokenizer.api.traverseTokens',
          type: 'error'
        }
      }

      this.History.last_token();
    }

    return this.Token;
  }

  source_end = false;
  parser_run = false;

  parse_program = () => {

    this.debug.token = true;
    // this.debug.checkToken = true;
    this.debug.comment = true;
    // this.debug.newline = true;


    try {

      this.traverse_tokens('`', '`').then(() => {
        console.log(this.Token)
      })

      return;

      let max = 10;
      while (max > 0 && !this.source_end) {

        // TODO check multiple traverse tokens called

        if (this.index === 0) this.next();

        log('Program token:;g', this.Token.value);

        this.parser_run = true;
        const parser = this.program.get(this.Token.value) || this.program.get('default');

        if (parser) {
          // @ts-ignore
          parser();
        }

        this.parser_run = false;

        --max;

        if (this.source_end) {
          log('source end;g')
          throw { message: 'end program', type: 'end' };
        }

      }

    } catch (error: any) {

      if ('message' in error) {
        const title = error.title || 'Error';
        const at = " at " + (error.at || this.History.log(true));
        switch (error.type) {
          case 'error':
            log(` ${title} ;R`, `\n  ${error.message}${at};r`);
            return;
          case 'warn':
            log(`${error.message};y`)
            return;
          case 'info':
            console.log(`${error.message}\n    at ${this.line}:${this.pos}`)
            return;
          case 'end': {
            this.Program.toJSON(process.cwd() + '\\dist\\ast.json')
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

  api = {
    char: this.char,
    token: this.Token,
    nextToken: this.next_token as Token,
    debug: this.debug,
    next: this.next,
    expected: this.expected,
    traverseTokens: this.traverse_tokens,
    eat: this.eat,
    error: this.error,
    $: {} as { [key: string]: ParserObject }
  }

  start = (source: string) => {
    this.source = source;
    // this.debug.token = true;
    try {

      while (!this.source_end) {
        this.next();
      }

      this.History.JSON(process.cwd() + '\\dist\\tokens.json');

    } catch (error) {
      console.log(error);
    }
  }

}



export default Tokenizer
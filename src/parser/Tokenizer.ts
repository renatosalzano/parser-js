import { log } from "utils";
import History from "./History";
import Program from "./Progam";
import { create_token_finder } from "./utils";
import { extend } from "./extend";
import Context from "./Context";
import Parser from "./Parser";

export type TokenType = 'literal' | 'operator' | 'bracket' | 'keyword' | 'separator' | 'identifier' | 'special' | 'newline' | 'statement' | 'comment' | '';
export type Token = {
  value: string;
  type: TokenType;
  subtype?: string;
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

  Parser = {} as Parser;
  Program: Program;
  History = new History(this);
  Context = new Context(this);

  program = new Map<string, Function>();

  tokens = new Map<string, TokenType>();

  max_len = { token: 1, keyword: 1 };
  get_token = create_token_finder(this, 'tokens', 1);

  keywords = new Map<string, string>();
  get_keyword = create_token_finder(this, 'keywords', 1);

  comment_token = new Map<string, { multiline: boolean, end_token: string }>();

  parser: { [key: string]: Function } = {};

  token_index = 0;

  constructor() {
    this.Program = new Program();
  }

  temp: any;
  extend = (...plugin: [string, any, any]) => extend.apply(this, plugin);

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

  token: Token = {
    value: '',
    type: '',
    start: 0,
    end: 0,
    loc: {
      start: { ln: 0, col: 0 },
      end: { ln: 0, col: 0 },
    },
    eq(_: string | RegExp) {
      if (_ instanceof RegExp) {
        return _.test(this.value) || _.test(this.type);
      }
      return this.value === _ || this.type === _;
    }
  }

  next_token: Partial<Token> = {
    eq(_: string | RegExp) {
      if (!this.value || !this.type) return false;
      if (_ instanceof RegExp) {
        return _.test(this.value) || _.test(this.type);
      }
      return this.value === _ || this.type === _;
    }
  };

  expected_token: keyof Tokenizer['tokenize'] = 'token';
  check_nl = false;
  skip_newline = true;
  skip_whitespace = true;

  debug: DebugNext = {};

  sync_ch = () => {
    this.char.curr = this.source[this.index];
    this.char.next = this.source[this.index + 1];
  }

  advance = (value: number) => {
    while (value > 0) {
      ++this.index, ++this.pos;
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

    if (this.Context.active()) {
      return;
    };

    switch (true) {
      case (this.is.nl(this.char.curr)): {
        if (this.char.curr === '\r') {
          this.advance(1);
        }
        this.expected_token = 'newline';
        break;
      };
      case this.is.quote(this.char.curr): {
        this.end_quote = this.char.curr;
        this.advance(1);
        this.expected_token = 'string';
        break;
      }
      case this.is.number(this.char.curr): {
        this.expected_token = 'number';
        break;
      }
      default: {

        const token = this.get_token();

        switch (true) {
          case !!token: {

            const token_type = this.tokens.get(token);

            if (token_type) {

              this.token.type = token_type;
              this.advance(token.length);

              switch (token_type) {
                case 'comment': {
                  const comment = this.comment_token.get(token)!;
                  const { multiline, end_token } = comment;
                  this.end_token = end_token;

                  if (multiline) {
                    this.expected_token = 'comment_ml';
                    this.token.subtype = 'multiline';
                  } else {
                    this.expected_token = 'comment';
                  }

                  this.check_nl = true;
                  return;
                }
              }

              this.token.value += token;

              if (this.Context.has(token)) {
                this.Context.check(token)
              }

              return this.token;

            } else {
              this.error({ title: 'Unexpected error', message: 'token type not found' })
            }

          };
          case this.is.identifier(this.char.curr): {

            if (this.is.alpha(this.char.curr)) {

              const kw = this.get_keyword();

              if (kw) {
                this.advance(kw.length);
                this.token.value += kw;

                if (this.is.space(this.char.curr) || this.tokens.has(this.char.curr)) {
                  // is kw
                  this.token.type = 'keyword';

                  if (this.Context.has(kw)) {
                    this.Context.check(kw);
                  }

                  return this.token;
                }

                if (this.is.identifier(this.char.curr)) {
                  this.token.value += this.char.curr;
                  this.advance(1);
                  this.expected_token = 'identifier';
                  break;
                }
              }

            } // end check if is kw

            this.expected_token = 'identifier';
            return;
          }
        }
      }
    }

    if (this.debug.checkToken) log('check token;c', 'expected:;g', this.expected_token);
  }


  end_quote = '';
  end_token = '';

  tokenize: Tokenize = {
    number: () => {
      if (!this.is.space(this.char.curr) && this.is.number(this.token.value + this.char.curr)) {
        return "next";
      } else {
        // end
        this.token.subtype = 'number';
      }
    },
    // keyword: () => {

    //   const keyword = this.get_keyword(this);

    //   if (!keyword) {
    //     this.Token.type = 'identifier';
    //     this.expected_token = 'identifier';
    //     return "next";
    //   }

    //   this.index += keyword.length;
    //   this.pos += keyword.length;
    //   this.Token.value += keyword;

    //   const next_char = this.source[this.index];
    //   if (this.is.identifier(keyword + next_char)) {
    //     this.Token.type = 'identifier';
    //     this.expected_token = 'identifier';
    //     return "next";
    //   }

    //   this.Token.type = 'keyword';
    // },
    string: () => {

      switch (true) {
        case (this.char.curr + this.char.next === `\\${this.end_quote}`):
          ++this.index, ++this.pos; // over escaped quote
          return "next";
        case (this.char.curr !== this.end_quote):
          return "next";
        default: {
          // end "string"
          this.end_quote = '';
          this.token.subtype = 'string';
          this.advance(1)
          return;
        }
      }

    },
    identifier: () => {
      if (this.is.identifier(this.token.value + this.char.curr)) {
        return "next";
      } else {
        this.token.type = 'identifier';
      }
    },
    comment: () => {

      if (!this.is.nl(this.char.curr)) {
        return "next";
      } else {
        if (this.debug.comment) log(this.line, this.token.value + ';g');
        return;
      }

    },
    comment_ml: () => {
      if (!(this.get_token() != this.end_token)) {
        return 'next';
      } else {
        this.advance(this.end_token.length);
        this.end_token = '';
        return;
      }
    },
    newline: () => {
      this.token.type = 'newline';
      this.token.value = '\n';
      ++this.index, ++this.pos;
    }
  }

  next = (debug: boolean | 'suppress' = false) => {

    this.token.value = '';
    this.token.type = '';
    delete this.token.subtype;

    const print = () => {
      if ((this.debug.token || debug) && debug !== 'suppress') {
        let value = (this.token.value || this.char.curr);
        switch (this.token.type) {
          case 'newline':
            value = value.replace('\n', '"\\n"');
            break;
          case 'comment': {
            // @ts-ignore
            console.log(`${this.token.loc.start.ln}`.cyan() + this.token.value.green());
            return;
          }
          case 'literal': {
            if (this.token.subtype == 'string') {
              let line = this.token.loc.start.ln;
              for (const ln of this.token.value.split('\n')) {
                // @ts-ignore
                console.log(`${line}`.cyan() + ':' + `"${ln}"`.yellow());
                ++line;
              }
              return;
            }
          }
        }

        log(this.History.log(), this.token.type + ';m', value)
      }
    }

    this.skip_ws();

    this.History.set_token_start();

    if (this.tokenize_type()) {
      this.History.push();
      print();
      return;
    }

    while (this.index < this.source.length) {

      this.sync_ch();

      if (this.check_nl && this.check_new_line()) {
        ++this.index, ++this.pos;
        continue;
      }

      switch ((this.Context.tokenize || this.tokenize[this.expected_token])()) {
        case "next": {
          this.token.value += this.char.curr;
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

          if (this.token.type == '') {
            throw { title: 'Tokenizer Error:', message: 'token.type miss', type: 'error' }
          }

          // this.Context.check();

          return this.token;
        }

      }
    }

    if (this.index === this.source.length) {
      log('source end;y');

      this.source_end = true;

      this.History.last_token();
    }

    return this.token;
  }

  source_end = false;
  tokens_end = false;

  start = (source: string) => {
    log('tokenize start;y');
    this.source = source;
    this.debug.token = true;
    try {

      while (!this.source_end) {
        this.next();
      }

    } catch (error) {
      console.log(error);
    }

    this.History.JSON(process.cwd() + '\\dist\\tokens.json');

    log('tokenize end;g');
  }

  parse(source: string) {
    if (!this.source_end) {
      this.start(source);
    }
    log('parser start;y');
    this.Parser.next();
    this.Parser.Program();
  }


  // parse_program = () => {

  //   this.debug.token = true;
  //   // this.debug.checkToken = true;
  //   this.debug.comment = true;
  //   // this.debug.newline = true;


  //   try {

  //     this.traverse_tokens('`', '`').then(() => {
  //       console.log(this.Token)
  //     })

  //     return;

  //     let max = 10;
  //     while (max > 0 && !this.source_end) {

  //       // TODO check multiple traverse tokens called

  //       if (this.index === 0) this.next();

  //       log('Program token:;g', this.Token.value);

  //       this.parser_run = true;
  //       const parser = this.program.get(this.Token.value) || this.program.get('default');

  //       if (parser) {
  //         // @ts-ignore
  //         parser();
  //       }

  //       this.parser_run = false;

  //       --max;

  //       if (this.source_end) {
  //         log('source end;g')
  //         throw { message: 'end program', type: 'end' };
  //       }

  //     }

  //   } catch (error: any) {

  //     if ('message' in error) {
  //       const title = error.title || 'Error';
  //       const at = " at " + (error.at || this.History.log(true));
  //       switch (error.type) {
  //         case 'error':
  //           log(` ${title} ;R`, `\n  ${error.message}${at};r`);
  //           return;
  //         case 'warn':
  //           log(`${error.message};y`)
  //           return;
  //         case 'info':
  //           console.log(`${error.message}\n    at ${this.line}:${this.pos}`)
  //           return;
  //         case 'end': {
  //           this.Program.toJSON(process.cwd() + '\\dist\\ast.json')
  //           this.Program.check_references();
  //           // console.log(this.Program.body)
  //           return;
  //         }
  //       }
  //     }

  //     console.log(error);

  //   }

  // }

  error = (error: Error) => {
    throw { type: 'error', ...error };
  }

}


export default Tokenizer
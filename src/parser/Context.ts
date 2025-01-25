import { log } from "utils";
import Tokenizer from "./Tokenizer";

type Char = { curr: string; next: string };

interface TokenContext {
  start: string | string[];
  end: string | string[];
  checkTokenType(char: { curr: string; next: string }): void;
  tokenize: { [key: string]: Function };
}

export type CtxParams = {
  char: Tokenizer['char'];
  Token: Tokenizer['Token'];
  index: Tokenizer['index'];
  increment: (value: number) => void;
  getToken: () => string | undefined;
  getKeyword: () => string | undefined;
}

export interface Ctx {

  name: string;

  active: boolean;

  checkTokenType: (params: CtxParams) => string | undefined | void;

  tokenize: (params: CtxParams) => {
    [key: string]: () => 'next' | 'skip' | void;
  }

}

interface Ctor<T> {
  new(...args: any): T
}

class Context {

  constructor(public Tokenizer: Tokenizer) { };

  current?: string;
  buffer: Ctx[] = [];
  curr_ctx = {} as Ctx;

  tokenize?: () => any;

  create_context = <T>(Ctx: Ctor<T>) => {
    const ctx = new Ctx() as Ctx;

    // TODO BETTER CONTEXT CHECK
    if (!ctx.checkTokenType || !ctx.tokenize || !ctx.name) {
      log('invalid context');
    }

    this.buffer.push(ctx);
    this.curr_ctx = this.buffer.at(-1)!;

    log('created context:;y', this.curr_ctx.name);

    this.check_token_type = this.run_context;

    return ctx as T;
  }

  end_context = () => {
    // close last context active;
    if (this.buffer.length === 0) {
      log('unexpected end context');
    }

    const prev = this.curr_ctx.name;



    this.buffer.pop();

    this.current = this.buffer.at(-1)?.name;
    this.curr_ctx = this.buffer.at(-1) || {} as Ctx;

    if (this.buffer.length > 0) {
      this.check_token_type = this.run_context;
    } else {
      this.check_token_type = function () { };
    }

    log('close context:;g', `${prev} --> ${this.current || 'null'}`);

    this.current = this.buffer.at(-1)?.name;
  }

  get_api = () => ({
    char: this.Tokenizer.char,
    Token: this.Tokenizer.Token,
    index: this.Tokenizer.index,
    increment: (value: number) => { this.Tokenizer.index += value; this.Tokenizer.pos += value },
    getToken: () => this.Tokenizer.get_token(this.Tokenizer),
    getKeyword: () => this.Tokenizer.get_keyword(this.Tokenizer),
  })

  run_context = () => {

    if (!this.curr_ctx.active && this.tokenize) {
      console.log('ctx disabled')
      this.tokenize = undefined;
    }

    if (this.curr_ctx.active) {
      const type = this.curr_ctx.checkTokenType(this.get_api());
      if (type) {
        console.log('type found', type);
        this.tokenize = () => {
          return this.curr_ctx.tokenize(this.get_api())[type]();
        }
        // this.curr_ctx.tokenize(this.get_api());
      } else {
        // no type no tokenize
        this.tokenize = undefined;
      }
    }

  }

  check_token_type = () => { };
}

export default Context;
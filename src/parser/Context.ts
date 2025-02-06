import { log } from "utils";
import Tokenizer, { Error, Token, TokenProperties } from "./Tokenizer";

interface Ctor<T> {
  new(...args: any): T
}

type Get = () => string | undefined;

const token_prop_keys = new Set(['arithmetic', 'assignment', 'comparison', 'logical', 'bitwise', 'binary', 'conditional', 'postfix', 'prefix', 'ternary'])

export interface TokenContext {
  name: string;
  start: string[];
  end: string[];
  onBefore?(cancel: () => void): any;
  onStart?(): any;
  onEnd?(): any;
  tokenize?(): 'next' | 'skip' | undefined;
}

export class TokenContext {

  constructor(
    public char: Tokenizer['char'],
    public token: Tokenizer['token'],
    public prevToken: Tokenizer['prev_token'],
    public getToken: Get,
    public getKeyword: Get,
    public advance: (value?: number) => void,
    public currContext: () => string | null,
    public prevContext: () => string | null,
    public skipWhitespace: (skip?: boolean) => void,
    public error: Tokenizer['error']
  ) {

  }

  name: string = '';
  start: string[] = [];
  end: string[] = [];
  state: { [key: string]: any } = {};
}

type context = Omit<TokenContext, 'start' | 'end'> & {
  start: Set<string>;
  end: Set<string>;
  end_immediate: boolean;
  skip_whitespace?: boolean;
};



class Context {

  token = {
    start: new Map<string, Ctor<TokenContext>>(),
    end: new Map<string, Ctor<TokenContext>>()
  }

  ctx_state = new WeakMap();

  constructor(public Tokenizer: Tokenizer) {
  };

  buffer: context[] = [];

  curr_ctx?: context;
  prev_ctx?: context;
  ctx_to_load?: context;
  ctx_reload?: boolean;

  end_token?: string;

  debug = false;

  tokenize?: () => any;


  new_ctx = (Ctx: Ctor<TokenContext>) => {

    const Tokenizer = this.Tokenizer;

    const token = new Proxy(this.Tokenizer.token, {

      set(t, p: keyof Token, v) {
        if (token_prop_keys.has(p)) {
          // if token prop changed by ctx notify to tokenizer
          Tokenizer.token_prop.push(p as any);
        }
        return Reflect.set(t, p, v)
      }
    });

    const ctx = new Ctx(
      this.Tokenizer.char,
      token,
      this.Tokenizer.prev_token,
      this.Tokenizer.get_token,
      this.Tokenizer.get_keyword,
      // advance
      (value = 1) => this.Tokenizer.advance(value),
      // currContext
      () => this.curr_ctx?.name,
      // prevContext
      () => this.prev_ctx?.name,
      // skip whitespace
      (skip = false) => void (ctx.skip_whitespace = skip, this.Tokenizer.skip_whitespace = skip, this.Tokenizer.check_nl = !skip),
      // () => void (this.curr_ctx && (this.curr_ctx._end = true))
      this.Tokenizer.error
    ) as unknown as context;

    ctx.start = new Set(ctx.start);
    ctx.end = new Set(ctx.end);
    ctx.end_immediate = ctx.end.size == 0;
    ctx.skip_whitespace = true;

    return ctx;
  }


  extend = (Ctxs: Ctor<TokenContext>[]) => {

    for (const Ctx of Ctxs) {
      const ctx = this.new_ctx(Ctx);

      if (!ctx.name || !ctx.start || ctx.start.size === 0) {
        log('invalid context;r', ctx.name)
      };

      for (const token of ctx.start) {
        this.token.start.set(token, Ctx);
      }

      for (const token of ctx.end) {
        this.token.end.set(token, Ctx);
      }

      Object.freeze(ctx.state);

      this.ctx_state.set(Ctx, ctx.state);

    }

  }


  check = (token: string) => {

    if (token == this.end_token) {

      if (this.prev_ctx && this.prev_ctx.onEnd) {
        this.prev_ctx.onEnd()
      }
      this.end_token = undefined;

      return;

    } else if (this.is_end_context(token)) {

      this.debug && log('cxt end from check;c');

      if (this.prev_ctx && this.prev_ctx.onEnd) {
        this.prev_ctx.onEnd()
      }

      // return;
    }

    const Ctx = this.token.start.get(token);

    if (Ctx) {

      if (this.curr_ctx && this.curr_ctx.end_immediate) {
        this.end_context();
      }

      const ctx = this.new_ctx(Ctx) as context;

      let cancel = false;

      if (ctx.onBefore) ctx.onBefore(() => {
        cancel = true;
      });

      if (cancel) {
        return;
      }

      this.buffer.push(ctx);
      this.ctx_to_load = this.buffer.at(-1)!;
      if (ctx.onStart) ctx.onStart();
    }
  }


  active = () => {

    if (this.ctx_to_load) {

      this.debug && log('ctx curr:;c', this.buffer.length, this.ctx_to_load.name);

      this.curr_ctx = this.ctx_to_load;

      if (this.ctx_reload) {
        if (this.curr_ctx.onStart) this.curr_ctx.onStart();
        this.ctx_reload = false;
      }

      if (!this.curr_ctx.skip_whitespace) {
        this.Tokenizer.skip_whitespace = false;
        this.Tokenizer.check_nl = true;
      }

      this.update_tokenize();

      this.ctx_to_load = undefined;
    }

    return this.tokenize != undefined;
  }

  prev_ctx_to_load?: context;

  end_context = () => {

    if (this.buffer.length === 0 || !this.curr_ctx) {
      this.Tokenizer.error({ message: 'unexpected end context' });
      return;
    }

    if (this.curr_ctx.end_immediate && this.curr_ctx.onEnd) {
      this.curr_ctx.onEnd();
    }
    // (this.curr_ctx.onEnd && this.curr_ctx.onEnd());
    this.prev_ctx = this.curr_ctx;

    const prev = this.curr_ctx?.name;
    this.buffer.pop();
    this.curr_ctx = this.buffer.at(-1);

    if (this.curr_ctx) {
      this.curr_ctx.state = { ...this.ctx_state.get(this.curr_ctx.constructor) };
      // Object.assign(this.curr_ctx.state, this.ctx_state.get(this.curr_ctx.constructor));
      this.ctx_to_load = this.curr_ctx;
      this.ctx_reload = true;
    } else {
      this.tokenize = undefined;
    }

    this.debug && log('ctx end:;c', `${this.curr_ctx?.name || 'null'} <- ${prev}`, this.buffer.length);
  }


  update_tokenize = () => {

    if (!this.curr_ctx?.tokenize && !this.tokenize) {
      return;
    }

    if (this.curr_ctx?.tokenize) {

      this.tokenize = () => {
        // listen token while tokenize
        const next_token = this.get_next_token();
        if (next_token) this.check_next(next_token);
        if (this.curr_ctx?.tokenize) {
          return this.curr_ctx.tokenize();
        }
      }

    } else {
      this.tokenize = undefined;
    }

  }

  is_end_context(token: string) {
    if (this.curr_ctx && this.curr_ctx.end.has(token)) {
      this.end_context();
      return true;
    }
  }

  check_next(next_token: string) {

    if (this.is_end_context(next_token)) {
      this.debug && log('ctx end:;c', 'next token;y', next_token + ';g');
      this.end_token = next_token;
      return;
    }

    const Ctx = this.token.start.get(next_token);
    if (Ctx) {

      if (this.curr_ctx) {
        if (this.curr_ctx.tokenize) {
          Object.assign(this.curr_ctx.state, this.ctx_state.get(Ctx));
          this.curr_ctx.tokenize();
          this.tokenize = undefined;
        }
      }
    }
  }

  get_next_token = () => {
    let next_token = this.Tokenizer.get_token();
    if (next_token) {
      return next_token;
    } else {
      next_token = this.Tokenizer.get_keyword();
      return next_token;
    }
  };


  len = () => {
    return this.buffer.length;
  }

  has = (token: string) => {
    return this.token.start.has(token) || this.token.end.has(token) || false;
  }

  test = () => {
    console.log(this.buffer.length);
  }

}

export default Context;
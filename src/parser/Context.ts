import { log } from "utils";
import Tokenizer from "./Tokenizer";

interface Ctor<T> {
  new(...args: any): T
}

type Get = () => string | undefined;


export interface TokenContext {
  name: string;
  start: string[];
  end: string[];
  onStart?(): any;
  onEnd?(): any;
  tokenize?(): 'next' | 'skip' | undefined;
}

export class TokenContext {

  constructor(
    public char: Tokenizer['char'],
    public Token: Tokenizer['token'],
    public getToken: Get,
    public getKeyword: Get,
    public increment: (value?: number) => void,
    public currentContex: () => string | null,
    public skipWhitespace: (skip?: boolean) => void,
    // public close: () => void
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

};



class Context {

  start_tokens = new Map<string, Ctor<TokenContext>>();

  ctx_state = new WeakMap();

  end_token?: string;

  constructor(public Tokenizer: Tokenizer) {
  };

  current?: string;
  buffer: context[] = [];
  curr_ctx?: context;
  ctx_to_load?: context;
  skip_token?: string;

  debug = false;

  tokenize?: () => any;


  new_ctx = (Ctx: Ctor<TokenContext>) => {
    const ctx = new Ctx(
      this.Tokenizer.char,
      this.Tokenizer.token,
      () => this.Tokenizer.get_token(),
      () => this.Tokenizer.get_keyword(),
      // increment
      (value = 1) => this.Tokenizer.advance(value),
      // currentContex
      () => this.current,
      // skip whitespace
      (skip = false) => void (this.Tokenizer.skip_whitespace = skip),
      // () => void (this.curr_ctx && (this.curr_ctx._end = true))
    ) as unknown as context;

    const tokenize = Ctx.prototype.tokenize;
    const onStart = Ctx.prototype.onStart;
    const onEnd = Ctx.prototype.onEnd;

    ctx.start = new Set(ctx.start);
    ctx.end = new Set(ctx.end);
    ctx.tokenize = tokenize;
    ctx.onStart = onStart;
    ctx.onEnd = onEnd;
    return ctx;
  }


  extend = (Ctxs: Ctor<TokenContext>[]) => {

    for (const Ctx of Ctxs) {
      const ctx = this.new_ctx(Ctx);

      if (!ctx.name || !ctx.start || ctx.start.size === 0) {
        log('invalid context;r')
      }

      for (const token of ctx.start) {
        // TODO more context with same start tokens?
        this.start_tokens.set(token, Ctx)
      }

      Object.freeze(ctx.state);

      this.ctx_state.set(Ctx, ctx.state);
    }

  }


  check = (token: string) => {

    return;

    if (this.skip_token && this.skip_token == token) {
      return;
    }

    if (this.is_end_context(token)) {
      return;
    }

    const Ctx = this.start_tokens.get(token);

    if (Ctx) {
      const ctx = this.new_ctx(Ctx) as context;
      this.current = ctx.name;
      this.buffer.push(ctx);
      this.ctx_to_load = this.buffer.at(-1)!;
    }

  }


  load = () => {

    if (this.ctx_to_load) {

      this.debug && log('ctx curr:;c', this.ctx_to_load.name, this.buffer.length);

      this.curr_ctx = this.ctx_to_load;

      if (this.curr_ctx.onStart) this.curr_ctx.onStart();

      this.update_tokenize();

      this.ctx_to_load = undefined;
    }

  }


  prev_ctx_to_load?: context;

  end_context = () => {

    if (this.buffer.length === 0 || !this.curr_ctx) {
      this.Tokenizer.error({ message: 'unexpected end context' });
      return;
    }

    (this.curr_ctx.onEnd && this.curr_ctx.onEnd());

    const prev = this.curr_ctx?.name;
    this.buffer.pop();
    this.current = this.buffer.at(-1)?.name;
    this.curr_ctx = this.buffer.at(-1);

    if (this.curr_ctx) {
      Object.assign(this.curr_ctx.state, this.ctx_state.get(this.curr_ctx.constructor));
      this.ctx_to_load = this.curr_ctx;
    } else {
      this.tokenize = undefined;
    }

    this.debug && log('ctx end:;c', `${this.current || 'null'} <- ${prev}`, this.buffer.length, this.Tokenizer.token.value + ';g');
  }


  update_tokenize = () => {

    if (!this.curr_ctx?.tokenize && !this.tokenize) {
      return;
    }

    if (this.curr_ctx?.tokenize) {

      // log('ctx:;c', 'active tokenize;y')

      this.tokenize = () => {
        // listen token while tokenize
        const next_token = this.get_next_token();
        if (next_token) this.check_next(next_token);
        if (this.curr_ctx?.tokenize) {
          return this.curr_ctx.tokenize();
        }
      }
    } else {
      // log('ctx:;c', 'disable tokenize;y')
      this.tokenize = undefined;
    }

  }

  is_end_context(token: string) {
    if (this.curr_ctx && this.curr_ctx.end.has(token)) {
      this.end_token = token;
      this.end_context();
      return true;
    }
  }

  check_next(next_token: string) {

    if (this.is_end_context(next_token)) {
      this.debug && log('ctx;c', 'skip check;y', next_token + ';g')
      this.skip_token = next_token;
      return;
    }

    const Ctx = this.start_tokens.get(next_token);
    if (Ctx) {

      // this.debug && log('ctx update:;c', this.curr_ctx?.constructor.name + ";g", 'from', Ctx.name + ';g');

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
    return this.start_tokens.has(token) || false;
  }

}

export default Context;
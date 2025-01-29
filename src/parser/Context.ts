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
    public Token: Tokenizer['Token'],
    public getToken: Get,
    public getKeyword: Get,
    public increment: (value?: number) => void,
    public currentContex: () => string | null,
    // public close: () => void
  ) {

  }

  name: string = '';
  start: string[] = [];
  end: string[] = [];
}

type context = Omit<TokenContext, 'start' | 'end'> & {
  start: Set<string>;
  end: Set<string>;
};



class Context {

  start_tokens = new Map<string, Ctor<TokenContext>>();

  default_keys: Set<string>;

  ctx_state = new WeakMap();

  end_token = '';

  constructor(public Tokenizer: Tokenizer) {
    // @ts-ignore;
    this.default_keys = new Set(Object.getOwnPropertyNames(new TokenContext));
    this.default_keys
      .add('onStart')
      .add('onEnd')
      .add('tokenize')
  };

  current?: string;
  buffer: context[] = [];
  curr_ctx?: context;
  state: { [key: string]: any } = {}

  tokenize?: () => any;

  new_ctx = (Ctx: Ctor<TokenContext>) => {
    const ctx = new Ctx(
      this.Tokenizer.char,
      this.Tokenizer.Token,
      () => this.Tokenizer.get_token(this.Tokenizer),
      () => this.Tokenizer.get_keyword(this.Tokenizer),
      // increment
      (value = 1) => void (this.Tokenizer.index += value, this.Tokenizer.pos += value),
      // currentContex
      () => this.current,
      // end
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

      const properties = Object.getOwnPropertyNames(ctx) as (keyof typeof ctx)[];

      const state: any = {}

      for (const key of properties) {
        if (!this.default_keys.has(key)) {
          state[key] = ctx[key];
        }
      }

      for (const token of ctx.start) {
        // TODO more context with same start tokens?
        this.start_tokens.set(token, Ctx)
      }

      this.ctx_state.set(Ctx, state);

    }

  }


  check = (current_token = this.Tokenizer.Token.value) => {

    if (this.is_end_context(current_token)) {
      return;
    }

    if (this.end_token == current_token) {
      return;
    }

    const Ctx = this.start_tokens.get(current_token);

    if (Ctx) {

      const state = this.ctx_state.get(Ctx) || {};

      this.state = {
        ...this.state,
        ...state,
      }

      const ctx = this.new_ctx(Ctx) as context;

      log('ctx:;c', ctx.name, this.buffer.length, this.Tokenizer.Token.value + ';g');

      this.current = ctx.name;
      this.buffer.push(ctx);
      this.curr_ctx = this.buffer.at(-1)!;

      this.update_tokenize();
    }
  }


  end_context = () => {

    if (this.buffer.length === 0) {
      this.Tokenizer.error({ message: 'unexpected end context' });
      return;
    }

    if (this.curr_ctx && this.curr_ctx.onEnd) {
      this.curr_ctx.onEnd();
    }

    const prev = this.curr_ctx?.name;

    this.buffer.pop();

    this.current = this.buffer.at(-1)?.name;
    this.curr_ctx = this.buffer.at(-1);

    if (this.curr_ctx) {
      Object.assign(this.curr_ctx!, this.ctx_state.get(this.curr_ctx.constructor));
      this.update_tokenize();
    }

    log('ctx end:;c', `${this.current || 'null'} <- ${prev}`, this.buffer.length, this.Tokenizer.Token.value + ';g');

    this.current = this.buffer.at(-1)?.name;
  }


  update_tokenize = () => {

    if (this.curr_ctx?.tokenize) {
      this.tokenize = () => {
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
    if (this.curr_ctx) {
      if (this.curr_ctx.end.has(token)) {
        this.end_token = token;
        this.end_context();
        return true;
      }
    }
  }

  check_next(next_token: string) {

    if (this.is_end_context(next_token)) {
      return;
    }

    const Ctx = this.start_tokens.get(next_token);
    if (Ctx) {

      const state = this.ctx_state.get(Ctx) || {};

      this.state = {
        ...this.state,
        ...state,
      }

      log('ctx update;c');

      if (this.curr_ctx!.tokenize) {
        Object.assign(this.curr_ctx!, this.state);
        this.curr_ctx!.tokenize();
        this.tokenize = undefined;
      }

    }

  }


  create_context = <T>(Ctx: Ctor<T>) => {


  }

  check_tokenize = () => {

  };


  get_next_token = () => {
    let next_token = this.Tokenizer.get_token(this.Tokenizer);
    if (next_token) {
      return next_token;
    } else {
      next_token = this.Tokenizer.get_keyword(this.Tokenizer);
      return next_token;
    }
  };

}

export default Context;
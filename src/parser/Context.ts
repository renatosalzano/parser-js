import { log } from "utils";
import Tokenizer from "./Tokenizer";

export type CtxParams = {
  char: Tokenizer['char'];
  Token: Tokenizer['Token'];
  index: Tokenizer['index'];
  increment: (value: number) => void;
  getToken: () => string | undefined;
  getKeyword: () => string | undefined;
}

type Get = () => string | undefined;

export class Ctx {
  name: string = '';
  start: string = '';

  constructor(
    public char: Tokenizer['char'],
    public token: Tokenizer['Token'],
    public getToken: Get,
    public getKeyword: Get,
    public increment: (value?: number) => void,
    public end: () => void
  ) {

  }

  checkTokenType(): string | undefined | void { };
  tokenize: { [key: string]: () => 'next' | 'skip' | undefined } = {};


}

type context = Ctx & { _index: number, _end: boolean };

interface Ctor<T> {
  new(...args: any): T
}

class Context {

  start_tokens = new Map<string, Ctor<Ctx>>()

  constructor(public Tokenizer: Tokenizer) { };

  current?: string;
  buffer: context[] = [];
  curr_ctx?: context;

  ctx_map = new WeakMap();

  tokenize?: () => any;

  new_ctx = (Ctx: Ctor<Ctx>) => {
    return new Ctx(
      this.Tokenizer.char,
      this.Tokenizer.Token,
      () => this.Tokenizer.get_token(this.Tokenizer),
      () => this.Tokenizer.get_keyword(this.Tokenizer),
      (value = 1) => void (this.Tokenizer.index += value, this.Tokenizer.pos += value),
      () => void (this.curr_ctx && (this.curr_ctx._end = true))
    )
  }

  extend = (Ctxs: Ctor<Ctx>[]) => {

    for (const Ctx of Ctxs) {
      const ctx = this.new_ctx(Ctx);

      if (!ctx.name) {
        log('ctx must have a name;r')
      }

      for (const method in ctx.tokenize) {
        if (typeof ctx.tokenize[method] !== 'function') {
          log('invalid context tokenize;r');
        }
      }

      if (ctx.start) {
        this.start_tokens.set(ctx.start, Ctx);
      }
    }

  }

  check = () => {

    if (this.curr_ctx?._end) {
      this.end_context();
    } else {

      const token = this.Tokenizer.Token.value
      const Ctx = this.start_tokens.get(token);

      if (Ctx) {

        const ctx = this.new_ctx(Ctx) as context;

        log('ctx:;c', ctx.name, this.buffer.length);

        ctx._index = this.buffer.length;
        ctx._end = false;

        this.buffer.push(ctx);
        this.curr_ctx = this.buffer.at(-1)!;
      }

    }


  }

  create_context = <T>(Ctx: Ctor<T>) => {


  }

  end_context = () => {

    if (this.buffer.length === 0) {
      this.Tokenizer.error({ message: 'unexpected end context' });
      return;
    }

    const prev = this.curr_ctx?.name;

    this.buffer.pop();

    this.current = this.buffer.at(-1)?.name;
    this.curr_ctx = this.buffer.at(-1);

    console.log(this.curr_ctx)

    log('close context:;g', ` ${this.current || 'null'} <- ${prev}`);

    this.current = this.buffer.at(-1)?.name;
  }

  check_token_type = () => {
    if (this.curr_ctx) {
      const result = this.curr_ctx.checkTokenType();
      if (result && this.curr_ctx.tokenize[result]) {
        this.tokenize ??= this.curr_ctx.tokenize[result];
      } else {
        this.tokenize = undefined;
      }
    }
  };
}

export default Context;
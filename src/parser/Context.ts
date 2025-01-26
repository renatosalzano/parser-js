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

export type Ctx = {
  name: string;
  checkTokenType?: (params: CtxParams) => string | undefined | void;
  tokenize?: (params: CtxParams) => {
    [key: string]: () => 'next' | 'skip' | void;
  }
}

type context = Ctx & {
  methods: Map<string, () => any>;
}

interface Ctor<T> {
  new(...args: any): T
}

class Context {

  constructor(public Tokenizer: Tokenizer) { };

  current?: string;
  buffer: context[] = [];
  curr_ctx?: context;

  tokenize?: () => any;

  create_context = <T>(Ctx: Ctor<T>) => {

    const ctx = this.check_context(Ctx);

    this.buffer.push(ctx);
    this.curr_ctx = this.buffer.at(-1)!;

    log('created context:;y', this.curr_ctx.name);

    this.check_token_type = this.run_context;

    return ctx as T;
  }

  end_context = () => {
    // close last context active;
    if (this.buffer.length === 0) {
      this.Tokenizer.error({ message: 'unexpected end context' });
      return;
    }

    const prev = this.curr_ctx?.name;

    this.buffer.pop();

    this.current = this.buffer.at(-1)?.name;
    this.curr_ctx = this.buffer.at(-1);

    if (this.buffer.length > 0) {
      this.check_token_type = this.run_context;
    } else {
      this.check_token_type = () => { };
    }

    log('close context:;g', `${prev} --> ${this.current || 'null'}`);

    this.current = this.buffer.at(-1)?.name;
  }

  context_map = new WeakMap();

  check_context = <T>(Ctx: Ctor<T>) => {

    if (this.context_map.has(Ctx)) {
      return this.context_map.get(Ctx) as context;
    }

    const ctx = new Ctx() as context;

    log('new fresh context;y', ctx.name);

    switch (true) {
      case !ctx.name:
        this.Tokenizer.error({ title: 'Unexpected context', message: 'Missing \'name\'' });
        break;
      case 'checkTokenType' in ctx || 'tokenize' in ctx: {

        if (!('checkTokenType' in ctx)) {
          this.Tokenizer.error({ title: 'Unexpected context', message: 'Missing \'checkTokenType\'' });
          break;
        }

        if (!('tokenize' in ctx)) {
          this.Tokenizer.error({ title: 'Unexpected context', message: 'Missing \'tokenizer\'' });
          break;
        }
        // @ts-ignore
        ctx.methods = new Map(Object.entries(ctx.tokenize({} as any)));
        break;
      }
    }

    this.context_map.set(Ctx, ctx);
    return ctx;
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

    if (this.curr_ctx && this.curr_ctx.checkTokenType && this.curr_ctx.tokenize) {
      const type = this.curr_ctx.checkTokenType(this.get_api());
      log('run context;c', type)
      if (type && this.curr_ctx.methods.has(type)) {
        this.tokenize ??= this.curr_ctx.tokenize(this.get_api())[type];
      } else {
        this.tokenize = undefined;
        return
      }
    }

  }

  check_token_type = () => { };
}

export default Context;
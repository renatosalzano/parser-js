import { log } from "utils";
import Tokenizer, { Token } from "./Tokenizer";

type TempToken = [Token, [number, number, number]];

class TokenBuffer {

  record = false;

  current_token?: TempToken = undefined;
  token = {} as Token;
  buffer: TempToken[] = [];

  each_callback?: (token: Token) => void;

  constructor(public Tokenizer: Tokenizer) { }

  push = () => {

    if (!this.record) return;
    if (!this.current_token) {
      this.current_token = this.ref();
    } else {

      this.buffer.push(this.ref());
    }

  }

  get = (set_tokenizer = true) => {
    if (this.record) return false;

    if (!set_tokenizer) {
      const next_token = this.buffer?.[0]?.[0];
      return next_token;
    };

    const first_tt = this.buffer.shift();
    this.debug('get', first_tt?.[0]);

    if (first_tt) {
      this.set_tokenizer(first_tt);
      return true;
    }
  }

  start = (each_callback?: (token: Token) => void) => {
    this.debug('start');
    this.record = true;
    this.each_callback = each_callback;

    const last_tt = this.buffer.at(-1);
    if (last_tt) {
      this.debug('current')
      this.set_tokenizer(last_tt);
    } else {

      const { type } = this.Tokenizer.Token;

      if (type !== 'unknown') {

        this.current_token = this.ref();
      }
    }
  }

  stop = () => {
    this.debug('stop');
    this.record = false;
    this.each_callback = undefined;

    if (this.current_token) {
      this.set_tokenizer(this.current_token);
    }
  }

  eat = () => {
    const last_tt = this.buffer.at(-1);

    if (last_tt) {
      this.debug('eat');
      this.set_tokenizer(last_tt);
      this.current_token = undefined;
      this.buffer = [];
      this.token = {} as Token;
    }

    this.Tokenizer.next();
  }

  private set_tokenizer = (tt: TempToken) => {
    const [{ value, type }, [index, line, pos]] = tt;

    delete this.Tokenizer.Token[this.Tokenizer.Token.type];
    this.Tokenizer.Token.value = value;
    this.Tokenizer.Token.type = type;
    this.Tokenizer.Token[type] = true;

    this.Tokenizer.index = index;
    this.Tokenizer.line = line;
    this.Tokenizer.pos = pos;
    this.debug('set');
  }

  private ref() {
    const { type, value, ...r } = this.Tokenizer.Token;

    // this.token = this.Tokenizer.Token;
    if (this.token.type) {
      Object.assign(this.token, r);
      delete this.token[this.token.type]
    };
    this.token.value = value;
    this.token.type = type;
    this.token[type] = true;


    if (!this.current_token) {
      this.debug('current')
    } else {
      this.debug('cache');
    }

    if (this.each_callback) this.each_callback(this.token);
    return [{ type, value, ...r }, this.Tokenizer.History.location()] as TempToken;
  }

  private debug(type: 'start' | 'stop' | 'cache' | 'current' | 'get' | 'set' | 'eat', token?: Token) {
    if (this.Tokenizer.debug.TokenBuffer) {
      const location = this.Tokenizer.History.location();
      switch (type) {
        case "start":
          log('TokenBuffer;c', 'start;g');
          break;
        case "stop":
          log('TokenBuffer;c', 'stop;r');
          break;
        case "cache":
          log('TokenBuffer;c', 'cache next token;y', this.token.value);
          break;
        case "current":
          log('TokenBuffer;c', 'cache current token;y', this.token.value);
          break;
        case "get":
          log('TokenBuffer;c', 'get cached token;y', token?.value || 'null');
          break;
        case "set":
          log('TokenBuffer;c', 'set current token;y', this.Tokenizer.Token.value);
          break;
        case "eat":
          log('TokenBuffer;c', 'eated;y', this.buffer.length, 'tokens;g');
          break;
      }
    }
  }
}

export default TokenBuffer;
import { log } from "utils";
import Tokenizer, { Token } from "./Tokenizer";
import { writeFileSync } from "fs";

type token = Omit<Token, 'eq'>;

class History {

  history: [number, number, number][] = [];
  current: [number, number, number];

  tokens: token[] = [];
  tokens_buffer: number[] = [];

  record = false;
  each_callback?: (token: Token) => void;

  constructor(public Tokenizer: Tokenizer) {
    this.current = [0, 1, 1];
  }

  token_start = 0;
  set_token_start = () => {
    const { pos } = this.Tokenizer;
    this.token_start = pos;
  }

  last_token = () => {
    const last_token = this.tokens.at(-1);
    if (last_token) {

      const { value, type, location } = last_token;
      const { line, start, end } = location || {};

      this.Tokenizer.Token.value = value;
      this.Tokenizer.Token.type = type;
      this.Tokenizer.Token.location.start = start;
      this.Tokenizer.Token.location.end = end;
      this.Tokenizer.Token.location.line = line;

    }
  }

  get_next = (): Token | undefined => {
    const next_token_index = this.tokens_buffer[0];
    if (next_token_index !== undefined) {
      const { value, type, location } = this.tokens[next_token_index] as Token;
      const { eq } = this.Tokenizer.Token;
      return { value, type, location, eq };
    }
  }

  shift = () => {

    if (this.record) return false;

    const token_index = this.tokens_buffer.shift();

    if (token_index !== undefined) {
      const { value, type, location } = this.tokens[token_index];
      const { start, end } = location || {};

      if (start === undefined || end === undefined) {
        throw { title: 'Unexpected Error', message: '', at: 'History.ts' }
      }

      const [index, line, pos] = this.history[token_index];

      this.Tokenizer.index = index;
      this.Tokenizer.line = line;
      this.Tokenizer.pos = pos;

      this.Tokenizer.Token.value = value;
      this.Tokenizer.Token.type = type;
      this.Tokenizer.Token.location.start = start;
      this.Tokenizer.Token.location.end = end;
      this.Tokenizer.Token.location.line = line;
      return true;
    }

  }

  push = () => {
    const { index, line, pos } = this.Tokenizer;



    if (this.compare([index, line, pos])) {
      console.log(this.Tokenizer.Token)
      this.Tokenizer.error({ title: "Tokenize Error", message: "terminated for preventing loop" });
    }

    this.history.push([index, line, pos]);

    this.current = [index, line, pos];

    const { value, type } = this.Tokenizer.Token;
    const { token_start } = this;

    // add location
    this.Tokenizer.Token.location.start = token_start;
    this.Tokenizer.Token.location.end = pos;
    this.Tokenizer.Token.location.line = line;

    const location = { line, start: token_start, end: pos };

    const token_index = this.tokens.push({ value, type, location }) - 1;
    if (this.record) {
      this.tokens_buffer.push(token_index);
    }
  }

  compare = (a: [number, number, number], b?: [number, number, number]) => {
    if (b) {
      return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
    } else {
      const [index, line, pos] = this.current;
      return a[0] === index && a[1] === line && a[2] === pos
    }
  }

  eat = () => {
    const last_token_index = this.tokens_buffer.at(-1);
    if (last_token_index !== undefined) {
      log('eat called')

      const { value, type, location } = this.tokens[last_token_index];
      const { line, start, end } = location || {};

      if (line === undefined || start === undefined || end === undefined) {
        throw { title: 'Unexpected Error', message: '', at: 'History.ts' }
      }

      this.Tokenizer.index = end;
      this.Tokenizer.line = line;
      this.Tokenizer.pos = end;

      this.Tokenizer.Token.value = value;
      this.Tokenizer.Token.type = type;
      this.Tokenizer.Token.location.start = start;
      this.Tokenizer.Token.location.end = end;
      this.Tokenizer.Token.location.line = line;

      this.tokens_buffer = [];
      this.Tokenizer.next();
    }
  }

  location = () => {
    const [i, l, p] = this.history.at(-1) || this.current;
    return [i, l, p] as [number, number, number]
  }

  log = (error = false) => {
    const { location } = this.tokens.at(-1) || {};

    if (!location) return;
    const { line, start, end } = location;
    if (error) return `${line}:${start}`
    // @ts-ignore
    return `${line}`.cyan() + `:${start},${end}`;
  }

  /**
  * start cache tokens
  */
  start(each_callback?: (token: Token) => void) {
    this.record = true;
    this.each_callback = each_callback;
    this.tokens_buffer.push(this.tokens.length - 1);
  }
  /**
  * stop cache tokens
  */
  stop() {
    this.record = false;
    this.each_callback = undefined;
    this.shift();
  }

  JSON = (path: string) => {
    writeFileSync(path, JSON.stringify(this.tokens, null, 2))
  }

}

export default History;
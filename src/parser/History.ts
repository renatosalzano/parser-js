import { log } from "utils";
import Tokenizer, { Token } from "./Tokenizer";

type token = Omit<Token, 'eq'>;

class History {

  history: [number, number, number][] = [];
  Token: Omit<Token, 'eq'>[] = [];
  current: [number, number, number];

  tokens: token[] = [];
  tokens_buffer: number[] = [];

  record = false;

  constructor(public Tokenizer: Tokenizer) {
    this.current = [0, 1, 1];
  }

  get_next = () => {
    return this.tokens[this.tokens_buffer[0]];
  }

  shift = () => {

    if (this.record) return false;

    const token_index = this.tokens_buffer.shift();

    if (token_index !== undefined) {
      const { value, type, location } = this.tokens[token_index];
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
      return true;
    }

  }

  push = () => {
    const { index, line, pos } = this.Tokenizer;
    this.history.push([index, line, pos]);
    this.current = [index, line, pos];

    const { value, type } = this.Tokenizer.Token;

    // add location
    const start = pos - value.length;
    this.Tokenizer.Token.location.start = start;
    this.Tokenizer.Token.location.end = pos;
    this.Tokenizer.Token.location.line = line;

    const location = { line, start, end: pos };

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


  location = () => {
    const [i, l, p] = this.history.at(-1) || this.current;
    return [i, l, p] as [number, number, number]
  }

  loc = (error = false) => {
    const { location } = this.tokens.at(-1) || {};

    if (!location) return;

    const { line, start, end } = location;
    if (error) return `${line}:${start}`
    // @ts-ignore
    return `${line}`.cyan() + `:${start},${end}`;
  }

  start() {
    this.record = true;
  }

  end() {
    this.record = false;
  }

}

export default History;
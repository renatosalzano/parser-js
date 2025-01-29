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

  token_start = [0, 1, 1];
  set_token_start = () => {
    const { index, line, pos, } = this.Tokenizer;
    this.token_start = [index, line, pos]
  }

  set_token_loc = () => {

  }

  last_token = () => {
    const last_token = this.tokens.at(-1);
    if (last_token) {

      const { value, type, start, end, loc } = last_token;

      this.Tokenizer.Token.value = value;
      this.Tokenizer.Token.type = type;

      this.Tokenizer.Token.start = start;
      this.Tokenizer.Token.end = end;

      this.Tokenizer.Token.loc.start.ln = loc.start.ln;
      this.Tokenizer.Token.loc.start.col = loc.start.col;
      this.Tokenizer.Token.loc.end.ln = loc.end.ln;
      this.Tokenizer.Token.loc.end.col = loc.end.col;
    }
  }

  get_next = (): Token | undefined => {
    const next_token_index = this.tokens_buffer[0];
    if (next_token_index !== undefined) {
      const { value, type, start, end, loc } = this.tokens[next_token_index] as Token;
      const { eq } = this.Tokenizer.Token;
      return { value, type, start, end, loc, eq };
    }
  }

  shift = () => {

    if (this.record) return false;

    const token_index = this.tokens_buffer.shift();

    if (token_index !== undefined) {
      const { value, type, start, end, loc } = this.tokens[token_index];

      const [index, line, pos] = this.history[token_index];

      this.Tokenizer.index = index;
      this.Tokenizer.line = line;
      this.Tokenizer.pos = pos;

      this.Tokenizer.Token.value = value;
      this.Tokenizer.Token.type = type;

      this.Tokenizer.Token.start = start;
      this.Tokenizer.Token.end = end;

      this.Tokenizer.Token.loc.start.ln = loc.start.ln;
      this.Tokenizer.Token.loc.start.col = loc.start.col;
      this.Tokenizer.Token.loc.end.ln = loc.end.ln;
      this.Tokenizer.Token.loc.end.col = loc.end.col;
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
    const { token_start: [start_index, start_line, start_pos] } = this;

    // add location

    this.Tokenizer.Token.start = start_index;
    this.Tokenizer.Token.end = index;

    this.Tokenizer.Token.loc.start.ln = start_line;
    this.Tokenizer.Token.loc.start.col = start_pos;
    this.Tokenizer.Token.loc.end.ln = line;
    this.Tokenizer.Token.loc.end.col = pos;

    const loc = {
      start: { ln: start_line, col: start_pos },
      end: { ln: line, col: pos },
    };

    const token_index = this.tokens.push({ value, type, start: start_index, end: index, loc }) - 1;
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

      const { value, type, start, end, loc } = this.tokens[last_token_index];

      this.Tokenizer.index = end;
      this.Tokenizer.line = loc.end.ln;
      this.Tokenizer.pos = loc.end.col;

      this.Tokenizer.Token.value = value;
      this.Tokenizer.Token.type = type;

      this.Tokenizer.Token.start = start;
      this.Tokenizer.Token.end = end;

      this.Tokenizer.Token.loc.start.ln = loc.start.ln;
      this.Tokenizer.Token.loc.start.col = loc.start.col;
      this.Tokenizer.Token.loc.end.ln = loc.end.ln;
      this.Tokenizer.Token.loc.end.col = loc.end.col;

      this.tokens_buffer = [];
      this.Tokenizer.next();
    }
  }

  location = () => {
    const [i, l, p] = this.history.at(-1) || this.current;
    return [i, l, p] as [number, number, number]
  }

  log = (error = false) => {
    const { start, end, loc } = this.tokens.at(-1) || {};

    if (!loc) return end;

    if (error) return `${loc.end.ln}:${start}`
    // @ts-ignore
    return `${loc.end.ln}`.cyan() + `:${start},${end}`;
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
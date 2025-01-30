import { log } from "utils";
import Tokenizer, { Token } from "./Tokenizer";
import { writeFileSync } from "fs";

type token = Omit<Token, 'eq'>;

class History {

  history: [number, number, number][] = [];
  current: [number, number, number];

  tokens: token[] = [];
  tokens_buffer: number[] = [];
  tokens_to_spend: number[] = [];

  record = false;
  nested_record = false;

  each_callback?: (token: Token) => void;

  constructor(public Tokenizer: Tokenizer) {
    this.current = [0, 1, 1];
  }

  token_start = [0, 1, 1];
  set_token_start = () => {
    const { index, line, pos, } = this.Tokenizer;
    this.token_start = [index, line, pos]
  }

  set_token = ({
    value = '',
    type = 'unknown',
    start = 0,
    end = 0,
    loc = { start: { ln: 0, col: 0 }, end: { ln: 0, col: 0 } }
  }: token = {} as token) => {
    this.Tokenizer.Token.value = value;
    this.Tokenizer.Token.type = type;

    this.Tokenizer.Token.start = start;
    this.Tokenizer.Token.end = end;

    this.Tokenizer.Token.loc.start.ln = loc.start.ln;
    this.Tokenizer.Token.loc.start.col = loc.start.col;
    this.Tokenizer.Token.loc.end.ln = loc.end.ln;
    this.Tokenizer.Token.loc.end.col = loc.end.col;
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

    log('shift called', this.record, this.nested_record)

    if (this.record && this.nested_record) {
      // the legend of the phantom token
      console.log('phantom', this.Tokenizer.Token)
      return false;
    }

    if (this.record && this.tokens_to_spend.length > 0) {
      // free token!
      const token_index = this.tokens_to_spend.shift()!;
      log('free token!!!;g', this.tokens[token_index])
      const { value, type, start, end, loc } = this.tokens[token_index];
      this.set_token({ value, type, start, end, loc });
      return true;
    }

    if (this.record) return false;

    const token_index = this.tokens_buffer.shift();

    if (token_index !== undefined) {
      const { value, type, start, end, loc } = this.tokens[token_index];

      const [index, line, pos] = this.history[token_index];

      this.Tokenizer.index = index;
      this.Tokenizer.line = line;
      this.Tokenizer.pos = pos;

      this.set_token({
        value: value,
        type: type,
        start: start,
        end: end,
        loc: loc,
      });

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
    console.log('pushed', this.tokens.at(-1))
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

    if (this.record) {
      this.nested_record = true;
    }

    this.record = true;
    this.tokens_to_spend = [...this.tokens_buffer];

    this.each_callback = each_callback;

    if (this.tokens.length > 0) {
      this.tokens_buffer.push(this.tokens.length - 1);
    }

  }
  /**
  * stop cache tokens
  */
  stop() {
    this.record = false;
    this.each_callback = undefined;

    if (this.nested_record) {
      this.nested_record = false;

      if (this.tokens.length == 1) {
        // empty token
        this.Tokenizer.index = 0;
        this.Tokenizer.line = 1;
        this.Tokenizer.pos = 1;

        this.set_token();
      } else {
        const token_index = this.tokens_buffer[0];
        const { type, value, start, end, loc } = this.tokens[token_index]!;
        this.set_token({ type, value, start, end, loc })
      }
      this.start();
    } else {

      this.shift();
    }

  }

  JSON = (path: string) => {
    writeFileSync(path, JSON.stringify(this.tokens, null, 2))
  }

}

export default History;
import { log } from "utils";
import Tokenizer, { Token } from "./Tokenizer";
import { writeFileSync } from "fs";

type token = Omit<Token, 'eq' | 'loc'> & {
  loc?: Token['loc']
};

class History {

  history: [number, number, number][] = [];
  current: [number, number, number];
  list: any[] = [];

  tokens: token[] = [];
  current_token?: token;

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
    type = '',
    subtype = '',
    start = 0,
    end = 0,
    loc = { start: { ln: 0, col: 0 }, end: { ln: 0, col: 0 } }
  }: token = {} as token, token: 'token' | 'prev_token' | 'next_token' = 'token') => {

    this.Tokenizer[token].value = value;
    this.Tokenizer[token].type = type;

    if (subtype) {
      this.Tokenizer[token].subtype = subtype;
    } else {
      delete this.Tokenizer[token].subtype
    }

    this.Tokenizer[token].start = start;
    this.Tokenizer[token].end = end;

    if (this.Tokenizer[token].loc) {
      this.Tokenizer[token].loc.start.ln = loc.start.ln;
      this.Tokenizer[token].loc.start.col = loc.start.col;
      this.Tokenizer[token].loc.end.ln = loc.end.ln;
      this.Tokenizer[token].loc.end.col = loc.end.col;
    }

  }

  get_token = (index: number) => {

    const token = this.tokens[index];
    this.set_token(token);

    if (this.tokens[index + 1]) {
      this.set_token(this.tokens[index + 1], 'next_token');
    }

  }

  prev_token = () => {
    const prev_token = this.tokens.at(-1);
    if (prev_token) {
      this.set_token(prev_token, 'prev_token');
    }
  }

  last_token = () => {

    const last_token = this.tokens.at(-1);
    if (last_token) this.set_token(last_token);

  }

  push = () => {

    const { index, line, pos } = this.Tokenizer;

    if (this.compare([index, line, pos])) {
      console.log(this.Tokenizer.token)
      this.Tokenizer.error({ title: "Tokenize Error", message: "terminated for preventing loop" });
    }

    this.history.push([index, line, pos]);

    this.current = [index, line, pos];

    const { value, type, subtype } = this.Tokenizer.token;
    const { token_start: [start_index, start_line, start_pos] } = this;

    // add location

    this.set_token({
      value,
      type,
      subtype,
      start: start_index,
      end: index,
      loc: {
        start: { ln: start_line, col: start_pos },
        end: { ln: line, col: pos }
      }
    })

    const loc = {
      start: { ln: start_line, col: start_pos },
      end: { ln: line, col: pos },
    };

    this.tokens.push({ value, type, subtype, start: start_index, end: index, loc });

    this.list.push(`${type}, ${subtype || ''} ${value}`);
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

  log = (error = false) => {
    const { start, end, loc } = this.tokens.at(-1) || {};

    if (!loc) return end;

    if (error) return `${loc.end.ln}:${start}`
    // @ts-ignore
    return `${loc.end.ln}`.cyan() + `:${start},${end}`;
  }

  JSON = (path: string) => {
    writeFileSync(path, JSON.stringify(this.list, null, 2))
    console.log('JSON')
  }

}

export default History;
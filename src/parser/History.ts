import { log } from "utils";
import Tokenizer, { Token } from "./Tokenizer";

class History {

  history: [number, number, number][] = [];
  Token: Omit<Token, 'eq'>[] = [];
  current: [number, number, number];


  constructor(public Tokenizer: Tokenizer) {
    this.current = [0, 1, 1];
  }

  push = () => {
    const { index, line, pos } = this.Tokenizer;
    this.history.push([index, line, pos]);
    this.current = [index, line, pos];

    // save token
    const { value, type } = this.Tokenizer.Token;
    this.Token.push({ value, type });
    this.Tokenizer.Token.location = { line, pos };
  }

  compare = (a: [number, number, number], b?: [number, number, number]) => {
    if (b) {
      return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
    } else {
      const [index, line, pos] = this.current;
      return a[0] === index && a[1] === line && a[2] === pos
    }
  }

  back = () => {

    if (this.history.length !== 1) {
      this.history.pop()
    }

    const [index, line, pos] = this.history.at(-1) as [number, number, number];
    this.Tokenizer.index = index;
    this.Tokenizer.line = line;
    this.Tokenizer.pos = pos;

    this.Tokenizer.char.prev = this.Tokenizer.source[index - 1];
    this.Tokenizer.char.curr = this.Tokenizer.source[index];
    this.Tokenizer.char.next = this.Tokenizer.source[index + 1];

    // restore prev token

    if (this.Token.length !== 1) {
      this.Token.pop()
    }

    const { value, type } = this.Token.at(-1)!;

    delete this.Tokenizer.Token[this.Tokenizer.Token.type];
    this.Tokenizer.Token.value = value;
    this.Tokenizer.Token.type = type;
    this.Tokenizer.Token[type] = true;

  }

  location = () => {
    const [i, l, p] = this.history.at(-1) || this.current;
    return [i, l, p] as [number, number, number]
  }

  loc = (error = false) => {
    const [, , pos] = this.history.at(-1) || this.current;
    const { line, index, Token, char } = this.Tokenizer;
    const offset = (Token.value || char.curr).length;
    if (error) return `${line}:${pos}`
    // @ts-ignore
    return `${line}`.cyan() + `:${pos},${pos + offset}`;
  }

}

export default History;
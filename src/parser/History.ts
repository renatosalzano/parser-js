import { log } from "utils";
import Parser, { Token } from "./Tokenizer";

class History {

  history: [number, number, number][] = [];
  Token: Omit<Token, 'eq'>[] = [];
  current: [number, number, number];

  stashed?: [number, number, number];
  stashed_token?: Omit<Token, 'eq'>;

  constructor(public Parser: Parser) {
    this.current = [0, 1, 1];
  }

  push = () => {
    const { index, line, pos } = this.Parser;
    this.history.push([index, line, pos]);
    this.current = [index, line, pos];

    // clean stash
    this.stashed = undefined;
    this.stashed_token = undefined;

    // save token
    const { value, type, name } = this.Parser.Token;
    if (name) this.Token.push({ value, type, name });
    else this.Token.push({ value, type });
  }

  stash = () => {
    if (this.Token.length === 0) {
      log('cannot stash with empty history;r');
    }

    if (this.history.length !== 1) {
      this.history.pop()
    }

    const { index, line, pos } = this.Parser;
    this.stashed = [index, line, pos];

    {
      // stash token
      const { value, type, name } = this.Token.at(-1)!;
      this.stashed_token = { value, type };
      if (name) this.stashed_token.name = name;
    }

    if (this.Token.length !== 1) {
      this.Token.pop()
    }

    const { value, type, name } = this.Token.at(-1)!;

    delete this.Parser.Token.name;
    delete this.Parser.Token[this.Parser.Token.type];
    this.Parser.Token.value = value;
    this.Parser.Token.type = type;
    this.Parser.Token[type] = true;
    if (name) this.Parser.Token.name = name;
  };

  apply = () => {

    if (!this.stashed || !this.stashed_token) throw 'unexpected error: can not apply stash';

    const [index, line, pos] = this.stashed;

    this.current = [index, line, pos];

    this.Parser.index = index;
    this.Parser.line = line;
    this.Parser.pos = pos;

    this.Parser.char.prev = this.Parser.source[index - 1];
    this.Parser.char.curr = this.Parser.source[index];
    this.Parser.char.next = this.Parser.source[index + 1];

    const { type, value, name } = this.stashed_token;

    delete this.Parser.Token.name;
    delete this.Parser.Token[this.Parser.Token.type];
    this.Parser.Token.value = value;
    this.Parser.Token.type = type;
    this.Parser.Token[type] = true;
    if (name) this.Parser.Token.name = name;
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
    this.Parser.index = index;
    this.Parser.line = line;
    this.Parser.pos = pos;

    this.Parser.char.prev = this.Parser.source[index - 1];
    this.Parser.char.curr = this.Parser.source[index];
    this.Parser.char.next = this.Parser.source[index + 1];

    // restore prev token

    if (this.Token.length !== 1) {
      this.Token.pop()
    }

    const { value, type, name } = this.Token.at(-1)!;

    delete this.Parser.Token.name;
    delete this.Parser.Token[this.Parser.Token.type];
    this.Parser.Token.value = value;
    this.Parser.Token.type = type;
    this.Parser.Token[type] = true;
    if (name) this.Parser.Token.name = name;

  }

  loc = (error = false) => {
    const [, , pos] = this.history.at(-1) || this.current;
    const { line, index, Token, char } = this.Parser;
    const offset = (Token.value || char.curr).length;
    if (error) return `${line}:${pos}`
    // @ts-ignore
    return `${line}`.cyan() + `:${pos},${pos + offset}`;
  }

}

export default History;
import Parser, { Token } from "./Parser";

class History {

  history: [number, number, number][] = [];
  Token: Omit<Token, 'eq'>[] = [];

  constructor(public Parser: Parser) { }

  token = () => {
    const { value, type, name } = this.Parser.Token;
    if (name) this.Token.push({ value, type, name });
    else this.Token.push({ value, type });
  }

  push = (skip_token = false) => {
    const { index, line, pos, Token } = this.Parser;
    this.history.push([index, line, pos]);
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
    const [, , pos] = this.history.at(-1) as [number, number, number];
    const { line, index, Token, char } = this.Parser;
    const offset = (Token.value || char.curr).length;
    if (error) return `${line}:${pos}`
    // @ts-ignore
    return `${line}`.cyan() + `:${pos},${pos + offset}`;
  }

}

export default History;
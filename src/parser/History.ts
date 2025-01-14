import Parser, { Token } from "./Parser";

class History {

  history: [number, number, number][] = [];
  token: { [key: number]: { [key: string]: string } } = {};

  constructor(public Parser: Parser) {

  }

  set = (token: Token) => {

    this.token[this.Parser.index - token.value.length] = {
      [token.type]: token.value
    };
  }

  push = () => {
    const { index, line, pos } = this.Parser;
    this.history.push([index, line, pos])
  }

  back = () => {
    if (this.history.length !== 1) {
      this.history.pop()
    }
    const [index, line, pos] = this.history.at(-1) as [number, number, number];
    // console.log('history prev', index)
    this.Parser.index = index;
    this.Parser.line = line;
    this.Parser.pos = pos;
    this.Parser.char.prev = this.Parser.source[index - 1]
    this.Parser.char.curr = this.Parser.source[index]
    this.Parser.char.next = this.Parser.source[index + 1]
    // console.log(this.Parser.char)

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
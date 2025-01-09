import Parser from "./Parser";

class History {

  history: [number, number, number][] = []

  constructor(public Parser: Parser) {

  }

  push = () => {
    const { index, line, pos } = this.Parser;
    this.history.push([index, line, pos])
  }

  prev = () => {
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

  loc = () => {
    const [, , pos] = this.history.at(-1) as [number, number, number];
    const { line, index, sequence, char } = this.Parser;
    const offset = (sequence.value || char.curr).length;
    // @ts-ignore
    return `${line}`.cyan() + `:${pos},${pos + offset}`;
  }

}

export default History;
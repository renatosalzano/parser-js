import { createReadStream } from "fs";
import RL from "readline";


class Reader {
  private rl;
  private line = 0

  constructor(path: string) {
    this.rl = RL.createInterface({
      input: createReadStream(path),
      crlfDelay: Infinity
    });
  }

  async read(readline: (line: string, next: Function, col: number) => void) {
    for await (let line of this.rl) {
      ++this.line;
      let next = (_value: unknown) => { };
      let processing = new Promise((res) => next = res);
      readline(line, next, this.line)
      await processing;
    }
  }

}

export default Reader;
import { log } from "utils";
import PluginJS from 'javascript';
import Reader from "Reader";

let program: Program | null = null;

class Program {

  body: any[] = [];

  private constructor() {

  }

  static extend = (plugin: any) => {
    program ??= new this()
    log('Extend parser;y');

    return program;
  }

  static parse = async (path: string) => {
    program ??= new this() as Program;

    const parser = new Parser(program, path);
    await parser.parse()

    console.log('end program')
  }
}

class Parser {

  Reader: Reader;

  constructor(public program: Program, path: string) {
    this.Reader = new Reader(path);
  }

  context = []

  index = 0;
  sequence = '';
  sequence_reg = /[a-zA-Z_$]/;

  readline = (line: string, next: Function, ln: number) => {
    let col = 0;

    while (col < line.length) {

      let char = line[col];

      if (this.sequence_reg.test(char)) {
        this.sequence += char;
      } else {
        // console.log(this.sequence)
      }

      ++col;
    }
  }

  async parse() {
    await this.Reader.read(this.readline)
  }



}


Program.extend(PluginJS);

export default Program;

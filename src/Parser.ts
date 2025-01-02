import { log } from "utils";
import PluginJS from 'javascript';
import Reader from "Reader";
import { ParserConfig } from "plugin";

let program: Program | null = null;

class Program {

  body: any[] = [];

  private plugins: any[] = [];

  private constructor() {

  }

  static extend = (plugin: any) => {
    program ??= new this()
    log('Extend parser;y');

    program.plugins.push(plugin);
    return program;
  }

  static parse = async (path: string) => {
    program ??= new this() as Program;

    const parser = new Parser(program, path, program.plugins);
    await parser.Parse()

    console.log('end program')
  }
}


class Context {

  context: any = {};
  buffer: any = [];

  constructor(public Parser: Parser) {

    this.buffer.push({
      name: 'Program',
      data: {}
    })
  }

  start(name: string, data = {}) {
    log(`start context ${name};y`, data)
  }

  end() {

  }

  curr_context() {
    return
  }

  load(name: string, config: any) {
    this.context[name] = {
      ...this.context[name],
      ...config
    }
  }

}

class Parser {

  Reader: Reader;

  program_context = new Set<string>()
  context: Context;
  api: any = {};
  rules: ParserConfig = {
    avoidWhitespace: 'multiple'
  }

  constructor(public program: Program, path: string, plugins: any[]) {
    this.context = new Context(this);
    this.Reader = new Reader(path);

    this.api = {
      startContext: this.context.start,
      endContext: this.context.end,
      next: this.next,
      isBracket: this.isBracket,
    }

    this.load_plugins(plugins);
  }

  load_plugins(plugins: any[]) {

    for (const { context, lexical, parse } of plugins) {

      if (context.Program) {
        for (const ctx of context.Program) {
          this.program_context.add(`is${ctx}`)
        }
        delete context.Program;
      }

      for (const k of Object.keys(context)) {
        this.context.load(k, context[k]);
      }

      for (const k of Object.keys(lexical)) {
        if (k.startsWith('is')) {
          this.api[k] = (...args: any[]) => lexical[k].apply(this, args);
        }
      }

      this.parse = {
        ...this.parse,
        ...parse(this.api)
      }
    }

  }

  is_bracket = (current_char = false, bracket: string) => {
    return current_char
      ? this.char === bracket
      : this.next_char === bracket
  }

  isBracket = {
    L: (cc = false) => this.is_bracket(cc, '('),
    R: (cc = false) => this.is_bracket(cc, ')'),
    squareL: (cc = false) => this.is_bracket(cc, '['),
    squareR: (cc = false) => this.is_bracket(cc, ']'),
    curlyL: (cc = false) => this.is_bracket(cc, '{'),
    curlyR: (cc = false) => this.is_bracket(cc, '}'),
  }

  index = 0;
  char = '';
  prev_char = '';
  next_char = '';
  sequence = '';
  parse_string = '';
  parse: any = {}

  is_parsing_string() {
    if (/['|"|`]/.test(this.char)) {
      if (this.parse_string) {
        if (`${this.prev_char}${this.char}` !== `\\${this.parse_string}`) {
          // end parsing string
          this.parse_string = '';
        }
      } else {
        this.parse_string = this.char;
      }
    }
    return !!this.parse_string;
  }

  avoid_whitespace = () => {
    // dont eat whitespace during parse string
    if (this.parse_string) return false;

    const rule = this.rules?.avoidWhitespace;

    if (rule) {
      const check_prev = rule === 'multiple'
        ? this.char === this.prev_char
        : true

      if (/\s/.test(this.char) && check_prev) {
        ++this.index;
        return true;
      }

    }
  }

  line = ''
  next_line: Function = () => { };

  next = (breakReg = /[\s()\[\]]/) => {
    let walk = true;
    this.sequence = '';

    while (walk && this.index < this.line.length) {

      this.char = this.line[this.index];
      this.prev_char = this.line[this.index - 1];
      this.next_char = this.line[this.index + 1];

      if (this.is_parsing_string()) {
        continue;
      }

      if (this.avoid_whitespace()) {
        continue;
      }

      if (!breakReg.test(this.char)) {
        this.sequence += this.char;
      } else {
        console.log(this.sequence)
        walk = false;
      }

      ++this.index;
    }

  }

  readline = (line: string, next_line: Function, ln: number) => {
    this.next_line = next_line;
    this.line = line;
    this.parseProgram()
  }

  parseProgram() {
    this.next();
    for (const isContext of this.program_context) {
      if (this.api[isContext](this.sequence, true)) {
        break;
      }
    }

  }


  async Parse() {
    await this.Reader.read(this.readline)
  }



}


Program.extend(PluginJS);

export default Program;

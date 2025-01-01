import ContextData from "ContextData";
import type { Extend, ContextRules } from "define";
import { writeFileSync } from "fs";
import JS from "javascript";
import { resolve } from "path";
import Reader from "Reader";
import { log } from "utils";

const brackets = {
  "(": { type: "bracketL" },
  ")": { type: "bracketR" },
  "[": { type: "squareL" },
  "]": { type: "squareR" },
  "{": { type: "curlyL" },
  "}": { type: "curlyR" }
};

function regEq(reg1?: RegExp, reg2?: RegExp) {
  if (reg1 && reg2) {
    return reg1.source === reg2.source && reg1.flags === reg2.flags;
  }
  return false;
}


type Quotes = '\'' | '"' | '`';

function isQuote(char: string) {
  return /['|"|`]/.test(char);
}


let instance: Parser | null = null;

type Visitors = keyof typeof JS.context;

interface Node {
  type: string;
  start: number;
  end: number;
  body: Node[];
  [key: string]: unknown;
}

class Parser {

  private Reader?: Reader;
  private output = '';

  private ast = {
    type: 'Program',
    body: []
  };

  private curr_node: Node;
  private nodes: Node[] = [];

  private index = 0;
  private output_index = 0;
  private char = {
    curr: '',
    prev: '',
    next: ''
  }
  private sequence = '';
  private sequence_reg = /[\s()\[\]{},:;]/;
  private sequence_replace_reg?: RegExp;

  private context_map: { [key: string]: { data: any, rules?: ContextRules } } = {};

  private context = {
    global: {},
    buffer: [["Program", ContextData(), 0]]
  }

  private curr_context: {
    name: string;
    type: `parse${string}`;
    data: any;
    start: number;
  }

  private start_string: Quotes | '' = '';
  private cache = new Set<any>();
  private rules: ContextRules = {}

  private constructor() {
    this.nodes.push(this.ast as any);
    this.curr_node = this.nodes[0];

    this.curr_context = {
      name: 'Program',
      type: 'parseProgram',
      data: this.context.buffer[0][1],
      start: 0
    }

  }

  private load_rules(context: string) {

    const rules = this.context_map[context]?.rules || {};
    this.rules = rules;
    this.set_sequence_rule(rules.sequenceRule);
  }

  private update_context = (Context: string, data = {}, start_offset = 0) => {


    const curr_context = this.curr_context.name;
    const context_start = this.index - start_offset;

    this.load_rules(Context);

    this.context.buffer.push([Context, ContextData(data), context_start]);

    this.curr_context = {
      name: Context,
      type: `parse${Context}`,
      data: this.context.buffer.at(-1)![1],
      start: context_start
    }

    log(`context [${this.context.buffer.length}]`, `${curr_context} --> ${Context} at ${context_start};y`)

  }

  private end_context = () => {

    const curr_context = this.curr_context.name;

    if (this.context.buffer.length === 1) {
      console.log(this.context.buffer)
    }

    this.context.buffer.pop();
    const [Context, Data, start] = this.context.buffer.at(-1) as any;

    this.load_rules(Context);

    this.curr_context = {
      name: Context,
      type: `parse${Context}`,
      data: Data,
      start
    }

    this.parser[`parse${Context}`].call(Data, { char: {} })
    log(`context [${this.context.buffer.length}]`, `${Context} <-- ${curr_context} at ${this.index} ;y`)
  }

  private set_sequence_rule = (rule: ContextRules['sequenceRule']) => {

    if (rule) {
      const { breakReg, replaceReg } = rule;

      if (!regEq(breakReg, this.sequence_reg)) {

        log('sequence reg:', this.sequence_reg, '-->;y', breakReg)

        this.sequence_reg = breakReg;
      }

    } else {
      if (regEq(this.sequence_reg, /[\s()\[\]{},:;]/)) return;
      // set to default
      this.sequence_reg = /[\s()\[\]{},:;]/;
      console.log('sequence reg:', this.sequence_reg)
    }
  }

  private avoid_whitespace = () => {
    // dont eat whitespace during parse string
    if (this.start_string) return false;

    const rule = this.rules?.avoidWhitespace;

    if (rule) {
      const check_prev = rule === 'multiple'
        ? this.char.curr === this.char.prev
        : true

      if (/\s/.test(this.char.curr) && check_prev) {
        ++this.index;
        return true;
      }

    }
  }

  private start_node = (type: string, props = {}) => {
    log(`start: ${type};y`)
    let start_offset = type === 'Object' ? -1 : 0;
    const node = {
      ...props,
      type,
      // TODO check if work ever
      start: this.curr_context.start,
      end: 0
    } as Node;

    this.nodes.push(node);
    this.curr_node = this.nodes.at(-1) as Node;
    return this.curr_node;
  }

  private end_node = (node: Node) => {

    let end_offset = node.type === 'Object' ? +1 : 0;
    node.end = end_offset + this.index;

    console.log(this.line.slice(node.start, node.end))

    this.nodes.pop();
    this.curr_node = this.nodes.at(-1) as Node;
    return node;
  }

  private append_node = (node: Node) => {

    switch (true) {
      case this.curr_node.hasOwnProperty('body'):
        this.curr_node.body.push(node);
        break;
      case this.curr_node.hasOwnProperty('properties'):
        break;
    }
  }

  private get_node = (index?: number) => {
    if (index !== undefined) {
      return this.nodes.at(index);
    }
    return this.curr_node;
  }

  private eat = (char: string) => {

  }

  private brackets: { [key: string]: string } = {
    "(": 'bracketL',
    ")": 'bracketR',
    "[": 'squareL',
    "]": 'squareR',
    "{": 'curlyL',
    "}": 'curlyR',
  }

  private check_brackets = (curr_char = false): string => {

    const char = this.char[(curr_char ? 'curr' : 'next')];
    if (this.brackets[char]) {
      return this.brackets[char];
    }
    return '';
  }


  private api = {
    eat: this.eat,
    getNode: this.get_node,
    updateContext: this.update_context,
    endContext: this.end_context,
    setSequenceRule: this.set_sequence_rule,
    startNode: this.start_node,
    endNode: this.end_node,
    appendNode: this.append_node,
    bracketL: (n: boolean) => this.check_brackets(n) === 'bracketL',
    bracketR: (n: boolean) => this.check_brackets(n) === 'bracketR',
    squareL: (n: boolean) => this.check_brackets(n) === 'squareL',
    squareR: (n: boolean) => this.check_brackets(n) === 'squareR',
    curlyL: (n: boolean) => this.check_brackets(n) === 'curlyL',
    curlyR: (n: boolean) => this.check_brackets(n) === 'curlyR',
  } as any;

  private parser: any = {}

  private parseProgram: any = (api: any) => ({
    parseProgram({ char }) {
      // log(char.curr)
    }
  })

  private line: string = ''

  private readline = (line: string, next: Function, ln: number) => {
    console.log('read line ', ln)
    this.line = line;

    while (this.index < line.length && ln < 4) {

      this.char.curr = line[this.index];
      this.char.prev = line[this.index - 1];
      this.char.next = line[this.index + 1];

      if (isQuote(this.char.curr)) {
        if (this.start_string) {
          if (`${this.char.prev}${this.char.curr}` !== `\\${this.start_string}`) {
            // end parsing string
            this.start_string = '';
          }
        } else {
          // start parsing string
          this.start_string = this.char.curr as any;
        }
      }

      if (this.avoid_whitespace()) {
        continue;
      }

      if (!this.sequence_reg.test(this.char.curr)) {
        this.sequence += this.char.curr;
      }

      this.parser[this.curr_context.type].call(
        this.curr_context.data,
        {
          char: this.char,
          sequence: this.sequence
        }
      );

      if (this.sequence_reg.test(this.char.curr)) {
        this.sequence = '';
      }

      this.output += this.char.curr;

      ++this.index;
      ++this.output_index;
    }


    writeFileSync(resolve(process.cwd(), './dist/parser.output.js'), this.output)
    writeFileSync(resolve(process.cwd(), './dist/parser.output.json'), JSON.stringify(this.ast, null, 2))
  }

  static extend: Extend = ({ context, lexical, parser }) => {
    instance ??= new this()
    log('Extend parser;y')

    instance.context_map = {
      ...instance.context_map,
      ...context,
    }

    for (const key in lexical) {
      instance.api[key] = lexical[key];
      if (key.startsWith('is')) {
        instance.api[key] = (s: string, u?: boolean) => (lexical[key] as any)(instance, s, u);
      } else {
        instance.api[key] = lexical[key];
      }

    }

    instance.parser = {
      ...instance.parser,
      ...parser(instance.api),
      ...instance.parseProgram(instance.api)
    }

    return instance;
  }

  static transform = <T = typeof JS.context>(path: string, visitors: { [K in keyof T]: any }) => {
    instance ??= new this();
    instance.Reader = new Reader(path);
    instance.Reader.read(instance.readline);
    // instance = null;
  }
}

Parser.extend(JS);

export default Parser;
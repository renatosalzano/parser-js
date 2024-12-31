import ContextData from "ContextData";
import type { Extend } from "define";
import JS from "javascript";
import Reader from "Reader";
import { log } from "utils";

function regEq(reg1?: RegExp, reg2?: RegExp) {
  if (reg1 && reg2) {
    return reg1.source === reg2.source && reg1.flags === reg2.flags;
  }
  return false;
}


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
  private contexts = new Set<string>();
  private output = '';

  private ast = {
    type: 'Program',
    body: []
  };

  private curr_node: Node;
  private nodes: Node[] = [];

  private index = 0;
  private char = {
    curr: '',
    prev: '',
    next: ''
  }
  private sequence = '';
  private sequence_reg = /[\s()\[\]{},:;]/;
  private sequence_replace_reg?: RegExp;
  private skip = false;
  private skip_whitespace = false;

  private context = {
    global: {},
    buffer: [["body", ContextData()]]
  }

  private curr_context: {
    type: `parse${string}`,
    data: any
  }

  private parser: any = {}
  private start_string = false;
  private cache = new Set<any>();

  private constructor() {
    this.nodes.push(this.ast as any);
    this.curr_node = this.nodes[0];

    this.curr_context = {
      type: 'parseBody',
      data: this.context.buffer[0][1]
    }

  }

  private update_context = (Context: string, data = {}) => {

    this.context.buffer.push([Context, ContextData(data)]);

    this.curr_context = {
      type: `parse${Context}`,
      data: this.context.buffer.at(-1)![1]
    }

    this.set_sequence_rule()
    log('context:', `${Context};y`)

  }

  private end_context = () => {
    this.context.buffer.pop();
    const [Context, Data] = this.context.buffer.at(-1) as any;
    this.curr_context = {
      type: `parse${Context}`,
      data: Data
    }
  }

  private set_sequence_rule = (reg?: RegExp, replace_reg?: RegExp) => {

    if (replace_reg) {
      this.sequence_replace_reg = replace_reg;
    } else[
      this.sequence_replace_reg = undefined
    ]

    if (reg) {
      if (!regEq(reg, this.sequence_reg)) {
        log('sequence reg;m', reg, 'was;m', this.sequence_reg);
        this.sequence_reg = reg;
      }
    } else {
      this.sequence_reg = /[\s()\[\]{},:;]/;
    }
  }

  private avoid_whitespace = (only_multiple = false) => {
    const check_prev = only_multiple
      ? this.char.curr === this.char.prev
      : true

    if (/\s/.test(this.char.curr) && check_prev) {
      ++this.index;
      this.skip = true;
      this.skip_whitespace = true;
      return true;
    } else {
      this.skip_whitespace = false;
    }
  }

  private start_node = (type: string, props = {}) => {
    const node = {
      ...props,
      type,
      start: this.index,
      end: 0
    } as Node;

    if (this.curr_node.type === 'Program') {
      this.curr_node.body.push(node)
    }

    this.nodes.push(node);
    this.curr_node = this.nodes.at(-1) as Node;
    return this.curr_node;
  }
  private end_node(append_to?: string) {

    if (append_to) {
      const prev_node = this.nodes.at(-2) as Node;
      if (typeof prev_node[append_to] === 'object') {
        prev_node[append_to as 'body'].push(this.curr_node)
      }
    }

    this.nodes.pop();
    this.curr_node = this.nodes.at(-1) as Node;
  }

  private get_node = (index?: number) => {
    if (index !== undefined) {
      return this.nodes.at(index);
    }
    return this.curr_node;
  }

  private api = {
    getNode: this.get_node,
    updateContext: this.update_context,
    endContext: this.end_context,
    setSequenceRule: this.set_sequence_rule,
    avoidWhitespace: this.avoid_whitespace,
    startNode: this.start_node,
    endNode: this.end_node
  } as any;


  private readline = (line: string, next: Function, ln: number) => {
    console.log('read line', ln)

    while (this.index <= line.length && ln < 4) {

      this.char.curr = line[this.index];
      this.char.prev = line[this.index - 1];
      this.char.next = line[this.index + 1];

      // if (/['|"|`]/.test(this.char.curr))
      if (isQuote(this.char.curr)) {

      }

      if (this.skip_whitespace) {
        ++this.index;
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

      if (this.skip) {
        this.skip = false;
        continue;
      }

      this.output += this.char.curr;

      ++this.index;
    }

    console.log(this.output)
    console.log(this.ast.body)
  }

  static extend: Extend = ({ context, lexical, parser }) => {
    instance ??= new this();
    console.log('called extend')

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
      ...parser(instance.api)
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
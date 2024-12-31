import ContextData from "ContextData";
import type { Extend, ContextRules } from "define";
import JS from "javascript";
import Reader from "Reader";
import { log } from "utils";

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
    buffer: [["body", ContextData()]]
  }

  private curr_context: {
    name: string;
    type: `parse${string}`;
    data: any;
  }

  private parser: any = {}
  private start_string: Quotes | '' = '';
  private cache = new Set<any>();
  private rules: ContextRules = {}

  private constructor() {
    this.nodes.push(this.ast as any);
    this.curr_node = this.nodes[0];

    this.curr_context = {
      name: 'Body',
      type: 'parseBody',
      data: this.context.buffer[0][1]
    }

  }

  private load_rules(context: string) {

    const rules = this.context_map[context]?.rules || {};
    this.rules = rules;
    this.set_sequence_rule(rules.sequenceRule);
  }

  private update_context = (Context: string, data = {}) => {

    const curr_context = this.curr_context.name;

    this.load_rules(Context);

    this.context.buffer.push([Context, ContextData(data)]);

    this.curr_context = {
      name: Context,
      type: `parse${Context}`,
      data: this.context.buffer.at(-1)![1]
    }

    log('context:', `${curr_context} --> ${Context};y`)

  }

  private end_context = () => {

    this.context.buffer.pop();
    const [Context, Data] = this.context.buffer.at(-1) as any;

    this.load_rules(Context);

    this.curr_context = {
      name: Context,
      type: `parse${Context}`,
      data: Data
    }
  }

  private set_sequence_rule = (rule: ContextRules['sequenceRule']) => {

    if (rule) {
      const { breakReg, replaceReg } = rule;

      if (!regEq(breakReg, this.sequence_reg)) {

        log('sequence reg:', this.sequence_reg, '-->;y', breakReg)

        this.sequence_reg = breakReg;
      }

    } else {
      // set to default
      this.sequence_reg = /[\s()\[\]{},:;]/;
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
    startNode: this.start_node,
    endNode: this.end_node
  } as any;


  private readline = (line: string, next: Function, ln: number) => {
    console.log('read line ', ln)

    while (this.index <= line.length && ln < 4) {

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
    }

    console.log(this.output)
    console.log(this.ast.body)
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
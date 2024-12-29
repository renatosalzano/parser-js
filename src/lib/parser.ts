import { createReadStream } from "fs";
import readline from "readline";
import js from './syntaxContexts';
import type { Declarators, Keywords, Statements, Utils } from "./syntaxContexts";
import { log } from "@/utils";
import * as parse_function from "./parse";
import ContextData from "./ContextData";


class RL {
  private rl;
  private line = 0

  constructor(path: string) {
    this.rl = readline.createInterface({
      input: createReadStream(path),
      crlfDelay: Infinity
    });
  }

  async read(callback: (line: string, next: Function, col: number) => void) {
    for await (let line of this.rl) {
      ++this.line;
      let next = (_value: unknown) => { };
      let processing = new Promise((res) => next = res);
      callback(line, next, this.line)
      await processing;
    }
  }

}

type ContextTypes =
  | 'body'
  | 'expression'
  | 'string'
  | 'function'
  | 'params'
  | 'object'
  | 'pattern'

type Context = {
  global: { [key: string]: unknown },
  data: ContextData<{}>[]
  buffer: ContextTypes[];
}

type ParseParams<T extends Object> = {
  char: {
    curr: string;
    prev: string | undefined;
    next: string | undefined;
  }
  sequence: string;
  context_data: ContextData<T>;
  // WIP
  start_node(type: string, props?: { [key: string]: any }): any;
  end_node(): any;
  // WIP
  update_context(new_context: ContextTypes, data?: { [key: string]: unknown; }): void;
  avoid_multiple_whitespace(): boolean | undefined;
} & Utils

export type Parse<T extends Object = {}> = (api: ParseParams<T>) => any;

class Parser {

  private RL;
  private output = "";
  private ast = {
    type: 'Program',
    body: []
  };

  private debug_lines = 3

  private expected = '';
  private current_node;
  private nodes: any[] = [];

  private expression: any = null;

  private context: Context = {
    global: {},
    data: [new ContextData({}, "body")],
    buffer: ["body"]
  }

  constructor(path: string) {
    this.RL = new RL(path);
    this.RL.read(this.readline)

    this.nodes.push(this.ast);
    this.current_node = this.nodes[0];
  }


  private index = 0;

  private skip = false;

  private sequence = '';

  private char = {
    curr: '',
    prev: '',
    next: ''
  }

  private current_context: `parse_${ContextTypes}` = `parse_body`;

  private avoid_multiple_whitespace = () => {
    if (/\s/.test(this.char.curr) && this.char.curr === this.char.prev) {
      // avoid multiple space
      ++this.index;
      this.skip = true;
      return true;
    }
  }

  private update_context = (new_context: ContextTypes, data: { [key: string]: unknown } = {}) => {

    this.context.buffer.push(new_context);
    this.current_context = `parse_${new_context}`;

    const context_data = new ContextData(data, new_context);
    this.context.data.push(context_data);
    this.api.context_data = context_data;

  }


  private start_node = (type: string, props = {}) => {

    // console.log('called start node', props)

    const node: any = {
      ...props,
      type,
      start: this.index,
      end: undefined
    };

    switch (type) {
      case "Function": {
        node.params = [];
        node.body = null;
        node.name = '';
        break;
      }
      case "Group": {
        node.expression = []
        break;
      }
      case "Object": {
        node.properties = []
        break;
      }
      case "Block": {
        node.properties = []
        break;
      }
      default:
    }

    if (this.current_node.type === 'Program') {
      this.current_node.body.push(node)
    }

    this.nodes.push(node);
    this.current_node = this.nodes.at(-1);
    return this.current_node;
  }


  private end_node() {
    const prev_node = this.nodes.at(-2) || this.nodes[0];
    log('prev;m', prev_node.type, 'curr;m', this.current_node.type)
    switch (prev_node.type) {
      case 'Program': {
        prev_node.body.push(this.current_node)
        break;
      }
      case 'Group': {
        prev_node.expression.push(this.current_node);
        break;
      }
      case 'Function': {
        if (this.current_node.type === 'Group') {
          const { expression } = this.current_node;
          prev_node.params = expression;
        }
        break;
      }
    }

    // console.log('pop', this.nodes.at(-1).type)
    this.nodes.pop();
    this.current_node = this.nodes.at(-1);
    // console.log(this.current_node.type)

  }

  private api = {
    context_data: this.context.data.at(-1) as ContextData<{}>,
    start_node: this.start_node,
    end_node: this.end_node,
    update_context: this.update_context,
    avoid_multiple_whitespace: this.avoid_multiple_whitespace,
    isDeclarator: (v, u) => js.isDeclarator(this, v, u),
    isKeyword: (v, u) => js.isKeyword(this, v, u),
    isOperator: (v, u) => js.isOperator(this, v, u),
    isStatement: (v, u) => js.isStatement(this, v, u)
  } as ParseParams<{}>

  private readline = (line: string, next: Function, ln: number) => {
    console.log('read line', ln)

    while (this.index <= line.length && ln < 4) {

      this.char.curr = line[this.index];
      this.char.prev = line[this.index - 1];
      this.char.next = line[this.index + 1];

      if (!/[\s()\[\]{},;]/.test(this.char.curr)) {
        this.sequence += this.char.curr;
      }

      this.api.char = this.char;
      this.api.sequence = this.sequence;
      // this.api.context_data = this.context.data.at(-1) as any;

      this.parse[this.current_context](this.api);

      if (/[\s()\[\]{},;]/.test(this.char.curr)) {
        this.sequence = '';
      }

      if (this.skip) {
        this.skip = false;
        continue;
      }

      this.output += this.char.curr;

      ++this.index;
    }

    console.log('end line')
    console.log(this.ast.body)
  }

  private parse: { [key in `parse_${ContextTypes}`]: Parse<{}> } = parse_function;




  static input(path: string, options = {}) {
    return new this(path)
  }

}




export default Parser
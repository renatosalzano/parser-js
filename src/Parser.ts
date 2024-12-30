import ContextData from "ContextData";
import type { Extend } from "define";
import JS from "javascript";
import Reader from "Reader";


let instance: Parser | null = null;

type Visitors = keyof typeof JS.context;

interface Node {
  type: 'string';
  start: number;
  end: number;
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
  private nodes: Node[] = [];

  private index = 0;
  private char = {
    curr: '',
    prev: '',
    next: ''
  }
  private sequence = '';
  private sequence_reg = /[\s()\[\]{},:;]/;
  private skip = false;

  private context = {
    global: {},
    buffer: [["body", ContextData()]]
  }

  private current_context: {
    type: `parse${string}`,
    data: any
  }

  private update_context(Context: string, data = {}) {

    this.context.buffer.push([Context, ContextData(data)]);

    this.current_context = {
      type: `parse${Context}`,
      data: this.context.buffer.at(-1)![1]
    }

  }
  private avoid_multiple_whitespace() { }
  private start_node() { }
  private end_node() { }

  private api = {
    updateContext: this.update_context,
    avoidMultipleWhitespace: this.avoid_multiple_whitespace,
    startNode: this.start_node,
    endNode: this.end_node
  } as any;

  private parser = {}

  private constructor() {
    this.nodes.push(this.ast as any);
    this.current_context = {
      type: 'parse_body',
      data: this.context.buffer[0][1]
    }

  }

  private read() {
    //
  }

  private readline = (line: string, next: Function, ln: number) => {
    console.log('read line', ln)

    while (this.index <= line.length && ln < 4) {

      this.char.curr = line[this.index];
      this.char.prev = line[this.index - 1];
      this.char.next = line[this.index + 1];

      if (!this.sequence_reg.test(this.char.curr)) {
        this.sequence += this.char.curr;
      }

      this.api.char = this.char;
      this.api.sequence = this.sequence;

      // this.parser[this.current_context.type].call(
      //   this.current_context.data,
      //   this.api
      // );

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

    console.log('end line')
    console.log(this.ast.body)
  }

  static extend: Extend = ({ context, lexical, parser }) => {
    instance ??= new this();
    console.log('called extend')

    for (const key in lexical) {
      instance.api[key] = lexical[key];
    }

    console.log(instance.api)

    instance.parser = {
      ...instance.parser,
      ...parser(instance.api)
    }

    return instance;
  }

  static transform = <T = typeof JS.context>(path: string, visitors: { [K in keyof T]: any }) => {
    instance ??= new this();
    instance.Reader = new Reader(path);
    // instance.Reader.read(instance.readline);
    instance = null;
  }
}

Parser.extend(JS);

export default Parser;
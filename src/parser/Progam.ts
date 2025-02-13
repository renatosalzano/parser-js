import { log } from "utils";
import { writeFileSync } from "fs";

interface Ctor<T> {
  new(...args: any): T
}

class Node {
  type?: string;
  id?: Node | Node[];
  location?: { line: number, start: number, end: number };

  constructor(init: { [key: string]: any }) {
    Object.assign(this, init);
  }

  toString() {
    return ''
  }

  toJSON() {
    const json: any = {};
    for (const key in this) {
      if (typeof this[key] !== 'function') {
        json[key] = this[key]
      }
    }
    return json;
  }

}

class Block extends Node {
  type = 'block';
  functionBody?: boolean;
  body: Node[] = [];

  appendNode(node: Node) {
    this.body.push(node);
  }

  endBlock() { };

  toString() {
    return `{${this.body.map((node) => node.toString()).join(';')}}`
  }

}

interface Identifier {
  name?: string;
}

class Identifier extends Node {
  type = 'identifier';
  name?: string;

  toString() {
    return `${this.name}`;
  }

  toJSON() {
    const { toString, toJSON, location, ...json } = this;
    return json;
  }
}

type InitNode<T> = {
  [K in keyof T]?: T[K]
} & {
  [K in keyof Node]?: Node[K]
}

class Program {
  body: Node[] = [];
  block: Node[] = [];
  current_node?: Node;

  params = new Map<string, Node>();
  check_reference = true;
  check_params = false;
  store_params = false;
  expected_block = false;

  is_fn_body = false;

  create_node = <T>(NodeCtor: Ctor<T>, init?: InitNode<T>, location?: Node['location']) => {

    const node = new NodeCtor(init) as Node;

    if (location) {
      const { start, end, line } = location;
      node.location = {
        start,
        end,
        line
      };
    }

    if (node instanceof Block) {

      this.block.push(node);

      node.endBlock = () => {
        this.block.pop();
      }
    }

    this.current_node = node;
    return node as T;
  }

  append_node = (node: Node) => {
    const last_node = this.block.at(-1) as Block | undefined;

    if (last_node) {
      last_node.appendNode(node);
    } else {
      this.body.push(node);
    }
  }

  log = () => {
    return this.body;
  }

  toString() {
    return this.body.map((node) => node.toString())
  }

  toJSON = (path: string) => {
    log('to json')
    const json = JSON.stringify(this.body.map((n) => n.toJSON()), null, 2);
    writeFileSync(path, json)
  }
}

function jsonify(node: any) {
  return JSON.stringify(node, (k, v) => typeof v === 'function' ? undefined : v, 2)
}

export { Node, Block, Identifier };
export default Program
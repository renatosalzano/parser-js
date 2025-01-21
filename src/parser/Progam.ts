import { log } from "utils";
import Context from "./Context";
import Tokenizer from "./Tokenizer";

interface Constructor<T> {
  new(...args: any): T
}

// type Node<T extends { [key: string]: any } = { [key: string]: any }> = {
//   toString(): string;
//   appendNode?: (node: Node) => any;
// } & {
//   [K in keyof T]: T[K]
// }

class Node {
  tag?: string;
  id?: Node | Node[];
  declarator?: boolean;
  hoisting?: boolean;
  location?: { line: number, pos: number }
  toString() {
    return ''
  }
}

interface Identifier {
  name: string;
  rest?: boolean;
  spread?: boolean;
  location?: { line: number, pos: number };
}

class Identifier {
  name = '';
  toString() {
    return this.name;
  }
}

class ReferenceTree {

  Program = new Map<string | number, Node | Map<string, Node>>();
  scope: Map<string, Node>[] = [];
  pending_ref = new Set<string>();

  current_scope = () => {
    return this.scope.at(-1) || this.Program;
  }

  declare = (node: Node) => {

    const current_scope = this.current_scope();

    // TODO CHECK IF HOISTED

    if (node.id) {

      switch (true) {
        case (node.id instanceof Identifier): {

          if (node.hoisting) {
            if (this.pending_ref.delete(node.id.name)) {
              log('reference found;g', node.id.name);
            }
          }

          current_scope.set(node.id.name, node);
          break;
        }
        case (node.id instanceof Node): {
          if (node.id.id instanceof Array) {
            for (const n of node.id.id as Array<Identifier>) {
              current_scope.set(n.name, node);
            }
          }
          break;
        }
      }
    }
  }

  check = (node: Identifier) => {
    const current_scope = this.current_scope();

    if (!current_scope.has(node.name)) {
      // reference not found
      this.pending_ref.add(node.name);
    }
  }
}

class Block extends Node {
  tag = 'block';
  functionBody = false;
  body: Node[] = [];
  appendNode(node: Node) {
    this.body.push(node);
  }
}

type InitNode<T> = {
  [K in keyof T]?: T[K]
} & {
  [K in keyof Node]?: Node[K]
}

class Program {
  body: Node[] = [];
  blocks: Node[] = []
  ReferenceTree = new ReferenceTree();
  current_node?: Node;
  current_declarator?: Node;

  constructor(private Tokenizer: Tokenizer) {
  }

  createNode = <T>(NodeConstructor: Constructor<T>, init?: InitNode<T>, location?: Node['location']) => {

    const node = new NodeConstructor() as Node;

    if (location) {
      node.location = location;
    }

    if (node instanceof Block) {
      this.ReferenceTree.scope.push(new Map());
      this.blocks.push(node);
    } else {
      if (init) {
        Object.assign(node, init)
      }
    }

    if (node.declarator) {
      this.current_declarator = node;
    }

    if (node instanceof Identifier && !this.current_declarator) {
      this.ReferenceTree.check(node)
    }

    this.current_node = node;
    return node as T;
  }

  appendNode = (node: Node) => {
    const last_node = this.blocks.at(-1) as Block | undefined;

    if (last_node) {
      last_node.appendNode(node);
    } else {
      this.body.push(node);
    }

    if (node.declarator) {
      this.current_declarator = undefined;
      this.ReferenceTree.declare(node);
    }

  }

  endNode = () => {
    this.blocks.pop();
  }

  log = () => {
    return this.body;
  }

  toString() {
    return this.body.map((node) => node.toString())
  }

  check_references = () => {
    const { pending_ref } = this.ReferenceTree;
    if (pending_ref.size) {
      for (const ref of pending_ref) {
        log(`ReferenceError: "${ref}" is not defined;r`)
      }
    }
  }
}

export { Node, Block, Identifier }
export default Program
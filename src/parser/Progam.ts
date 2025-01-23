import { log } from "utils";
import Context from "./Context";
import Tokenizer from "./Tokenizer";

interface Ctor<T> {
  new(...args: any): T
}

class Node {
  tag?: string;
  id?: Node | Node[];
  location?: { line: number, start: number, end: number };
  constructor(init: { [key: string]: any }) {
    Object.assign(this, init);
  }
  toString() {
    return ''
  }

}

class Declarator extends Node {
  tag?: string;
  id?: Node | Node[];
  hoisting?: boolean;

  constructor(init: { [key: string]: any }) {
    super(init);
  }

  endDeclaration() { };
}

class FunctionDeclarator extends Node {
  tag?: string;
  id?: Node;
  hoisting?: boolean;

  constructor(init: { [key: string]: any }) {
    super(init);
  }

  startParams() { };
  startBody() { };
  endBody() { };
}

class Block extends Node {
  tag = 'block';
  functionBody = false;
  body: Node[] = [];

  appendNode(node: Node) {
    this.body.push(node);
  }

  endBlock() { };
}

interface Identifier {
  name: string;
  rest?: boolean;
  spread?: boolean;
}

class Identifier {
  name = '';

  constructor(init: { [key: string]: any }) {
    Object.assign(this, init);
  }

  toString() {
    return `${this.rest || this.spread ? '...' : ''}${this.name}`;
  }
}

class ReferenceTree {

  Program = new Map<string | number, Node | Map<string, Node>>();
  scope: Map<string, Node>[] = [];
  pending_ref = new Set<string>();

  current_scope = () => {
    return this.scope.at(-1) || this.Program;
  }

  declare = (node: Declarator | FunctionDeclarator) => {

    const current_scope = this.current_scope();

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

type InitNode<T> = {
  [K in keyof T]?: T[K]
} & {
  [K in keyof Node]?: Node[K]
}

class Program {
  body: Node[] = [];
  block: Node[] = []
  ReferenceTree = new ReferenceTree();
  current_node?: Node;
  current_declarator?: Node;
  current_function?: { params: Node[] }

  params = new Map<string, Node>();
  check_reference = true;
  check_params = false;
  store_params = false;
  expected_block = false;

  createNode = <T>(NodeCtor: Ctor<T>, init?: InitNode<T>, location?: Node['location']) => {

    const node = new NodeCtor(init) as Node;

    if (location) {
      node.location = location;
    }

    // if (this.expected_block) {
    //   console.log('EXPECTED', node)
    //   this.expected_block = node instanceof Block;
    // }

    switch (true) {

      case (node instanceof Block): {
        if (this.expected_block) {
          this.expected_block = false;
          console.log('expected block')
        } else {
          this.ReferenceTree.scope.push(new Map());
          console.log('NEW SCOPE')
        }
        this.block.push(node);

        node.endBlock = () => {
          this.block.pop();
        }
        break;
      }

      case (node instanceof FunctionDeclarator): {
        this.check_reference = false;

        node.startParams = () => {
          this.ReferenceTree.declare(node);
          delete node.hoisting;
          this.store_params = true;
        }

        node.startBody = () => {
          this.store_params = false;
          this.check_reference = true;
          this.expected_block = true;
          const { params } = this;
          this.ReferenceTree.scope.push(params);
          this.params = new Map();
        }

        node.endBody = () => {
          this.check_reference = true;
        }

        break;
      }
      case (node instanceof Declarator): {
        this.check_reference = false;
        node.endDeclaration = () => {
          this.check_reference = true;
          this.ReferenceTree.declare(node);
          delete node.hoisting;
        }
        break;
      }
      case (node instanceof Identifier): {
        if (this.check_reference) {
          this.ReferenceTree.check(node);
        }
        if (this.store_params) {
          this.params.set(node.name, node);
        }
        break;
      }
    }

    this.expected_block = false;
    this.current_node = node;
    return node as T;
  }

  appendNode = (node: Node) => {
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
    console.log('parse Program')
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

export { Node, Declarator, FunctionDeclarator, Block, Identifier };
export default Program
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
  id?: string | Node;

  toString() {
    return ''
  }
}

class Identifier {
  name = '';
  reference?: Node;

  toString() {
    return this.name;
  }
}

class ReferenceTree {

  Program = new Map<string | number, Node | Map<string, Node>>();
  scope: Map<string, Node>[] = [];

  set = (node: Node) => {
    if (node.id) {
      if (node.id instanceof Node) {

      }
      const current_scope = this.scope.at(-1);
      if (current_scope) {
        current_scope.set(node.id, node);
      } else {
        this.Program.set(node.id, node);
      }
    }
  }

  get = (node: Identifier) => {
    if (node.name) {
      const scope = this.scope.at(-1) || this.Program;
      const reference_node = scope.get(node.name);
      if (reference_node) {
        return reference_node as Node;
      }
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

class Unexpected extends Node {

}

class Program {
  body: Node[] = [];
  private blocks: Node[] = []
  private reference = new ReferenceTree();

  constructor(private Tokenizer: Tokenizer) {
  }

  createNode = <T>(NodeConstructor: Constructor<T>, init = {} as { [K in keyof T]?: T[K] }) => {

    const node = new NodeConstructor() as Node;

    if (node instanceof Block) {
      this.reference.scope.push(new Map());
      this.blocks.push(node);
    } else {
      Object.assign(node, init);
    }

    if (node instanceof Identifier) {
      const ref = this.reference.get(node)
      if (ref) {
        node.reference = ref;
      }
    }

    return node as T;
  }

  endNode = () => {
    this.blocks.pop();
  }

  createRef = (node: Node) => {
    this.reference.set(node);
  }

  getReference = (node: Identifier) => {
    this.reference.get(node)
  }

  appendNode = (node: Node) => {
    const last_node = this.blocks.at(-1) as BlockNode | undefined;
    if (last_node) {
      last_node.appendNode(node);
    } else {
      this.body.push(node);
    }
    if (node.id) {
      this.reference.set(node);
    }
  }

  log = () => {
    return this.body;
  }

  toString() {
    return this.body.map((node) => node.toString())
  }
}

export { Node, Block, Identifier }
export default Program
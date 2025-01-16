import Context from "./Context";
import Parser from "./Tokenizer";

interface Constructor<T> {
  new(...args: any): T
}

type Node<T extends { [key: string]: any } = { [key: string]: any }> = {
  toString(): string;
  appendNode?: (node: Node) => any;
} & {
  [K in keyof T]: T[K]
}

class IdentifierNode {
  tag = 'identifier';
  name = '';
  reference?: Node;
}

class ReferenceTree {

  Program = new Map<string | number, Node | Map<string, Node>>();
  scope: Map<string, Node>[] = [];

  set = (node: Node) => {
    if (node.id) {
      const current_scope = this.scope.at(-1);
      if (current_scope) {
        current_scope.set(node.id, node);
      } else {
        this.Program.set(node.id, node);
      }
    }
  }

  get = (node: IdentifierNode) => {
    if (node.name) {
      const scope = this.scope.at(-1) || this.Program;
      const reference_node = scope.get(node.name);
      if (reference_node) {
        return reference_node as Node;
      }
    }
  }
}

class BlockNode {
  tag = 'block';
  body: Node[] = [];
  appendNode(node: Node) {
    this.body.push(node);
  }
}

class Program {
  body: Node[] = [];
  private blocks: Node[] = []
  private reference = new ReferenceTree();

  constructor(private Parser: Parser) {

  }

  createNode = <T>(NodeConstructor: Constructor<T>, init = {} as { [K in keyof T]?: T[K] }) => {
    const node = new NodeConstructor() as Node;

    if (node instanceof BlockNode) {
      this.reference.scope.push(new Map());
      this.blocks.push(node);
    } else {
      Object.assign(node, init);
    }

    if (node instanceof IdentifierNode) {
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

  getReference = (node: IdentifierNode) => {
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
}

export { Node, BlockNode, IdentifierNode }
export default Program
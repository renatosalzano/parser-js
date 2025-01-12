interface Constructor<T> {
  new(): T
}

type Node<T extends { [key: string]: any } = { [key: string]: any }> = {
  toString(): string;
} & {
  [K in keyof T]: T[K]
}

class Program {
  body: Node[] = [];
  private buffer: Node[] = []
  private reference = new Set<string>();
  referenceTree: any;

  constructor() {

  }

  createNode = <T>(NodeConstructor: Constructor<T>) => {
    return new NodeConstructor();
  }

  appendNode = (node: Node) => {
    this.body.push(node);
    console.log(this.body)
  }
}

export { Node }
export default Program
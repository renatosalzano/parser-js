class Node {
  start: number;
  end: number;
  constructor(start: number) {
    this.start = start;
    this.end = 0;
  }
}

class FunctionNode extends Node {
  async: boolean = false;
  params: Node[] = []
  body: Node[] | null = null;
  constructor(start: number, async = false) {
    super(start)
    this.async = async;
  }

}

export { Node }
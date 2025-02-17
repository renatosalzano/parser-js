import { TokenContext } from "parser/Context";

const bracket = [['{{', '}}']]
const specialToken = ['</', '/>'];

class TagStart extends TokenContext {

  start = ['<']

  is_tag_name(name: string) {
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(name);
  }

  onBefore(cancel: () => void) {

  }
}
import { define } from "plugin";
import context from "./context";
import lexical from "./lexical";



export default define({
  context,
  lexical,
  parse: function (api) {
    return {
      Body() {
      },

      Variable() { },

      Declaration() { },

      Function() {

      },

      Params() {

      },

      Expression() { },

      Object() { }

    }
  }
})
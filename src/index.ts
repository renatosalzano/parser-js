import { log } from 'utils';
import Parser from './Parser';
import { resolve } from 'path';



async function main() {


  log('Parser start;g')

  try {

    Parser.transform(resolve(process.cwd(), './.local/test.jst'), {
      function: {},
    })

  } catch (error) {
    console.log(error)
  }

}

main();

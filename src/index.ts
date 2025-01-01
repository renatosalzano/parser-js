import { log } from 'utils';
import Parser from './Parser';
import { resolve } from 'path';



async function main() {


  log('Parser start;g')

  try {

    Parser.transform(resolve(process.cwd(), './src/test/test.js'), {
      function: {},
    })

  } catch (error) {
    console.log(error)
  }

}

main();

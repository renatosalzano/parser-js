import { log } from 'utils';
import Parser from './parser/index';
import { resolve } from 'path';
import { readFileSync } from 'fs';



async function main() {


  log('Parser start;g')

  try {

    const code = readFileSync(resolve(process.cwd(), './src/test/test.js'), 'utf-8');

    Parser.parse(code)

  } catch (error) {
    console.log(error)
  }

}

main();

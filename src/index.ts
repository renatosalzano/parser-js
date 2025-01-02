import { log } from 'utils';
import Program from './Parser';
import { resolve } from 'path';
import { readFileSync } from 'fs';



async function main() {


  log('Parser start;g')

  try {

    const code = readFileSync(resolve(process.cwd(), './src/test/test.js'), 'utf-8');

    Program.parse(code)

  } catch (error) {
    console.log(error)
  }

}

main();

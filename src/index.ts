import { log } from 'utils';
import Program from './Parser';
import { resolve } from 'path';



async function main() {


  log('Parser start;g')

  try {

    Program.parse(resolve(process.cwd(), './src/test/test.js'))

  } catch (error) {
    console.log(error)
  }

}

main();

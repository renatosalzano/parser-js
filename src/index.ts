import { resolve } from 'path';
import { log } from '@/utils/index.js';
import Parser from '@/lib/parser';

async function main() {

  log('JST DEV START;g')

  try {

    const parser = Parser
      .input(resolve(process.cwd(), './src/test/test.jst'), {})

  } catch (error) {

    console.log(error)
  }

}

main();


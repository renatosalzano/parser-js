const plugin = (config: any) => {



  return (prev: any) => {
    const { context, parse } = prev;

    return ({
      context: {
        Function: {
          ...context.Function,
          keyword: {
            'func': null,
            'def': null
          }
        }
      },
      parse: (api: any) => ({
        Function() {


          parse.Function();
        }
      })
    })
  }
}


// Parser.extend( plugin({config...}) )
type AnyFunction = (...args: any[]) => any;

export function once<T extends AnyFunction>(fn: T): (...args: Parameters<T>) => ReturnType<T> {
  let executed = false;
  let ret: ReturnType<T>;

  return function (...args: Parameters<T>): ReturnType<T> {
    if (!executed) {
      console.log('executed')
      executed = true;
      ret = fn(...args);
    }
    return ret;
  };
}

// // Esempio di utilizzo in un loop
// const initializeOnce = once(() => {
//   console.log('Inizializzazione completata!');
//   return 'Risultato dell\'inizializzazione';
// });

// for (let i = 0; i < 5; i++) {
//   console.log(initializeOnce()); // Output: Risultato dell'inizializzazione (solo la prima volta)
// }

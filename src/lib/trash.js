// if (/[\(\[\{]/.test(char)) {

//   switch (char as keyof typeof js.brackets) {
//     case "(":
//       this.start_node('Group')
//       break;
//     case "[":
//       break;
//     case "{": {
//       switch (this.current_node.type) {
//         case 'Function':
//           this.start_node("Block")
//           break;
//         default:
//           this.start_node("Object")
//       }
//       break;
//     }
//   }
// }

// if (/[\s,\)\]\}]/.test(char)) {

//   if (_) {
//     switch (true) {
//       case js.keywords.hasOwnProperty(_): {
//         switch (_ as keyof typeof js.keywords) {
//           case "async":
//             this.output += `${_} `;
//             const node = this.start_node('Function');
//             node.async = true;
//             break;
//           case "this":
//           case "super":
//         }
//         break;
//       }
//       case js.declarators.hasOwnProperty(_): {
//         this.output += `${_} `;
//         if (!this.current_node) {
//           // @ts-ignore
//           this.start_node(js.declarators[_].type)
//         }
//         break;
//       }
//       default: {
//         switch (this.current_node.type) {
//           case "Function": {
//             this.current_node.name = _;
//           }
//         }

//         this.output += _;
//       }
//     }
//   }

//   if (/,/.test(char)) {
//     this.output += ','
//   }

//   _ = ""
// } else {
//   _ += char;
// }

// if (/[\)\]\}]/.test(char)) {

//   this.end_node();
//   this.output += char;
// }
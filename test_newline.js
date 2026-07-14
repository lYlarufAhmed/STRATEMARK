const testStr = '{"key": "value with \n newline inside"}';
console.log("Before:", testStr);
const clean = testStr.replace(/(?<![,{\\[:]\\s*)\\n(?!\\s*["}\\]])/g, ' ');
console.log("After:", clean);

const testStr2 = '{\n"key": "value",\n"key2": "value2"\n}';
console.log("Before 2:", testStr2);
const clean2 = testStr2.replace(/(?<![,{\\[:]\\s*)\\n(?!\\s*["}\\]])/g, ' ');
console.log("After 2:", clean2);

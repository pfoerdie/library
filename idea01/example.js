const { Package } = require("."), Path = require("path");

let lib = new Package({
    "@type": "Package",
    "@id": "lib",
    "path": Path.join(__dirname, "../lib"),
    "depth": 3
});

lib.load().then((result) => {
    console.log(lib, "^=", result, "?", lib.value === result);
});
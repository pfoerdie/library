require("./library.js");

(async (/* MAIN */) => {

    // TRY IT

    await lib.load('lib.core.hrt:0.1.0');
    // await lib.load('lib.core.hrt');
    // await lib.load('lib.core.event:latest');

    console.log(/* new line */);

    console.log(lib.core);
    // console.log(lib.get("lib.core.hrt:0.1.0"));

})(/* MAIN */);

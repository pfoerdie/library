require("./library.js");

// lib.load(/* "lib" */).then(console.log).catch(console.error);

(async (/* MAIN */) => {

    /**
     * NOTE: TRY IT
     * lib.get: function< id => entry >
     * lib.load: async function< ...ids => ..entries >
     * first lib.load will also wait for the initialization
     */

    await lib.load('lib.core.hrt:0.1.0');
    // await lib.load('lib.core.hrt');
    // await lib.load('lib.core.event:latest');

    // console.log(/* new line */);

    console.log(lib.core);
    // console.log(lib.get("lib.core.event:0.1.0"));

})(/* MAIN */);
require("./library.js");

// lib.load(/* "lib" */).then(console.log).catch(console.error);

(async (/* MAIN */) => {

    /**
     * NOTE: TRY IT
     * lib.get: function< id => entry >
     * lib.load: async function< ...ids => ..entries >
     * first lib.load will also wait for the initialization
     */

    await lib.load('lib.core:basic');
    console.log(lib["core:basic"]);
    console.log(lib.core.is);

})(/* MAIN */);
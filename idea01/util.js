const
    assert = require("assert"),
    Util = require("util"),
    Path = require("path"),
    Fs = require("fs"),
    extractFn = (obj, key) => obj[key].bind(obj),
    enumerable = true, writable = true, configurable = true;

exports.validContext = extractFn(/^Library$/, "test");
exports.validType = extractFn(/^(?:Config|Package|Module|Alias|File)$/, "test");
exports.validID = extractFn(/^(?:[a-z]\w*(?::[a-z]+|:\d+\.\d+\.\d+)?(?:\.|$))+/i, "test");
exports.validKey = extractFn(/^(?:[a-z]\w*(?::[a-z]+|:\d+\.\d+\.\d+)?)$/i, "test");
exports.validPath = extractFn(/^./, "test");
exports.validFile = extractFn(/^(?:config|module|package)\.json$/, "test");
exports.validFolder = extractFn(/^(?!.|src$)/, "test");

exports.isObject = (val) => typeof val === "object" && val !== null;
exports.isArray = Array.isArray;
exports.isInteger = (val) => val === parseInt(val);

exports.define = (obj, key, value, get, set) => Object.defineProperty(obj, key, get || set ? { get, set } : { value });
exports.enumerate = (obj, key, value, get, set) => Object.defineProperty(obj, key, get || set ? { get, set, enumerable } : { value, enumerable });
exports.set = (obj, key, value, get, set) => Object.defineProperty(obj, key, get || set ? { get, set, writable } : { value, writable });

exports.assert = assert;
exports.joinPath = Path.join;
exports.promisify = Util.promisify;
exports.promify = (fn, ...args) => new Promise((resolve, reject) => fn(...args, (err, result) => err ? reject(err) : resolve(result)));
exports.listDir = Util.promisify(Fs.readdir);
exports.getStats = Util.promisify(Fs.stat);
exports.readFile = Util.promisify(Fs.readFile);
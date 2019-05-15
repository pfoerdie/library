//#region CONSTANTS

const // packages
    Path = require('path'),
    Fs = require('fs'),
    Express = require('express');

const // constants
    _define = (obj, key, val) => Object.defineProperty(obj, key, { value: val }),
    _defineFn = (obj, key, fn) => Object.defineProperty(obj, key, { value: fn.bind(obj) }),
    _promify = (fn, ...args) => new Promise((resolve, reject) => fn(...args, (err, result) => err ? reject(err) : resolve(result))),
    _RE_pathToUrl = new RegExp("\\" + Path.sep, "g"),
    _pathToUrl = (path) => path.replace(_RE_pathToUrl, "/");

const // defaults
    _globalKey = 'lib',
    _context = "Web-Library",
    _directory = Path.join(__dirname, "web-lib"),
    _weblibPath = Path.join(__dirname, "web.library.js"),
    _searchDepth = 3,
    _validFilename = (val) => val === "config.json",
    _validFoldername = (val) => val !== "src" && !val.startsWith(".");

//#endregion CONSTANTS

//#region LIBRARY

/** @name Library */
const Library = {};

/**
 * @name Library._regexID 
 * @type {RegExp}
 */
_define(Library, '_regexID', new RegExp(`^${_globalKey}(?:\\.[a-z]\\w*(?::[a-z]+|:\\d+\\.\\d+\\.\\d+)?)*$`, "i"));

/**
 * @name Library._regexType 
 * @type {RegExp}
 */
_define(Library, '_regexType', new RegExp(`^\\w+$`, "i"));

/**
 * @name Library._available 
 * @type {Set<Config#@id>}
 */
_define(Library, '_available', new Set());

/**
 * @name Library._configs 
 * @type {Map<Config#@id, Config>}
 */
_define(Library, '_configs', new Map());

/**
 * @function Library.validConfig
 * @param {Config} config
 * @returns {boolean}
 */
_defineFn(Library, 'validConfig', function (config) {
    return config
        && this._regexType.test(config['@type'])
        && this._regexID.test(config['@id']);
}); // Library.validConfig

/**
 * @function Library.addConfig
 * @param {...Config} configArr
 * @throws {Error} if any of the new configs already exist
 * @returns this
 */
_defineFn(Library, 'addConfig', function (...configArr) {
    configArr = configArr.filter(Library.validConfig);
    let existing = configArr.filter(config => this._available.has(config['@id']));
    if (existing.length > 0)
        throw new Error(`the following configs are already defined:\n  ${existing.map(config => config['@id']).join("\n  ")}`);
    configArr.forEach(config => {
        this._available.add(config['@id']);
        this._configs.set(config['@id'], config);
    });
    return this;
}); // Library.addConfig

/**
 * @function Library.getConfig
 * @param {Config#@id} id
 * @returns {Config|null}
 */
_defineFn(Library, 'getConfig', function (id) {
    return this._configs.get(id) || null;
}); // Library.getConfig

/**
 * @function Library.loadConfig
 * @param {Config#@id} id
 * @returns {Config|null}
 * @async
 */
_defineFn(Library, 'loadConfig', async function (id) {
    if (this._configs.has(id))
        return this._configs.get(id);
    if (this._available.has(id))
        throw new Error("loading available configs is not implemented");
    return null;
}); // Library.loadConfig

/**
 * @function Library.getAvailable
 * @param {Config#@id} id
 * @returns {Config|null}
 */
_defineFn(Library, 'getAvailable', function () {
    return Array.from(this._available.values());
}); // Library.getAvailable

/**
 * @function Library.loadAvailable
 * @param {Config#@id} id
 * @returns {Config|null}
 * @throws {Error} if the loaded configs are corrupted
 * @async
 */
_defineFn(Library, 'loadAvailable', async function () {
    let configArr = await (async function _loadDirectory(self, directory, depth) {
        let
            dirContent = await _promify(Fs.readdir, directory),
            dirPaths = dirContent.map(content => Path.join(directory, content)),
            contentStats = await Promise.all(dirPaths.map(path => _promify(Fs.stat, path))),
            availableFiles = dirPaths.filter(
                (path, index) => contentStats[index].isFile() && _validFilename(dirContent[index])
            ),
            avalableFolders = depth <= 0 ? null
                : dirPaths.filter((path, index) => contentStats[index].isDirectory() && _validFoldername(dirContent[index])),
            fileBuffers = await Promise.all(availableFiles.map(path => _promify(Fs.readFile, path))),
            configFiles = fileBuffers
                .map(buffer => JSON.parse(buffer.toString(), (key, value) => {
                    if (key !== 'path') return value;
                    let absPath = Path.join(directory, value);
                    let relPath = Path.relative(_directory, absPath);
                    return _pathToUrl(relPath);
                }))
                .filter(file => file && file['@context'] === _context),
            configArr = [];

        for (let file of configFiles) {
            delete file['@context'];
            for (let config of Array.isArray(file['@graph']) ? file['@graph'] : [file]) {
                if (self.validConfig(config)) configArr.push(config);
            }
        }

        if (avalableFolders && avalableFolders.length > 0) {
            let folderResults = await Promise.all(avalableFolders.map(path => _loadDirectory(self, path, depth - 1)));
            folderResults.forEach(folderResult => configArr.push(...folderResult));
        }

        return configArr;
    })(this, _directory, _searchDepth);

    if (configArr.some((confA, indA) => configArr.some((confB, indB) => indA !== indB && confA['@id'] === confB['@id'])))
        throw new Error("loaded configs are corrupted");
    this.addConfig(...configArr);
}); // Library.loadAvailable

//#endregion LIBRARY

//#region SETUP

let
    _ready = false,
    _readyPromise = Library.loadAvailable();

_readyPromise.then(function () {
    _ready = true;
});

//#endregion SETUP

//#region EXPORTS

exports.Router = function (/* arguments */) {
    const Router = Express.Router();

    Router.get('/available.json', async function (request, response) {
        try {
            if (!_ready) await _readyPromise;
            response.type('json').send(Library.getAvailable());
        } catch (err) {
            response.sendStatus(500);
        }
    });

    Router.get('/config.json', async function (request, response) {
        try {
            if (!_ready) await _readyPromise;
            if (!request.query) return response.sendStatus(400);
            let idArr = Array.isArray(request.query.id) ? request.query.id : [request.query.id];
            response.type('json').send({
                '@context': _context,
                '@graph': idArr.map(Library.getConfig)
            });
        } catch (err) {
            response.sendStatus(500);
        }
    });

    Router.get('/library.js', async function (request, response) {
        try {
            if (!_ready) await _readyPromise;
            let buffer = await _promify(Fs.readFile, _weblibPath);
            if (buffer) response.type('js').send(buffer);
            else response.sendStatus(404);
        } catch (err) {
            response.sendStatus(500);
        }
    });

    Router.use('/' + _globalKey, Express.static(_directory));

    return Router;
} // exports.Router

//#endregion EXPORTS

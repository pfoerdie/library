((/* closure */) => {

    // TODO

    //#region CONSTANTS

    const // constants
        _define = (obj, key, val) => Object.defineProperty(obj, key, { value: val }),
        _defineFn = (obj, key, fn) => Object.defineProperty(obj, key, { value: fn.bind(obj) }),
        _enumerate = (obj, key, val) => Object.defineProperty(obj, key, { value: val, enumerable: true }),
        _enumerateGetter = (obj, key, getter) => Object.defineProperty(obj, key, { get: getter, enumerable: true }),
        _promify = (fn, ...args) => new Promise((resolve, reject) => fn(...args, (err, result) => err ? reject(err) : resolve(result))),
        _RE_splitID = /\.(?!\d)/,
        _splitID = (str) => str.split(_RE_splitID);

    const // defaults
        _globalKey = 'lib',
        _context = "Web-Library",
        _location = (location.origin + location.pathname).replace(/\/[^/]+$/, "");

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
     * @name Library._types 
     * @type {Map<Config#@type, class>}
     */
    _define(Library, '_types', new Map());

    /**
     * @name Library._configs 
     * @type {Map<Config#@id, Config>}
     */
    _define(Library, '_configs', new Map());

    /**
     * @name Library._loadingConfigs 
     * @type {Map<Config#@id, Promise<Config>>}
     */
    _define(Library, '_loadingConfigs', new Map());

    /**
     * @name Library._entries 
     * @type {Map<Config#@id, Object>}
     */
    _define(Library, '_entries', new Map());

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
        let existing = configArr.filter(config => this._configs.has(config['@id']));
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
        let loadingPromise = this._loadingConfigs.get(id);
        if (!loadingPromise) {
            loadingPromise = (async (/* async closure */) => {
                let
                    path = _splitID(id),
                    idArr = path.reduce((result, segment) => {
                        if (result.length === 0)
                            result.push(segment);
                        else
                            result.push(result[result.length - 1] + "." + segment);
                        return result;
                    }, []).filter(id => !this._configs.has(id)),
                    result = await fetch(_location + `config.json?id=${idArr.join("&id=")}`),
                    json = await result.json();

                if (!json['@context'] === _context)
                    throw new Error(`invalid context ${json['@context']}`);
                if (Array.isArray(json['@graph']))
                    this.addConfig(...(json['@graph']));
                return this.getConfig(id);
            })(/* async closure */);
            loadingPromise.finally(() => { this._loadingConfigs.delete(id); });
            this._loadingConfigs.set(id, loadingPromise);
        }
        return await loadingPromise;
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
        let response = await fetch(_location + 'available.json');
        if (!response || !response.ok)
            throw new Error("available could not be loaded");
        let result = await response.json();
        if (!Array.isArray(result[_context]))
            throw new Error("unexpected answer for available request");
        for (let id of result[_context]) {
            if (this._regexID.test(id))
                this._available.add(id);
        }
    }); // Library.loadAvailable

    /**
     * @function Library.defineType
     * @param {Config#@type} configType
     * @param {class} configClass
     * @throws {Error} if type is already defined
     * @throws {TypeError} if arguments are not as expexted
     * @returns this
     */
    _defineFn(Library, 'defineType', function (configType, configClass) {
        if (this._types.has(configType))
            throw new Error(`type ${configType} is already defined`);
        if (!this._regexType.test(configType) || typeof configClass !== 'function')
            throw new Error("invalid arguments");
        this._types.set(configType, configClass);
        return this;
    }); // Library.defineType

    /**
     * @function Library.makeEntries
     * @param {Config#@id} id
     * @returns {Object|null}
     */
    _defineFn(Library, 'makeEntries', function (...idArr) {
        let configArr = idArr.map(this.getConfig).filter(val => val);
        for (let config of configArr) {
            if (this._entries.has(config['@id'])) continue;
            let configClass = this._types.get(config['@type']);
            if (!configClass) continue;
            let entry = new configClass(config);
            this._entries.set(config['@id'], entry);
        }
        return this;
    }); // Library.makeEntries

    /**
     * @function Library.getEntry
     * @param {Config#@id} id
     * @returns {Object|null}
     */
    _defineFn(Library, 'getEntry', function (id) {
        if (this._entries.has(id)) return this._entries.get(id);
        if (!this._available.has(id)) return null;
        this.makeEntries(id);
        return this._entries.has(id) ? this._entries.get(id) : null;
    }); // Library.getEntry

    /**
     * @function Library.loadEntry
     * @param {Config#@id} id
     * @returns {Object|null}
     * @async
     */
    _defineFn(Library, 'loadEntry', async function (id) {
        if (this._entries.has(id)) return this._entries.get(id);
        if (!this._available.has(id)) return null;
        if (!this._configs.has(id)) await this.loadConfig(id);
        this.makeEntries(id);
        return this._entries.has(id) ? this._entries.get(id) : null;
    }); // Library.loadEntry

    //#endregion LIBRARY

    //#region SETUP

    let
        _ready = false,
        _readyPromise = Library.loadAvailable(),
        _integrate = (entry) => {
            let
                path = _splitID(entry.id),
                key = path.pop();

            if (path.length === 0) return;

            let parent = Library.getEntry(path.join("."));
            if (!parent || parent.type !== "Package")
                throw new Error(`Package ${parent} has not been found`);

            parent.add(key, entry);
        }; // _integrate

    Library.defineType("Package", class Package {

        constructor(config) {
            this.type = config['@type'];
            this.id = config['@id'];
            this.exports = {};
            this.loaded = true;
            _integrate(this);
        } // Package#constructor

        add(key, child) {
            if (Reflect.has(this.exports, key)) {
                if (this.exports[key] === child) return;
                else throw new Error(`${key} already added`);
            }

            switch (child.type) {

                case "Package":
                case "Script":
                    _enumerate(this.exports, key, child.exports);
                    break;

                case "Alias":
                case "Module":
                    _enumerateGetter(this.exports, key, () => child.exports || null);
                    break;

                default:
                    throw new Error(`type ${child.type} not supported`);

            } // switch
        } // Package#add

    }).defineType("Alias", class Alias {

        constructor(config) {
            this.type = config['@type'];
            this.id = config['@id'];
            if (config['@id'] === config['target'] && !Library._regexID.test(config['target']))
                throw new TypeError("invalid config.target");
            this.loaded = false;
            this.target = config['target'];
            _integrate(this);
        } // Alias#constructor

        async load() {
            if (this.loaded) return this.exports;
            let target = await Library.loadEntry(this.target);
            if (!target) return null;
            let moduleExport = target.loaded
                ? target.exports
                : await target.load();
            if (!target.loaded) return null;
            this.loaded = true;
            this.exports = moduleExport;
        } // Alias#load

    }).defineType("Module", class Module {

        constructor(config) {
            this.type = config['@type'];
            this.id = config['@id'];
            if (typeof config['path'] !== 'string')
                throw new TypeError("invalid config.path");
            if (config['requires'] && !(Array.isArray(config['requires']) && config['requires'].every(id => Library._regexID.test(id))))
                throw new TypeError("invalid config.requires");
            this.path = config['path'];
            this.requires = config['requires'] || [];
            this.loaded = false;
            this.loadingPromise = null;
            _integrate(this);
        } // Module#constructor

        async load() {
            if (this.loaded) return this.exports;
            if (!this.loadingPromise) {
                this.loadingPromise = (async (/* async closure */) => {
                    let _dependencies = await Promise.all(this.requires.map(id => Library.loadEntry(id)));
                    if (!_dependencies.every(val => val))
                        throw new Error("dependencies not complete");

                    await Promise.all(_dependencies.filter(val => !val.loaded).map(val => val.load()));
                    if (!_dependencies.every(val => val.loaded))
                        throw new Error("dependencies not loaded");

                    let moduleExport = await import(_location + _globalKey + "/" + this.path);
                    if (Object.keys(moduleExport).length === 1) {
                        if (Reflect.has(moduleExport, 'default')) {
                            this.exports = moduleExport['default'];
                        } else {
                            delete moduleExport['default'];
                            this.exports = moduleExport;
                        }
                    } else {
                        this.exports = moduleExport;
                    }
                    this.loaded = true;
                    return this.exports;
                })(/* async closure */);

                this.loadingPromise.finally(() => { this.loadingPromise = null; });
            }

            return await this.loadingPromise;
        } // Module#load

    }).defineType("Script", class Script {

        constructor(config) {
            this.type = config['@type'];
            this.id = config['@id'];
            if (typeof config['@value'] !== 'function')
                throw new Error("invalid Script");
            this.exports = config['@value'];
            this.loaded = true;
            _integrate(this);
        } // Script#constructor

    }).addConfig({
        '@type': "Package",
        '@id': _globalKey
    }).addConfig({
        '@type': "Script",
        '@id': `${_globalKey}.get`,
        '@value': function get(id) {
            let result = Library.getEntry(id);
            return result && result.loaded ? result.exports : null;
        }
    }).addConfig({
        '@type': "Script",
        '@id': `${_globalKey}.load`,
        '@value': async function load(...idArr) {
            if (!_ready) await _readyPromise;
            let resultArr = await Promise.all(idArr.map(Library.loadEntry));
            await Promise.all(resultArr.filter(val => val && !val.loaded).map(elem => elem.load()));
            return resultArr.map(elem => elem && elem.loaded ? elem.exports : null);
        }
    }).makeEntries(
        _globalKey,
        `${_globalKey}.get`,
        `${_globalKey}.load`
    );

    _readyPromise.then(function () {
        _ready = true;
    });

    //#endregion SETUP

    //#region EXPORTS

    if (Reflect.has(window, _globalKey))
        throw new Error(`the global key ${_globalKey} is already defined`);
    let _entryPoint = Library.getEntry(_globalKey);
    _define(window, _globalKey, _entryPoint.exports);

    //#endregion EXPORTS

})(/* closure */);
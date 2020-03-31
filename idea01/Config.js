const _ = require("./util"), _package = require("."), _private = new WeakMap();

class Config {

    /**
     * @param {Object} config 
     * @param {Package} [parent=null] 
     */
    constructor(config, parent = null) {

        _.assert(_.isObject(config), "invalid config");
        _.assert(parent === null || parent instanceof Package, "invalid parent");
        _.assert(_.validID(config["@id"]), "invalid id");
        // _.assert(_.validType(config["@type"]), "invalid type");

        _.define(this, "id", config["@id"]);
        _.define(this, "parent", parent);

        _private.set(this, {
            loading: false, loaded: config["@type"] !== "Config",
            loadPromise: undefined, load: undefined,
            value: undefined
        });

        if (config["@type"] === "Config")
            this.value = config["@value"];

    } // constructor

    get value() {
        return _private.get(this).value;
    }

    set value(value) {
        const attr = _private.get(this);
        _.assert(attr.value === undefined, "value already defined");
        attr.value = value;
    }

    async load() {
        const attr = _private.get(this);
        if (attr.loaded) return attr.value;
        else if (attr.loading) return await attr.loadPromise;
        attr.loading = true;
        attr.loadPromise = new Promise((resolve) => { attr.load = resolve; });
        return await loadPromise;
    } // load

    get loading() {
        return _private.get(this).loading;
    }

    get loaded() {
        return _private.get(this).loaded;
    }

    set loaded(value) {
        if (value === true) {
            const attr = _private.get(this);
            _.assert(attr.loading, "not loading yet");
            _.assert(!attr.loaded, "already loaded");
            attr.loaded = true; attr.loading = false;
            attr.load(attr.value);
            delete attr.loadPromise;
            delete attr.load;
        }
    }

}

module.exports = Config;
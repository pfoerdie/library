const _ = require("./util"), _package = require("."), _private = new WeakMap();

class Module extends _package.Config {

    constructor(config, parent) {

        super(config, parent);

        _.assert(_.validPath(config.path), "invalid path");
        _.assert(!config.requires || (_.isArray(config.requires) && config.requires.every(_.validID)));

        _private.set(this, {
            path: config.path,
            requires: config.requires || []
        });

    } // constructor

    async load() {

        if (this.loading || this.loaded) return await super.load();
        const loadPromise = super.load();

        const { path, requires } = _private.get(this);
        // TODO requirements
        this.value = require(path);

        this.loaded = true;
        return await loadPromise;

    } // load

}

module.exports = Module;
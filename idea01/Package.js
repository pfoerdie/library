const _ = require("./util"), _package = require("."), _private = new WeakMap();

class Package extends _package.Config {

    constructor(config, parent) {

        super(config, parent);

        _.assert(!config.path || _.validPath(config.path), "invalid path");
        _.assert((!config.path && !config.depth) || _.isInteger(config.depth), "invalid depth");

        _private.set(this, {
            configs: new Map(),
            entries: new Map(),
            children: new Map(),
            path: config.path,
            depth: config.depth
        });

        this.value = {};

    } // constructor

    async load() {

        if (this.loading || this.loaded) return await super.load();
        const loadPromise = super.load();

        const { path, depth } = _private.get(this);
        if (path) {
            const configArr = await loadDirectory(path, depth);
            const { configs } = _private.get(this);
            for (let config of configArr) {
                if (config["@id"].startsWith(this.id + ".")) { // TODO think about this
                    _.assert(!configs.has(config["@id"]), "duplicate id: " + config["@id"]);
                    configs.set(config["@id"], config);
                }
            }
        }

        this.loaded = true;
        return await loadPromise;

    } // load

    async require(id) {

        _.assert(this.loaded, "not loaded yet");
        _.assert(_.validID(id), "invalid id");

        const { configs, children, entries } = _private.get(this);

        if (entries.has(id)) {
            const result = entries.get(id);
            return await result.load();
        } else if (configs.has(id)) {
            // TODO 
        } else {
            for (let child of children) {
                // if (child instanceof Package && id.startsWith(child.id)) {
                //     try {
                //         const result = await child.require(id.substr(child.id.length + 1)); // TODO think through and test
                //         entries.set(id, result);
                //         return await result.load();
                //     } catch (err) { }
                // }
            }
            // if(this.parent) {
            //     try {
            //         const result = await this.parent.require(this.id + "." + id); // TODO think through and test
            //         entries.set(id, result);
            //         return await result.load();
            //     } catch (err) { }
            // }
        }

        throw new Error("not found");

    } // require

}

module.exports = Package;

async function loadDirectory(directory, depth = 0) {

    if (depth < 0) return [];

    const
        dirContent = await _.listDir(directory),
        dirPaths = dirContent.map(value => _.joinPath(directory, value)),
        contentStats = await Promise.all(dirPaths.map(path => _.getStats(path))),
        availableFiles = dirPaths.filter((path, index) => contentStats[index].isFile() && _.validFile(dirContent[index])),
        fileBuffers = await Promise.all(availableFiles.map(path => _.readFile(path))),
        configFiles = fileBuffers
            .map(buffer => JSON.parse(buffer.toString(), (key, value) => key === 'path' ? _.joinPath(directory, value) : value))
            .filter(file => file && _.validContext(file['@context'])),
        configArr = [];

    for (let file of configFiles) {
        delete file['@context'];
        for (let config of Array.isArray(file['@graph']) ? file['@graph'] : [file]) {

            _.assert(config && typeof config === "object", "invalid config");
            _.assert(_.validType(config["@type"]), "invalid config.@type");
            _.assert(_.validID(config["@id"]), "invalid config.@id");

            configArr.push(config);

        }
    }

    if (depth > 0) {
        const avalableFolders = dirPaths.filter((path, index) => contentStats[index].isDirectory() && _.validFolder(dirContent[index]));
        const folderResults = await Promise.all(avalableFolders.map(path => loadDirectory(path, depth - 1)));
        folderResults.forEach(folderResult => configArr.push(...folderResult));
    }

    return configArr;

}
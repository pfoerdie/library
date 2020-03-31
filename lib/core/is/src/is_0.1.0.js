exports.number = function (value) {
    return typeof value === "number" && !isNaN(value);
}

exports.string = function (value) {
    return typeof value === "string";
}
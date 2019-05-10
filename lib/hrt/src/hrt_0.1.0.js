let tss = Date.now();
let hrtss = process.hrtime();

function hrt() {
    let hrts = process.hrtime(hrtss);
    return tss + 1e3 * hrts[0] + 1e-6 * hrts[1];
}

module.exports = hrt;
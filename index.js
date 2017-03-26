var package = require("./package.json");

throw new Error(`${package.name} is meant to be used as a global module, and should not be required.`);
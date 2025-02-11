// This is a minimal headless SqueakJS-based VM for CodeParadise.

var os = require("os");
var fs = require("fs");
var process = require("process");
var path = require("path");

// Add a global unhandled exception handler.
// Store the uncaught exception and start the Smalltalk uncaught handler.
process.on("uncaughtException", function(error) {
  globalThis.__cp_uncaught = { error: error };
  Squeak.externalModules.CpSystemPlugin.vm.handleUncaught();
});
process.on("unhandledRejection", function(reason, promise) {
  globalThis.__cp_uncaught = { reason: reason, promise: promise, compiledCode: promise.__cp_compiled_code };
  Squeak.externalModules.CpSystemPlugin.vm.handleUncaught();
});

// Retrieve image name and parameters from command line
var processArgs = process.argv.slice(2);
var fullName = processArgs[0];
if(!fullName) {
  console.error("No image name specified.");
  console.log("Usage (simplified): " + path.basename(process.argv0) + path.basename(process.argv[1]) + " <image filename>");
  process.exit(1);
}
var root = path.dirname(fullName) + path.sep;
var imageName = path.basename(fullName, ".image");

// Add a sessionStorage class
class SessionStorage {
  storage = {}

  constructor() {
    var self = this;
    Object.keys(process.env).forEach(function(key) {
      self.storage[key] = process.env[key];
    });

    // Set environment version (monotonic increasing counter, expecting exact match on server)
    this.storage["CLIENT_VERSION"] = "4";
  }
  getItem(name) {
    return this.storage[name];
  }
  setItem(name, value) {
    this.storage[name] = value;
  }
  removeItem(name) {
    delete this.storage[name];
  }
  get length() {
    return Object.keys(this.storage).length;
  }
  key(index) {
    return Object.keys(this.storage)[index];
  }
}

// Extend the global scope with a few browser classes and methods
require("./cp_globals.js");
Object.assign(globalThis, {
  localStorage: {},
  sessionStorage: new SessionStorage(),
  WebSocket: typeof WebSocket === "undefined" ? require("./lib_node/WebSocket") : WebSocket,
  sha1: require("./lib/sha1"),
  btoa: function(string) {
    return Buffer.from(string, 'ascii').toString('base64');
  },
  atob: function(string) {
    return Buffer.from(string, 'base64').toString('ascii');
  }
});

// Load VM and the internal plugins
require("./vm.js");
require("./vm.object.js");
require("./vm.object.spur.js");
require("./vm.image.js");
require("./vm.interpreter.js");
require("./vm.interpreter.proxy.js");
require("./vm.instruction.stream.js");
require("./vm.instruction.stream.sista.js");
require("./vm.instruction.printer.js");
require("./vm.primitives.js");
require("./jit.js");
require("./vm.display.js");
require("./vm.display.headless.js");    // use headless display to prevent image crashing/becoming unresponsive
require("./vm.input.js");
require("./vm.input.headless.js");    // use headless input to prevent image crashing/becoming unresponsive
require("./vm.plugins.js");
require("./vm.plugins.file.node.js");
require("./plugins/LargeIntegers.js");
require("./plugins/CpSystemPlugin.js");
require("./cp_interpreter.js");

// Set the appropriate VM and platform values
Object.extend(Squeak, {
  vmPath: process.cwd() + path.sep,
  platformSubtype: "Node.js",
  osVersion: process.version + " " + os.platform() + " " + os.release() + " " + os.arch(),
  windowSystem: "none",
});

// Extend the Squeak primitives with ability to load modules dynamically
Object.extend(Squeak.Primitives.prototype, {
  loadModuleDynamically: function(modName) {
    try {
      require("./plugins/" + modName);

      // Modules register themselves, should be available now
      return Squeak.externalModules[modName];
    } catch(e) {
      console.error("Plugin " + modName + " could not be loaded");
    }
    return undefined;
  }
});

// Read raw image
fs.readFile(root + imageName + ".image", function(error, data) {
  if(error) {
    console.error("Failed to read image", error);
    return;
  }

  // Run image
  Squeak.runImage(data.buffer, root + imageName);
});

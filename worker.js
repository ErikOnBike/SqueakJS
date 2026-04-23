// This is a minimal headless SqueakJS-based VM for CodeParadise.

// Load VM and the internal plugins
import "./cp_globals.js";
import "./vm.js";
import "./vm.object.js";
import "./vm.object.spur.js";
import "./vm.image.js";
import "./vm.interpreter.js";
import "./vm.interpreter.proxy.js";
import "./vm.instruction.stream.js";
import "./vm.instruction.stream.sista.js";
import "./vm.instruction.printer.js";
import "./vm.primitives.js";
import "./jit.js";
import "./vm.plugins.js";
import "./plugins/LargeIntegers.js";
import "./plugins/CpSystemPlugin.js";
import "./cp_interpreter.js";

// Add a minimal Storage class
class Storage extends Object {

  constructor() {
    super();
    this.storage = {};
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

// Create Storage instances
const sessionStorage = new Storage();
const localStorage = new Storage();

// Use default server URL
sessionStorage.setItem("SERVER_URL", globalThis.location.protocol.replace("http", "ws") + "//" + globalThis.location.host + "/io");

// Set environment version (monotonic increasing counter, expecting exact match on server)
sessionStorage.setItem("CLIENT_VERSION", "9");

// Override any setting from the worker's location (query parameters)
const searchParams = new URLSearchParams(globalThis.location.search);
for(const [key, value] of searchParams) {
  sessionStorage.setItem(key, value);
}

// Set app name from the name supplied during instantiation
if(globalThis.name) {
	sessionStorage.setItem("APP", "worker-" + globalThis.name);
}

// Extend the global scope with storage objects
// (which are both volatile and almost empty,
// except for CLIENT_VERSION and APP in the sessionStorage)
Object.assign(globalThis, {
  localStorage: localStorage,
  sessionStorage: sessionStorage
});

// Extend Squeak with settings and options to fetch and run image
Object.extend(Squeak, {
  vmPath: "/",
  platformSubtype: "Worker",
  osVersion: globalThis.navigator.userAgent,
  windowSystem: "CodeParadise",
  fetchImageAndRun: function(imageName) {
    globalThis.fetch(imageName, {
      method: "GET",
      mode: "cors",
      cache: "no-cache"
    }).then(function(response) {
      if(!response.ok) {
        throw new Error("Response not OK: " + response.status);
      }
      return response.arrayBuffer();
    }).then(function(imageData) {
      Squeak.runImage(imageData, imageName.replace(/\.image$/i, ""));
    }).catch(function(error) {
      console.error("Failed to retrieve image", error);
    });
  }
});

console.log(globalThis.location);
Squeak.fetchImageAndRun("./client-environment.image");

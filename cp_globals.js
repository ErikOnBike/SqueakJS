"use strict";

// Create some global functions.
// The content of this file is a slight adaptation of "globals.js" for use in CodeParadise.

(function() {
  // Helper method to create a global scope (working similarly in Browser and in NodeJS).
  // Since ES2020 there should be a globalThis we can use. If not present, create one.
  // For compatibility some Node.js 'fixes' are made to allow a more consistent usage.
  if(typeof window !== 'undefined') {
    // For Browser environment create a global object named 'globalThis'.
    if(!window.globalThis) {
      window.globalThis = window;
    }
  } else {
    // For Node.js environment create a global object named 'globalThis'.
    if(!global.globalThis) {
      global.globalThis = global;
    }
    // For Node.js make 'require' an actual global function
    globalThis.require = function(name) {
      var module = require(name);
      Object.keys(module).forEach(function(key) {
        // Check for classes (not 100% check, okay if we give to many objects an internal property)
        // See also:
        // https://stackoverflow.com/questions/40922531/how-to-check-if-a-javascript-function-is-a-constructor
        // Assume classes have uppercase first character
        if(key[0] >= "A" && key[0] <= "Z") {
          var value = module[key];
          if(value && value.constructor && value.prototype && value === value.prototype.constructor) {
            value.__cp_className = name + "." + key;
          }
        }
      });
      return module;
    };

    // For Node.js replace the global object constructor to prevent it from being characterized
    // as a Dictionary (when processing in makeStObject).
    globalThis.constructor = function() {};
  }

  // Create global function to let objects 'identify' themselves (used for Proxy-ing JavaScript objects).
  // For undefined or null, answer the global object itself.
  globalThis.identity = function(x) { return x === undefined || x === null ? globalThis : x; };

  // Below follows the adapted "globals.js"

  // Create Squeak VM namespace
  if(!globalThis.Squeak) {
    globalThis.Squeak = {};
  }

  // Setup a storage for settings
  if(!Squeak.Settings) {
    // Try (a working) localStorage and fall back to regular dictionary otherwise
    var settings;
    try {
      // fails in restricted iframe
      settings = globalThis.localStorage;
      settings["squeak-foo:"] = "bar";
      if(settings["squeak-foo:"] !== "bar") throw Error();
      delete settings["squeak-foo:"];
    } catch(e) {
      settings = {};
    }
    Squeak.Settings = settings;
  }

  if(!Object.extend) {
    // Extend object by adding specified properties
    Object.extend = function(obj /* + more args */ ) {
      // skip arg 0, copy properties of other args to obj
      for (var i = 1; i < arguments.length; i++)
        if (typeof arguments[i] == 'object')
          for (var name in arguments[i])
            obj[name] = arguments[i][name];
    };
  }

  // This mimics the Lively Kernel's subclassing scheme.
  // When running there, Lively's subclasses and modules are used.
  // Modules serve as namespaces in Lively. SqueakJS uses a flat namespace
  // named "Squeak", but the code below still supports hierarchical names.
  if (!Function.prototype.subclass) {
    // Create subclass using specified class path and given properties
    Function.prototype.subclass = function(classPath /* + more args */ ) {
      // create subclass
      var subclass = function() {
        if (this.initialize) {
          var result = this.initialize.apply(this, arguments);
          if (result !== undefined) return result;
        }
        return this;
      };
      // set up prototype
      var protoclass = function() { };
      protoclass.prototype = this.prototype;
      subclass.prototype = new protoclass();
      // skip arg 0, copy properties of other args to prototype
      for (var i = 1; i < arguments.length; i++)
        Object.extend(subclass.prototype, arguments[i]);
      // add class to namespace
      var path = classPath.split("."),
        className = path.pop(),
        // Walk path starting at the global namespace
        // creating intermediate namespaces if necessary
        namespace = path.reduce(function(namespace, path) {
          if (!namespace[path]) namespace[path] = {};
          return namespace[path];
        }, globalThis);
      namespace[className] = subclass;
      return subclass;
    };
  }
})();

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
import "./vm.display.js";
import "./vm.display.headless.js";      // use headless display to prevent image crashing/becoming unresponsive
import "./vm.input.js";
import "./vm.input.headless.js";        // use headless input to prevent image crashing/becoming unresponsive
import "./vm.plugins.js";
import "./plugins/LargeIntegers.js";
import "./plugins/CpSystemPlugin.js";
import "./plugins/CpDOMPlugin.js";
import "./cp_interpreter.js";

// Add a global unhandled exception handler.
// Store the uncaught exception and start the Smalltalk uncaught handler.
window.addEventListener("unhandledrejection", function(event) {
  globalThis.__cp_uncaught = { reason: event.reason, promise: event.promise, compiledCode: event.promise.__cp_compiled_code };
  Squeak.externalModules.CpSystemPlugin.vm.handleUncaught();

  // Don't show default message on the console
  event.preventDefault();
});

// Extend Squeak with settings and options to fetch and run image
Object.extend(Squeak, {
  vmPath: "/",
  platformSubtype: "Browser",
  osVersion: window.navigator.userAgent,
  windowSystem: "CodeParadise",
  fetchImageAndRun: function(imageName) {
    globalThis.fetch(imageName, {
      method: "GET",
      mode: "cors",
      cache: (document.location.hostname === "localhost" ? "no-store" : "no-cache")
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

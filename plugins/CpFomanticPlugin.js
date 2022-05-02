function CpFomanticPlugin() {
  "use strict";

  return {
    getModuleName: function() { return "CpFomanticPlugin"; },
    interpreterProxy: null,
    primHandler: null,

    setInterpreter: function(anInterpreter) {
      this.interpreterProxy = anInterpreter;
      this.primHandler = this.interpreterProxy.vm.primHandler;
      this.domPlugin = Squeak.externalModules.CpDOMPlugin;
      // @@ToDo: Temporary hack for using the root class of DOM/HTML elements
      this.domElementClass = this.interpreterProxy.vm.globalNamed("CpDomElement");
      return true;
    },

    // Helper methods for answering (and setting the stack correctly)
    answer: function(argCount, value) {
      this.interpreterProxy.popthenPush(argCount + 1, this.primHandler.makeStObject(value));
      return true;
    },
    answerSelf: function(argCount) {
      // Leave self on stack and only pop arguments
      this.interpreterProxy.pop(argCount);
      return true;
    },

    // Helper methods for Fomantic
    withJQuery: function(callback) {
      // jQuery and Fomantic might not be loaded yet, retry until loaded
      if(window.jQuery && window.jQuery.prototype.calendar) {
        return callback(window.jQuery);
      } else {
console.log("Waiting");
        var thisHandle = this;
        window.setTimeout(function() {
          thisHandle.withJQuery(callback);
        }, 100);
        return null;
      }
    },
    shadowElement: function(domElement) {
      if(!domElement || !domElement.shadowRoot) return null;
      return Array.from(domElement.shadowRoot.children)
        .find(function(childElement) {
          return childElement.localName !== "style";
        })
      ;
    },

    // FUI element instance methods
    "primitiveFUIElementPerformOnElement:as:": function(argCount) {
      if(argCount !== 2) return false;
      let properties = this.domPlugin.asJavascriptObject(this.interpreterProxy.stackValue(1));
      let elementType = this.interpreterProxy.stackValue(0).bytesAsString();
      if(!elementType) return false;
      let receiver = this.interpreterProxy.stackValue(argCount);
      let shadowElement = this.shadowElement(receiver.domElement);
// @@ToDo: decide whether to use WebComponents or not
      if(!shadowElement) shadowElement = receiver.domElement;

      // Perform behavior
      let result = this.withJQuery(function(jQuery) {
        let jQueryElement = jQuery(shadowElement);
        try {
          return jQueryElement[elementType](properties);
        } catch(e) {
          throw Error("unsupported elementType " + elementType + " or error " + e.message);
        }
      });

      // If result looks like the component itself, answer 'self'
      if(typeof result[elementType] === "function") {
        result = receiver;
      }
      return this.answer(argCount, result);
    },
    "primitiveFUIElementShadowElement": function(argCount) {
      if(argCount !== 0) return false;
      let receiver = this.interpreterProxy.stackValue(argCount);
      let shadowElement = this.shadowElement(receiver.domElement);
      if(!shadowElement) return false;
      return this.answer(argCount, this.domPlugin.instanceForElement(shadowElement, this.domElementClass));
    }
  };
}

function registerCpFomanticPlugin() {
    if(typeof Squeak === "object" && Squeak.registerExternalModule) {
        Squeak.registerExternalModule("CpFomanticPlugin", CpFomanticPlugin());
    } else self.setTimeout(registerCpFomanticPlugin, 100);
};

registerCpFomanticPlugin();

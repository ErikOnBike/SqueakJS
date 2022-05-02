function CpDOMPlugin() {
  "use strict";

  return {
    getModuleName: function() { return "CpDOMPlugin"; },
    interpreterProxy: null,
    primHandler: null,
    customTagMap: {},
    nestedTags: {},
    customElementClassMappers: [],
    eventDefinitions: {},
    eventsReceived: [],
    throttleEventTypes: [ "pointermove", "wheel", "gesturechange" ],
    preventDefaultEventTypes: [ "wheel" ],	// These need be applied on element level (vs only on body as in preventDefaultEventHandling)
    namespaces: [
      // Default namespaces (for attributes, therefore without elementClass)
      { prefix: "xlink", uri: "http://www.w3.org/1999/xlink", elementClass: null },
      { prefix: "xmlns", uri: "http://www.w3.org/2000/xmlns/", elementClass: null }
    ],
    domElementMap: new WeakMap(),

    setInterpreter: function(anInterpreter) {
      this.interpreterProxy = anInterpreter;
      this.primHandler = this.interpreterProxy.vm.primHandler;
      this.pointClass = this.interpreterProxy.vm.globalNamed("Point");
      this.associationClass = this.interpreterProxy.vm.globalNamed("Association");
      this.dictionaryClass = this.interpreterProxy.vm.globalNamed("Dictionary");
      this.domElementClass = null; // Only known after installation
      this.domRectangleClass = null; // Only known after installation
      this.systemPlugin = Squeak.externalModules.CpSystemPlugin;
      this.updateMakeStObject();
      this.preventDefaultEventHandling();
      this.runUpdateProcess();
      return true;
    },

    // Helper method for running a process uninterrupted
    runUninterrupted: function(process, endTime) {
      if(!process) {
        return;
      }

      // Run the specified process until the process goes
      // to sleep again or the end time is reached.
      // This 'runner' assumes the process runs 'quickly'.
      var primHandler = this.primHandler;
      primHandler.resume(process);
      var scheduler = primHandler.getScheduler();
      var vm = primHandler.vm;
      do {
        if(vm.method.compiled) {
          vm.method.compiled(vm);
        } else {
          vm.interpretOne();
        }
      } while(process === scheduler.pointers[Squeak.ProcSched_activeProcess] && (endTime === undefined || performance.now() < endTime));
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
    updateMakeStObject: function() {
      // Replace existing makeStObject function with more elaborate variant
      if(this.originalMakeStObject) {
        return;	// Already installed
      }
      var self = this;
      self.originalMakeStObject = this.primHandler.makeStObject;
      this.primHandler.makeStObject = function(obj, proxyClass) {
        if(obj !== undefined && obj !== null) {
          // Check for DOM element
          if(obj.tagName && obj.querySelectorAll) {
            return self.instanceForElement(obj);
          }
          // Check for Dictionary like element
          if(obj.constructor === Object && !obj.sqClass) {
            return self.makeStDictionary(obj);
          }
        }
        return self.originalMakeStObject.call(this, obj, proxyClass);
      };
    },
    makeStAssociation: function(key, value) {
      var association = this.interpreterProxy.vm.instantiateClass(this.associationClass, 0);
      // Assume instVars are #key and #value (in that order)
      association.pointers[0] = this.primHandler.makeStObject(key);
      association.pointers[1] = this.primHandler.makeStObject(value);
      return association;
    },
    makeStDictionary: function(obj) {
      var dictionary = this.interpreterProxy.vm.instantiateClass(this.dictionaryClass, 0);
      var keys = Object.keys(obj);
      var self = this;
      var associations = keys.map(function(key) {
        return self.makeStAssociation(key, obj[key]);
      });
      // Assume instVars are #tally and #array (in that order)
      var tally = dictionary.pointers[0] = keys.length;
      var array = dictionary.pointers[1] = this.primHandler.makeStArray(associations);
      return dictionary;
    },

    // Helper methods for namespaces
    namespaceForURI: function(uri) {
      return this.namespaces.find(function(namespace) {
        return namespace.uri === uri;
      });
    },
    namespaceForPrefix: function(prefix) {
      return this.namespaces.find(function(namespace) {
        return namespace.prefix === prefix;
      });
    },
    namespaceURIFromName: function(name) {
      var separatorIndex = name.indexOf(":");
      if(separatorIndex < 0) {
        return null;
      }
      var prefix = name.slice(0, separatorIndex);
      return this.namespaceForPrefix(prefix);
    },

    // Helper method to create a tag name from a class name
    tagNameFromClass: function(aClass) {

      // Remove camelCase and use dashes, all lowercase
      return aClass.className()
        .replace(/View$/, "")                 // Remove View as postfix for nicer readability
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
        .replace(/^([A-Za-z0-9]*)$/, "x-$1")  // Failsafe since custom tag name requires at least one hyphen
        .toLowerCase()
      ;
    },

    // Point helper methods
    getPointX: function(stPoint) {
      return stPoint.pointers[0];
    },
    getPointY: function(stPoint) {
      return stPoint.pointers[1];
    },

    // DOM element helper methods
    getDomElementClass: function() {
      if(!this.domElementClass) {
        this.domElementClass = this.interpreterProxy.vm.globalNamed("CpDomElement");
      }
      return this.domElementClass;
    },
    getDomRectangleClass: function() {
      if(!this.domRectangleClass) {
        this.domRectangleClass = this.interpreterProxy.vm.globalNamed("CpDomRectangle");
      }
      return this.domRectangleClass;
    },
    addElementClassMapper: function(mapper) {
      this.customElementClassMappers.push(mapper);
    },
    instanceForElement: function(element) {
      if(!element) return null;

      // Retrieve instance from DOM element itself
      if(element.__cp_element) {
        return element.__cp_element;
      }

      // Retrieve instance from DOM element map (if available and not GC'ed)
      var instance = this.domElementMap.get(element);
      if(instance === undefined) {

        // Create new instance and store in DOM element map
        var elementClass = this.customTagMap[element.localName];
        if(!elementClass) {
          this.customElementClassMappers.some(function(customElementClassMapper) {
            elementClass = customElementClassMapper(element);
            return elementClass !== null;
          });
        }
        if(!elementClass) {
          var namespace = this.namespaceForURI(element.namespaceURI);
          elementClass = namespace ? namespace.elementClass : this.getDomElementClass();
        }
        instance = this.interpreterProxy.vm.instantiateClass(elementClass, 0);
        instance.domElement = element;
        this.domElementMap.set(element, instance);
      }
      return instance;
    },
    makeDomRectangle: function(rectangle) {
      let domRectangleClass = this.getDomRectangleClass();
      let domRectangle = this.interpreterProxy.vm.instantiateClass(domRectangleClass, 0);
      let primHandler = this.primHandler;
      domRectangleClass.allInstVarNames().forEach(function(name, index) {
        if(rectangle[name] !== undefined) {
          domRectangle.pointers[index] = primHandler.makeStObject(rectangle[name]);
        }
      });
      return domRectangle;
    },

    // DOM element class methods
    "primitiveDomElementRegisterNamespace:forPrefix:": function(argCount) {
      if(argCount !== 2) return false;
      var namespaceURI = this.interpreterProxy.stackValue(1).asString();
      if(!namespaceURI) return false;
      var prefix = this.interpreterProxy.stackValue(0).asString();
      if(!prefix) return false;
      if(this.namespaceForPrefix(prefix)) {
        console.error("The prefix " + prefix + " is already installed in the browser");
        return false;
      }
      var receiver = this.interpreterProxy.stackValue(argCount);
      this.namespaces.push({ prefix: prefix, uri: namespaceURI, elementClass: receiver });
      return this.answerSelf(argCount);
    },
    "primitiveDomElementNewWithTag:": function(argCount) {
      if(argCount !== 1) return false;
      var tagName = this.interpreterProxy.stackValue(0).asString();
      if(!tagName) return false;
      var separatorIndex = tagName.indexOf(":");
      var prefix = separatorIndex >= 0 ? tagName.slice(0, separatorIndex) : tagName;
      if(separatorIndex >= 0 && prefix !== "xmlns") {
        tagName = tagName.slice(separatorIndex + 1);
      }
      var namespace = this.namespaceForPrefix(prefix);
      var element = !namespace || prefix === "xhtml" ?
        window.document.createElement(tagName) :
        window.document.createElementNS(namespace.uri, tagName)
      ;
      return this.answer(argCount, this.instanceForElement(element));
    },
    "primitiveDomElementDocument": function(argCount) {
      if(argCount !== 0) return false;
      var document = window.document;
      return this.answer(argCount, this.instanceForElement(document));
    },
    "primitiveDomElementElementsFromPoint:": function(argCount) {
      if(argCount !== 1) return false;
      var point = this.interpreterProxy.stackValue(0);
      if(point.sqClass !== this.pointClass) return false;
      var thisHandle = this;
      var elements = window.document.elementsFromPoint(this.getPointX(point), this.getPointY(point)).map(function(element) {
        return thisHandle.instanceForElement(element);
      });
      return this.answer(argCount, elements);
    },

    // DOM element instance methods
    "primitiveDomElementElementWithId:": function(argCount) {
      if(argCount !== 1) return false;
      var id = this.interpreterProxy.stackValue(0).asString();
      if(!id) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      // Check the receiver is a root element (this means it has an activeElement)
      if(!domElement || domElement.activeElement === undefined) return false;
      var element = domElement.getElementById(id);
      return this.answer(argCount, this.instanceForElement(element));
    },
    "primitiveDomElementAllDescendantsMatching:": function(argCount) {
      if(argCount !== 1) return false;
      var querySelector = this.interpreterProxy.stackValue(0).asString();
      if(!querySelector) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var thisHandle = this;
      var matchingElements = Array.from(domElement.querySelectorAll(querySelector))
        .map(function(matchingElement) {
          return thisHandle.instanceForElement(matchingElement);
        })
      ;
      return this.answer(argCount, matchingElements);
    },
    "primitiveDomElementFirstDescendantMatching:": function(argCount) {
      if(argCount !== 1) return false;
      var querySelector = this.interpreterProxy.stackValue(0).asString();
      if(!querySelector) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var firstMatchingElement = domElement.querySelector(querySelector);
      return this.answer(argCount, this.instanceForElement(firstMatchingElement));
    },
    "primitiveDomElementMatches:": function(argCount) {
      if(argCount !== 1) return false;
      var selector = this.interpreterProxy.stackValue(0).asString();
      if(!selector) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.matches(selector));
    },
    "primitiveDomElementParent": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var parentElement = domElement.parentElement;
      return this.answer(argCount, this.instanceForElement(parentElement));
    },
    "primitiveDomElementChildren": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var thisHandle = this;
      var childElements = Array.from(domElement.children)
        .map(function(childElement) {
          return thisHandle.instanceForElement(childElement);
        })
      ;
      return this.answer(argCount, childElements);
    },
    "primitiveDomElementPreviousSibling": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var siblingElement = domElement.previousElementSibling;
      return this.answer(argCount, this.instanceForElement(siblingElement));
    },
    "primitiveDomElementNextSibling": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var siblingElement = domElement.nextElementSibling;
      return this.answer(argCount, this.instanceForElement(siblingElement));
    },
    "primitiveDomElementTagName": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.localName || domElement.tagName || "--shadow--");
    },
    "primitiveDomElementId": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.id);
    },
    "primitiveDomElementId:": function(argCount) {
      if(argCount !== 1) return false;
      var id = this.interpreterProxy.stackValue(0).asString();
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement.id = id;
      return this.answerSelf(argCount);
    },
    "primitiveDomElementTextContent": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.textContent);
    },
    "primitiveDomElementTextContent:": function(argCount) {
      if(argCount !== 1) return false;
      var textContent = this.interpreterProxy.stackValue(0).asString();
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement.textContent = textContent;
      return this.answerSelf(argCount);
    },
    "primitiveDomElementMarkupContent": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.innerHTML);
    },
    "primitiveDomElementMarkupContent:": function(argCount) {
      if(argCount !== 1) return false;
      var content = this.interpreterProxy.stackValue(0);
      var markupContent = content.asString();
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement.innerHTML = markupContent;
      return this.answerSelf(argCount);
    },
    "primitiveDomElementIsClassed:": function(argCount) {
      if(argCount !== 1) return false;
      var className = this.interpreterProxy.stackValue(0).asString();
      if(!className) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.classList.contains(className));
    },
    "primitiveDomElementAddClass:": function(argCount) {
      if(argCount !== 1) return false;
      var className = this.interpreterProxy.stackValue(0).asString();
      if(!className) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement.classList.add(className);
      return this.answerSelf(argCount);
    },
    "primitiveDomElementRemoveClass:": function(argCount) {
      if(argCount !== 1) return false;
      var className = this.interpreterProxy.stackValue(0).asString();
      if(!className) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement.classList.remove(className);
      return this.answerSelf(argCount);
    },
    "primitiveDomElementAttributeAt:": function(argCount) {
      if(argCount !== 1) return false;
      var attributeName = this.interpreterProxy.stackValue(0).asString();
      if(!attributeName) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var namespaceURI = this.namespaceURIFromName(attributeName);
      var attributeValue;
      if(namespaceURI) {
        attributeValue = domElement.getAttributeNS(namespaceURI, attributeName);
      } else {
        attributeValue = domElement.getAttribute(attributeName);
      }
      return this.answer(argCount, attributeValue);
    },
    "primitiveDomElementAttributeAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var attributeName = this.interpreterProxy.stackValue(1).asString();
      if(!attributeName) return false;
      var value = this.interpreterProxy.stackValue(0);
      var attributeValue = value.isNil ? null: value.asString();
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var namespaceURI = this.namespaceURIFromName(attributeName);
      if(attributeValue === null) {
        if(namespaceURI) {
          domElement.removeAttributeNS(namespaceURI, attributeName);
        } else {
          domElement.removeAttribute(attributeName);
        }
      } else {
        if(namespaceURI) {
          domElement.setAttributeNS(namespaceURI, attributeName, attributeValue);
        } else {
          domElement.setAttribute(attributeName, attributeValue);
        }
      }
      return this.answerSelf(argCount);
    },
    "primitiveDomElementRemoveAttributeAt:": function(argCount) {
      if(argCount !== 1) return false;
      var attributeName = this.interpreterProxy.stackValue(0).asString();
      if(!attributeName) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var namespaceURI = this.namespaceURIFromName(attributeName);
      if(namespaceURI) {
        domElement.removeAttributeNS(namespaceURI, attributeName);
      } else {
        domElement.removeAttribute(attributeName);
      }
      return this.answerSelf(argCount);
    },
    "primitiveDomElementStyleAt:": function(argCount) {
      if(argCount !== 1) return false;
      var styleName = this.interpreterProxy.stackValue(0).asString();
      if(!styleName) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement.style.getPropertyValue(styleName) ||
          window.getComputedStyle(domElement).getPropertyValue(styleName));
    },
    "primitiveDomElementStyleAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var styleName = this.interpreterProxy.stackValue(1).asString();
      if(!styleName) return false;
      var value = this.interpreterProxy.stackValue(0);
      var styleValue = value.isNil ? null : value.asString();
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      if(styleValue === null) {
        domElement.style.removeProperty(styleName);
      } else {
        domElement.style.setProperty(styleName, styleValue);
      }
      return this.answerSelf(argCount);
    },
    "primitiveDomElementRemoveStyleAt:": function(argCount) {
      if(argCount !== 1) return false;
      var styleName = this.interpreterProxy.stackValue(0).asString();
      if(!styleName) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement.style.removeProperty(styleName);
      return this.answerSelf(argCount);
    },
    "primitiveDomElementPropertyAt:": function(argCount) {
      if(argCount !== 1) return false;
      var propertyName = this.interpreterProxy.stackValue(0).asString();
      if(!propertyName) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, domElement[propertyName]);
    },
    "primitiveDomElementPropertyAt:put:": function(argCount) {
      if(argCount !== 2) return false;
      var propertyName = this.interpreterProxy.stackValue(1).asString();
      if(!propertyName) return false;
      var propertyValue = this.systemPlugin.asJavascriptObject(this.interpreterProxy.stackValue(0));
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      domElement[propertyName] = propertyValue;
      return this.answerSelf(argCount);
    },
    "primitiveDomElementBoundingClientRectangle": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, this.makeDomRectangle(domElement.getBoundingClientRect()));
    },
    "primitiveDomElementClone": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var clone = domElement.cloneNode(true);
      clone.removeAttribute("id");	// Remove id to prevent duplicates
      return this.answer(argCount, this.instanceForElement(clone));
    },
    "primitiveDomElementAppendChild:": function(argCount) {
      if(argCount !== 1) return false;
      var childInstance = this.interpreterProxy.stackValue(0);
      var childElement = childInstance.domElement;
      if(!childElement) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      if(domElement.children.length === 0 && domElement.childNodes.length > 0) {
        // Remove any existing text content when there are no children yet.
        // An element should either have text content or elements as 'content'.
        domElement.textContent = "";
      }
      domElement.appendChild(childElement);
      return this.answer(argCount, childInstance);
    },
    "primitiveDomElementInsertChild:before:": function(argCount) {
      if(argCount !== 2) return false;
      var childInstance = this.interpreterProxy.stackValue(1);
      var childElement = childInstance.domElement;
      if(!childElement) return false;
      var siblingElement = this.interpreterProxy.stackValue(0).domElement;
      if(!siblingElement) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement || siblingElement.parentElement !== domElement) return false;
      domElement.insertBefore(childElement, siblingElement);
      return this.answer(argCount, childInstance);
    },
    "primitiveDomElementReplaceChild:with:": function(argCount) {
      if(argCount !== 2) return false;
      var childElement = this.interpreterProxy.stackValue(1).domElement;
      if(!childElement) return false;
      var replacementInstance = this.interpreterProxy.stackValue(0);
      var replacementElement = replacementInstance.domElement;
      if(!replacementElement) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement || childElement.parentElement !== domElement) return false;
      domElement.replaceChild(replacementElement, childElement);
      return this.answer(argCount, replacementInstance);
    },
    "primitiveDomElementRemoveChild:": function(argCount) {
      if(argCount !== 1) return false;
      var childInstance = this.interpreterProxy.stackValue(0);
      var childElement = childInstance.domElement;
      if(!childElement) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      if(childElement.parentElement !== domElement) return false;
      domElement.removeChild(childElement);
      return this.answer(argCount, childInstance);
    },
    "primitiveDomElementUnRegisterAllInterest": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      delete domElement.__cp_events;
      delete domElement.__cp_element;
      return this.answerSelf(argCount);
    },
    "primitiveDomElementApply:withArguments:": function(argCount) {
      if(argCount !== 2) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var functionName = this.interpreterProxy.stackValue(1).asString();
      if(!functionName) return false;
      var functionArguments = this.systemPlugin.asJavascriptObject(this.interpreterProxy.stackValue(0));
      // Evaluate function in separate event cycle, preventing possible event to be generated outside the
      // Smalltalk execution thread. Sending #focus for example would synchronously execute the #focusin
      // event, which would get executed before this primitive is finished. It will leave the VM stack
      // unbalanced.
      window.setTimeout(function() { domElement[functionName].apply(domElement, functionArguments); }, 0);
      return this.answerSelf(argCount);
    },
    "primitiveDomElementSyncApply:withArguments:": function(argCount) {
      if(argCount !== 2) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      var functionName = this.interpreterProxy.stackValue(1).asString();
      if(!functionName) return false;
      var functionArguments = this.systemPlugin.asJavascriptObject(this.interpreterProxy.stackValue(0));
      // This is the 'unsafe' variant of primitiveDomElementApply. See the comment there. Use with care.
      // This variant is useful for performing getters.
      return this.answer(argCount, domElement[functionName].apply(domElement, functionArguments));
    },

    // HTMLElement class methods
    "primitiveHtmlElementDocumentHead": function(argCount) {
      if(argCount !== 0) return false;
      var documentHead = window.document.head;
      return this.answer(argCount, this.instanceForElement(documentHead));
    },
    "primitiveHtmlElementDocumentBody": function(argCount) {
      if(argCount !== 0) return false;
      var documentBody = window.document.body;
      return this.answer(argCount, this.instanceForElement(documentBody));
    },

    // WebComponent class methods
    "primitiveWebComponentRegister": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      if(receiver.customTag !== undefined) {
        console.error("Registering a WebComponent which already has a custom tag: " + receiver.customTag);
        return false;
      }

      // Keep track of custom tag and Smalltalk class
      var customTag = this.tagNameFromClass(receiver);
      receiver.customTag = customTag;
      this.customTagMap[customTag] = receiver;

      return this.answerSelf(argCount);
    },
    "primitiveWebComponentIsRegistered:": function(argCount) {
      if(argCount !== 1) return false;
      var tagName = this.interpreterProxy.stackValue(0).asString();
      var customClass = window.customElements.get(tagName);
      return this.answer(argCount, !!customClass);
    },
    "primitiveWebComponentTagName": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var tagName = this.tagNameFromClass(receiver);
      return this.answer(argCount, tagName);
    },
    "primitiveWebComponentShadowRoot": function(argCount) {
      if(argCount !== 0) return false;
      var domElement = this.interpreterProxy.stackValue(argCount).domElement;
      if(!domElement) return false;
      return this.answer(argCount, this.instanceForElement(domElement.shadowRoot));
    },

    // TemplateComponent helper methods
    ensureShadowRoot: function(elementClass, domElement) {

      // Attach shadow DOM (if not already presnet) and copy template (if available)
      if(!domElement.shadowRoot) {
        var shadowRoot = domElement.attachShadow({ mode: "open" });
        if(elementClass.templateElement) {
          shadowRoot.appendChild(elementClass.templateElement.cloneNode(true));
        }
      }
    },

    // TemplateComponent class methods
    "primitiveTemplateComponentRegisterStyleAndTemplate": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      if(receiver.customTag === undefined) {
        console.error("Registering a TemplateComponent without a custom tag");
        return false;
      }

      // Create custom class and register it
      var thisHandle = this;
      try {
        var customClass = class extends HTMLElement {
          constructor() {
            super();
            thisHandle.ensureShadowRoot(receiver, this);
          }
        };

        // Keep track of custom class
        window.customElements.define(receiver.customTag, customClass);
        customClass.sqClass = receiver;
      } catch(e) {
        console.error("Failed to create new custom element with tag " + receiver.customTag, e);
        return false;
      }

      return this.answerSelf(argCount);
    },
    "primitiveTemplateComponentInstallStyle:andTemplate:": function(argCount) {
      if(argCount !== 2) return false;
      var styleString = this.interpreterProxy.stackValue(1).asString();
      var templateString = this.interpreterProxy.stackValue(0).asString();
      var receiver = this.interpreterProxy.stackValue(argCount);

      // Set the style without installing it (this will happen when installing the template)
      receiver.style = styleString;

      // Install template and rerender al instances
      this.installTemplate(receiver, templateString);
      this.renderAllInstances(receiver);
      return this.answerSelf(argCount);
    },
    "primitiveTemplateComponentInstallStyle:": function(argCount) {
      if(argCount !== 1) return false;
      var styleString = this.interpreterProxy.stackValue(0).asString();
      var receiver = this.interpreterProxy.stackValue(argCount);
      receiver.style = styleString;
      this.installStyleInTemplate(receiver);
      this.renderAllInstances(receiver);
      return this.answerSelf(argCount);
    },
    installStyleInTemplate: function(webComponentClass) {

      // Retrieve templateElement
      var templateElement = webComponentClass.templateElement;
      if(!templateElement) {
        return;
      }

      // Create new style node from specified styleString
      var newStyleNode = window.document.createElement("style");
      newStyleNode.id = "cp-css--" + webComponentClass.customTag;
      newStyleNode.textContent = webComponentClass.style;

      // Replace existing styles or add new styles
      var oldStyleNode = templateElement.querySelector("#" + newStyleNode.id);
      if(oldStyleNode) {

        // Existing styles are replaced
        oldStyleNode.parentNode.replaceChild(newStyleNode, oldStyleNode);
      } else {

        // Insert the style to become the first element of the template
        templateElement.insertBefore(newStyleNode, templateElement.firstElementChild);
      }
    },
    "primitiveTemplateComponentInstallTemplate:": function(argCount) {
      if(argCount !== 1) return false;
      var templateString = this.interpreterProxy.stackValue(0).asString();
      var receiver = this.interpreterProxy.stackValue(argCount);
      this.installTemplate(receiver, templateString);
      this.renderAllInstances(receiver);
      return this.answerSelf(argCount);
    },
    installTemplate: function(webComponentClass, template) {

      // Create template node from specified template (String)
      // The DOM parser is very forgiving, so no need for try/catch here
      var domParser = new DOMParser();
      var templateElement = domParser.parseFromString("<template>" + (template || "") + "</template>", "text/html").querySelector("template").content;

      // Check for nested templates
      var customTags = Object.keys(this.customTagMap);
      var hasNestedTag = customTags.some(function(customTag) {
        return templateElement.querySelector(customTag) !== null;
      });

      // Add or remove receiver from collection of nested tags
      if(hasNestedTag) {
        this.nestedTags[webComponentClass.customTag] = true;
      } else {
        delete this.nestedTags[webComponentClass.customTag];
      }

      // Store the template node and update style (which is element within templateElement)
      webComponentClass.templateElement = templateElement;
      this.installStyleInTemplate(webComponentClass);
    },
    "primitiveTemplateComponentRenderAllInstances": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      if(!receiver.templateElement) return false;
      this.renderAllInstances(receiver);
      return this.answerSelf(argCount);
    },
    renderAllInstances: function(webComponentClass, root) {
      if(!root) {
        root = window.document;
      }

      // Render all direct instances
      var templateElement = webComponentClass.templateElement;
      var thisHandle = this;
      root.querySelectorAll(webComponentClass.customTag).forEach(function(instance) {
        thisHandle.renderTemplateOnElement(templateElement, instance);
      });

      // Render all nested instances
      Object.keys(this.nestedTags).forEach(function(nestedTag) {
        root.querySelectorAll(nestedTag).forEach(function(instance) {
          if(instance.shadowRoot) {
            thisHandle.renderAllInstances(webComponentClass, instance.shadowRoot);
          }
        });
      });
    },
    renderTemplateOnElement: function(templateElement, element) {

      // Remove existing content
      var shadowRoot = element.shadowRoot;
      while(shadowRoot.firstChild) {
        shadowRoot.firstChild.remove();
      }

      // Set new content using a copy of the template to prevent changes (by others) to persist
      shadowRoot.appendChild(templateElement.cloneNode(true));
    },

    // TemplateComponent instance methods
    "primitiveTemplateComponentEnsureShadowRoot": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var domElement = receiver.domElement;
      if(!domElement) return false;
      this.ensureShadowRoot(receiver.sqClass, domElement);
      return this.answerSelf(argCount);
    },

    // Update process
    runUpdateProcess: function() {
      let thisHandle = this;
      window.requestAnimationFrame(function() {
        var start = performance.now();
        thisHandle.handleEvents();
        // The total time spent in an animation frame should not be more than 16.666 ms.
        // Keep a little extra room and therefor limit execution to 16ms.
        // Transitions are less important than event handling.
        thisHandle.handleTransitions(start + 16);
        thisHandle.runUpdateProcess();
      });
    },
    handleEvents: function() {
      if(this.eventHandlerProcess && this.eventsReceived.length > 0) {
var start = null;
if(window.sessionStorage.getItem("DEBUG")) start = performance.now();
        this.runUninterrupted(this.eventHandlerProcess);
if(start !== null) console.log("Event handler took " + (performance.now() - start) + "ms");
      }
    },

    // Event handling
    makeStEvent: function(eventObject) {

      // Create new instance and connect original event
      let event = eventObject.event;
      let eventDefinition = this.eventDefinitions[event.type];
      let newEvent = this.interpreterProxy.vm.instantiateClass(eventDefinition.eventClass, 0);
      newEvent.event = event;

      // Set event properties
      let primHandler = this.primHandler;
      eventDefinition.instVarNames.forEach(function(instVarName, index) {
        let value = eventObject.specials[instVarName];
        if(value === undefined) {
          value = event[instVarName];
        }
        if(value !== undefined && value !== null) {
          newEvent.pointers[index] = primHandler.makeStObject(value);
        }
      });

      return newEvent;
    },
    preventDefaultEventHandling: function() {
      let body = window.document.body;

      // Prevent default behavior for number of events
      [
        "contextmenu",
        "dragstart"	// Prevent Firefox (and maybe other browsers) from doing native drag/drop
      ].forEach(function(touchType) {
        body.addEventListener(
          touchType,
          function(event) {
            event.preventDefault();
          }
        );
      });
    },
    findInterestedElements: function(event) {
      let type = event.type;
      let elements = [];

      // Start searching for elements using composedPath because of shadow DOM
      let composedPath = (event.composedPath && event.composedPath()) || [];
      if(composedPath.length > 0) {
        let index = 0;
        let node = composedPath[index];
        while(node) {

          // Keep first element which is interested
          if(node.__cp_events && node.__cp_events.has(type)) {
            elements.push(node);
          }
          node = composedPath[++index];
        }
      } else {
        let node = event.target;
        while(node) {

          // Keep first element which is interested
          if(node.__cp_events && node.__cp_events.has(type)) {
            elements.push(node);
          }
          node = node.parentElement;
        }
      }

      // For mouse events, add elements which are beneath the current pointer.
      // Browsers don't do this by default. When an HTML element is directly
      // under the pointer, only this element and its predecessors are taken
      // into account. If HTML elements overlap because of positioning/placement
      // the elements beneath the top elements are out of luck. Let's show some
      // love and add them to the party of interested elements.
      // Check for MouseEvent using duck-typing (do NOT use pageX and pageY here
      // since some browsers still have these properties on UIEvent, see
      // https://docs.w3cub.com/dom/uievent/pagex).
      if(event.offsetX !== undefined && event.offsetY !== undefined) {
        document.elementsFromPoint(event.pageX, event.pageY).forEach(function(element) {
          if(element.__cp_events && element.__cp_events.has(type) && !elements.includes(element)) {
            // Find correct position within structure (leaf elements first, root element last).
            // Find common element (towards leafs and put new element directly after it).
            let commonElement = element.parentElement;
            let index = -1;
            while(commonElement && index < 0) {
              index = elements.indexOf(commonElement);
              commonElement = commonElement.parentElement;
            }
            if(index < 0) {
              elements.push(element);
            } else {
              elements.splice(index, 0, element);
            }
          }
        });
      }

      var thisHandle = this;
      return elements.map(function(element) { return thisHandle.instanceForElement(element); });
    },
    findTarget: function(event) {

      // Start searching for target using composedPath because of shadow DOM
      let composedPath = (event.composedPath && event.composedPath()) || [];
      if(composedPath.length > 0) {
        return this.instanceForElement(composedPath[0]);
      } else {
        return this.instanceForElement(event.target);
      }
      return null;
    },
    addEvent: function(event) {

      // Add event object with a few special properties.
      // The modifiers property is added as a convenience to access all
      // modifiers through a single value.
      let eventObject = {
        event: event,
        specials: {
          modifiers:
            (event.altKey ? 1 : 0) +
            (event.ctrlKey ? 2 : 0) +
            (event.metaKey ? 4 : 0) +
            (event.shiftKey ? 8 : 0),
          // Fix 'issue' with click event because 'buttons' are not registered
          buttons: (event.type === "click" && event.detail > 0 ? ([ 1, 4, 2, 8, 16 ][event.button] || 1) : event.buttons),
          target: this.findTarget(event),
          elements: this.findInterestedElements(event),
          currentElementIndex: 1
        }
      };

      // Add or replace last event (if same type replace events as throttling mechanism)
      let type = event.type;
      if(this.eventsReceived.length > 0 && this.eventsReceived[this.eventsReceived.length - 1].event.type === type && this.throttleEventTypes.includes(type)) {
        this.eventsReceived[this.eventsReceived.length - 1] = eventObject;
      } else {
        this.eventsReceived.push(eventObject);
      }
    },
    handleEvent: function(event) {

      // Prevent the event from propagation (bubbling in this case).
      // This will be handled in the Smalltalk code itself.
      event.stopImmediatePropagation();

      // Add the event to the collection of events to handlee
      this.addEvent(event);

      // Directly handle the available events
      if(!this.throttleEventTypes.includes(event.type)) {
        this.handleEvents();
      }
    },

    // Event class methods
    "primitiveEventRegisterProcess:": function(argCount) {
      if(argCount !== 1) return false;
      this.eventHandlerProcess = this.interpreterProxy.stackValue(0);
      return this.answerSelf(argCount);
    },
    "primitiveEventRegisterClass:forType:": function(argCount) {
      if(argCount !== 2) return false;
      let type = this.interpreterProxy.stackValue(0).asString();
      let eventClass = this.interpreterProxy.stackValue(1);
      eventClass.type = type;
      this.eventDefinitions[type] = {
        eventClass: eventClass,
        instVarNames: eventClass.allInstVarNames()
      };
      return this.answerSelf(argCount);
    },
    "primitiveEventAddListenerTo:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var element = this.interpreterProxy.stackValue(0);
      var domElement = element.domElement;
      if(!domElement) return false;
      var eventName = receiver.type;
      if(!domElement.__cp_events) {
        domElement.__cp_events = new Set();
      }
      domElement.__cp_events.add(eventName);
      domElement.__cp_element = element;
      var thisHandle = this;
      domElement.addEventListener(eventName, function(event) {
        if(thisHandle.preventDefaultEventTypes.includes(event.type)) {
          event.preventDefault();
        }
        thisHandle.handleEvent(event);
      });
      return this.answerSelf(argCount);
    },
    "primitiveEventIsListenedToOn:": function(argCount) {
      if(argCount !== 1) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var element = this.interpreterProxy.stackValue(0);
      var domElement = element.domElement;
      if(!domElement) return false;
      var eventName = receiver.type;
      return this.answer(argCount, !!(domElement.__cp_events && domElement.__cp_events.has(eventName)));
    },
    "primitiveEventLatestEvents": function(argCount) {
      if(argCount !== 0) return false;

      // Answer event list and create empty list for future events
      var thisHandle = this;
      var result = this.primHandler.makeStArray(this.eventsReceived
        .map(function(event) {
          return thisHandle.makeStEvent(event);
        })
      );
      this.eventsReceived = [];

      return this.answer(argCount, result);
    },

    // Event instance methods
    "primitiveEventPreventDefault": function(argCount) {
      if(argCount !== 0) return false;
      var receiver = this.interpreterProxy.stackValue(argCount);
      var event = receiver.event;
      if(event) {
        event.preventDefault();
      }
      return this.answerSelf(argCount);
    },

    // Transition class methods
    "primitiveTransitionRegisterProcess:": function(argCount) {
      if(argCount !== 1) return false;
      this.transitionProcess = this.interpreterProxy.stackValue(0);
      this.transitionStartTick = performance.now();
      return this.answerSelf(argCount);
    },
    "primitiveTransitionTickCount": function(argCount) {
      if(argCount !== 0) return false;
      return this.answer(argCount, Math.ceil(performance.now() - this.transitionStartTick));
    },
    handleTransitions: function(endTime) {
      this.runUninterrupted(this.transitionProcess, endTime);
    }
  };
}

function registerCpDOMPlugin() {
    if(typeof Squeak === "object" && Squeak.registerExternalModule) {
        Squeak.registerExternalModule("CpDOMPlugin", CpDOMPlugin());
    } else self.setTimeout(registerCpDOMPlugin, 100);
};

registerCpDOMPlugin();

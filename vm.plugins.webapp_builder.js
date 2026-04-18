"use strict";

// This plugin contains the necessary Browser objects to allow a webapp
// to be build using a Node.js runtime environment (i.e. without the
// need for a Browser).
//
// Only the minimal required methods are implemented. Most are no-op
// methods. Just enough to let the image load.
// This prevents the need to use a full Virtual DOM implementation.
//
// The Classes and methods are created using a trial and error approach,
// running the image and adding those elements which were missing.
// At some point a few methods might have been added which, after a little
// refactoring in the client code, might not be required anymore.
// Decided to not try and validate all are required.

// Adding Browser specific classes
globalThis.BrowserHeaders = class extends Object {
	constructor(headers) {
		super();
		this.headers = headers || {};
	}

	// Methods
	get(name) {
		return this.headers[name];
	}
	set(name, value) {
		this.headers[name] = value;
	}
};

globalThis.BrowserResponse = class extends Object {
	constructor(contentType) {
		super();
		this.headers = new BrowserHeaders({
			"Content-Type": contentType
		});
	}

	// Properties
	get status() {
		return 200;
	}

	// Methods
	text() {
		return new Promise(function(resolve, reject) {
			resolve("");
		});
	}
	json() {
		return new Promise(function(resolve, reject) {
			resolve({});
		});
	}
};

globalThis.ClassList = class extends Object {
	// Methods
	add(name) {
		// Ignore
	}
	contains(name) {
		return false;
	}
	remove(name) {
		// Ignore
	}
};

globalThis.CustomElementRegistry = class extends Object {
	constructor() {
		super();
		this.defines = {};
	}

	// Methods
	define(tagName, customClass) {
		this.defines[tagName] = customClass;
		customClass.localName = tagName;
	}
	get(tagName) {
		return this.defines[tagName];
	}
	upgrade(element) {
		// Add a localName property to the element
		let thisHandle = this;
		Object.keys(this.defines).forEach(function(key) {
			if(thisHandle.defines[key] == element.constructor) {
				element.localName = key;
			}
		});
	}
	whenDefined(tagName) {
		return new Promise(function(resolve, reject) {
			return resolve(null);
		});
	}
};

globalThis.DOMParser = class extends Object {
	// Methods
	parseFromString(str) {
		return new TemplateWrapperElement();
	}
};

globalThis.HTMLElement = class extends Object {
	constructor(tagName) {
		super();
		this.classList = new ClassList();
		this.localName = tagName;
		this.style = new Style();
	}

	// Properties
	get activeElement() {
		return this;
	}
	get children() {
		return [];
	}
	get childNodes() {
		return [];
	}
	get lastChild() {
		return null;
	}
	get parentElement() {
		return this;
	}
	get parentNode() {
		return this;
	}
	get shadowRoot() {
		return this;
	}

	// Methods
	addEventListener(event, func) {
		// Ignore
	}
	appendChild(element) {
		return this;
	}
	attachShadow(options) {
		return this;
	}
	cloneNode(deep) {
		return this;
	}
	getAttribute(name) {
		return null;
	}
	getElementById(id) {
		return this;
	}
	insertBefore(element, refElement) {
		return this;
	}
	querySelector(selector) {
		return this;
	}
	querySelectorAll(selector) {
		return [];
	}
	removeAttribute(name) {
		// Ignore
	}
	removeChild(element) {
		// Ignore
	}
	replaceChild(replacementElement, childElement) {
		return this;
	}
	setAttribute(name, value) {
		// Ignore
	}
};

globalThis.Document = class extends HTMLElement {
	constructor() {
		super();
		this.localName = "document";
	}

	// Properties
	get body() {
		return this;
	}
	get firstElementChild() {
		return null;
	}
	get head() {
		return this;
	}

	// Methods
	createElement(tagName) {
		return new HTMLElement(tagName);
	}
	createElementNS(namespace, tagName) {
		return new HTMLElement(tagName);
	}
	createTextNode(text) {
		return null;
	}
};

globalThis.Navigator = class extends Object {
	constructor() {
		super();
		this.language = 'en';
	}
};

globalThis.Storage = class extends Object {
	constructor() {
		super();
		this.dictionary = {};
	}

	// Methods
	getItem(name) {
		return this.dictionary[name];
	}
	setItem(name, value) {
		this.dictionary[name] = value;
	}
	removeItem(name) {
		delete this.dictionary[name];
	}
};

globalThis.Style = class extends Object {
	// Methods
	getPropertyValue(name) {
		return null;
	}
	removeProperty(name) {
		// Ignore
	}
	setProperty(name, value) {
		// Ignore
	}
};

globalThis.TemplateElement = class extends HTMLElement {
	// Properties
	get content() {
		return new HTMLElement("div");
	}
};

globalThis.TemplateWrapperElement = class extends HTMLElement {
	// Methods
	querySelector(selector) {
		return new TemplateElement();
	}
};

globalThis.Window = class extends Object {
	constructor() {
		super();
		this.customElements = new CustomElementRegistry();
		this.document = new Document();
		this.localStorage = new Storage();
	}

	// Methods
	addEventListener(event, func) {
		// Ignore
	}
	fetch(url, options) {
		return new Promise(function(resolve, reject) {
			resolve(new BrowserResponse(url.startsWith("/api/") ? "application/json" : "image/svg+xml"))
		});
	}
	requestAnimationFrame(func) {
		// Ignore
	}
};

// Ensuring the relevant Window properties and methods are part of the globalThis
// since in Browsers the window object is the globalThis
globalThis.window = globalThis;
globalThis.origFetch = globalThis.fetch;

let globalWindow = new Window();
Object.keys(globalWindow).forEach(function(key) {
	globalThis[key] = globalWindow[key];
});
Object.getOwnPropertyNames(Window.prototype).forEach(function(key) {
	if(key !== "constructor") {
		globalThis[key] = globalWindow[key];
	}
});

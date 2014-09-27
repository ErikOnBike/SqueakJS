SqueakJS: A Lively Squeak VM
============================

This GitHub repository contains mainly the interpreter. The HTML user interface is written using the Lively Kernel.
The "demo" directory contains a bare-bones html page, just enough to run the VM, and a "mini.image" (a stripped-down Squeak 2.2).
The "etoys" directory has an html page to run an Etoys image from an external server, and "scratch" runs a Scratch image.
Please visit the [project home page][homepage]!

Running it
----------
**Simplest**

* [click here][simple] to run a minimal version. This is the simple demo included in this repo.
* or [click here][etoys] to run Etoys. Everything except the image is in this repo.
* or [here][scratch] for Scratch, also in here.
* Go to the [full SqueakJS][full] page with the Lively interface.

**Run your own Squeak image**

* Drag an image from your local files into the [simple][simple] or [Lively][full] page.

**Which Browser**

All modern browsers should work (Chrome, Safari, IE, FireFox), though Chrome performs best currently. Safari on iPad works somewhat. YMMV.
Fixes to improve browser compatibility are highly welcome!


Installing locally
------------------
**Without Lively (simpler)**

* download and unpack the [ZIP archive][zip] (or clone the [github repo][repo])
* serve the SqueakJS directory using a local web server.
  TIP:If you have python try out something like
  ```python
  python -m SimpleHTTPServer 9090
  ```        
  
* in your web browser, open the SqueakJS/demo/simple.html file

Now Squeak should be running.
The reason for having to run from a web server is because the mini.image is loaded with an XMLHttpRequest which does not work with a file URL.

**In Lively (nicer)**

* install [Lively][lively]
* inside the Lively directory, make a "users/bert" folder and put the SqueakJS directory there
* open the blank.html page using your web browser
* get a Squeak morph from the PartsBin
* save the world under a different name 

How to modify it
----------------
**In Lively**

* if you installed with Lively, use that to change the code
* all changes take effect immediately

**Without Lively**

* use any text editor
* you have to reload the page for your changes to take effect

How to share your changes
-------------------------
* easiest for me is if you create a [pull request][pullreq]
* otherwise, send me patches, or a Lively Changeset

Contributions are very welcome! 

Things to work on
-----------------
SqueakJS is intended to run any Squeak image. It can already load anything from the original 1996 Squeak release to the latest 2014 release. But many pieces (primitives in various plugins) are still missing, in particular media support (sound in/output, MIDI, 3D graphics, Scratch effects) and networking (Socket plugin). 

As for optimizing I think the way to go is an optimizing JIT compiler. Since we can't access or manipulate the JavaScript stack, we might want that compiler to inline as much as possible, but keep the call sequence flat so we can return to the browser at any time. To make BitBlt fast, we could probably use WebGL. Besides, there is the obvious not-yet-implemented primitives which fall back to slow Smalltalk code (LargeIntegers, compression/decompression, string search etc).

There's also interesting stuff I probably won't be working on. Like a kind-of FFI that lets you call Javascript libraries directly. Or a plugin that gives you access to the DOM (I do have the mechanism for VM plugins in place already). With that you could write a native HTML UI which would certainly be much faster than BitBlt.

Networking would be interesting, too. How about implementing the SocketPlugin via WebSockets? Parallelize the VM with WebWorkers?

There's a gazillion exciting things to do :)

  --  Bert Freudenberg, September 2014

  [repo]:     https://github.com/bertfreudenberg/SqueakJS
  [homepage]: http://bertfreudenberg.github.io/SqueakJS/
  [simple]:   http://bertfreudenberg.github.io/SqueakJS/demo/simple.html
  [etoys]:    http://bertfreudenberg.github.io/SqueakJS/etoys/
  [scratch]:  http://bertfreudenberg.github.io/SqueakJS/scratch/
  [full]:     http://lively-web.org/users/bert/squeak.html
  [zip]:      https://github.com/bertfreudenberg/SqueakJS/archive/master.zip
  [lively]:   https://github.com/LivelyKernel/LivelyKernel
  [pullreq]:  https://help.github.com/articles/using-pull-requests
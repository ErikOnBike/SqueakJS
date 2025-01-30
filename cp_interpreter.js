// Custom interpreter for CodeParadise

Object.extend(Squeak,
  'running', {
    runImage: function(imageData, imageName) {

      // Show build number
      console.log("Running SqueakJS VM (build " + Squeak.vmBuild + ")");

      // Create Squeak image from raw data
      var image = new Squeak.Image(imageName);
      image.fixFloat();
      image.readFromBuffer(imageData, function startRunning() {

        // Create fake display and create interpreter
        var display = { vmOptions: [ "-vm-display-null", "-nodisplay" ] };
        var vm = new Squeak.Interpreter(image, display);
        vm.interpreterIsRunning = false;
        vm.interpreterRestartTimeout = null;
        vm.runInterpreter = function(restart) {

          // Handle restart while already running
          if(restart && vm.interpreterIsRunning) {

            // If restarting while in timeout waiting, skip waiting
            if(vm.interpreterRestartTimeout) {
              globalThis.clearTimeout(vm.interpreterRestartTimeout);
              vm.interpreterRestartTimeout = null;
            }
          }
          try {
            // Keep track of active Process if it should run synchronously
            var syncProcess = vm.activeProcess();
            if(!syncProcess.isSync) {
              syncProcess = undefined;
            }
            vm.isIdle = false;
            vm.interpreterIsRunning = true;
            var compiled;
            if(syncProcess) {
              // Run the interpreter until another Process becomes the active one
              do {
                if(compiled = vm.method.compiled) {
                  compiled(vm);
                } else {
                  vm.interpretOneSistaWithExtensions(false, 0, 0);
                }
              } while(syncProcess && syncProcess === vm.activeProcess());

              // Check if interpreter remains in a sync Process, in which case it
              // should return immediately to allow the calling Process to continue.
              if(vm.activeProcess().isSync) {
                return;
              }
            } else {
              // Run the interpreter for max duration or until becoming idle
              var interpreterMaxTime = performance.now() + 50;
              do {
                if(compiled = vm.method.compiled) {
                  compiled(vm);
                } else {
                  vm.interpretOneSistaWithExtensions(false, 0, 0);
                }
              } while(performance.now() < interpreterMaxTime && !vm.isIdle);
            }

            // Stop execution if the idle Process is reached, meaning nothing left to execute.
            // New events might awaken an existing Process. The interpreter will be restarted then.
            if(vm.inIdleProcess()) {
              vm.interpreterIsRunning = false;
            } else {

              // Restart the interpreter shortly, but give environment some breathing space
              vm.interpreterRestartTimeout = globalThis.setTimeout(vm.runInterpreter, 10);
            }
          } catch(e) {
            console.error("Failure during Squeak run: ", e);
          }
        };

        // Start the interpreter
        vm.runInterpreter();
      });
    }
  }
);

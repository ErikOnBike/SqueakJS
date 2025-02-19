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

          // If restarting while in timeout waiting, skip waiting
          if(restart && vm.interpreterRestartTimeout) {
            if(vm.interpreterRestartTimeout !== 'defer') {
              globalThis.clearTimeout(vm.interpreterRestartTimeout);
              vm.interpreterRestartTimeout = 'defer';
            }
          } else {
            vm.interpreterRestartTimeout = null;
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
              } while(syncProcess === vm.activeProcess());

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
            if(vm.interpreterRestartTimeout !== 'defer' && vm.inIdleProcess()) {
              vm.interpreterIsRunning = false;
              vm.interpreterRestartTimeout = null;
            } else {

              // Restart the interpreter shortly, but give environment some breathing space.
              // The is running flag remains up while sleeping.
              vm.interpreterRestartTimeout = globalThis.setTimeout(vm.runInterpreter, 10);
            }
          } catch(e) {
            console.error("Failure during Squeak run: ", e);
          }
        };
        vm.deferRunInterpreter = function() {
          // If we already have defer, keep it and just start new run (after 0 delay)
          if(vm.interpreterRestartTimeout === 'defer') {
            globalThis.setTimeout(function() {
              vm.runInterpreter(true);
            }, 0);
            return;
          }

          // Remove any pending 'regular' timeout
          if(vm.interpreterRestartTimeout) {
            globalThis.clearTimeout(vm.interpreterRestartTimeout);
            vm.interpreterRestartTimeout = null;
          }

          // Start the interpreter on the next tick
          globalThis.setTimeout(function() {
            vm.runInterpreter(true);
          }, 0);
        };

        // Start the interpreter
        vm.runInterpreter();
      });
    }
  }
);

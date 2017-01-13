var Gpio = require('onoff').Gpio,
led = new Gpio(18, 'out');
var iv = setInterval(function(){
led.writeSync(led.readSync() === 0 ? 1 : 1)
}, 500);


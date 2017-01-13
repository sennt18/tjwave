var pigpio = require('pigpio')
pigpio.initialize();


var watson = require('watson-developer-cloud');
var config = require('./config');
var speech_to_text = watson.speech_to_text({
  username: config.STTUsername,
  password: config.STTPassword,
  version: config.version
});

var fs = require('fs');
var exec = require('child_process').exec;
var text_to_speech = watson.text_to_speech({
  username: config.TTSUsername,
  password: config.TTSPassword,
  version: 'v1'
});

var AudioContext = require('web-audio-api').AudioContext
context = new AudioContext
var _ = require('underscore');

//end credentials

var mic = require('mic');
var micInstance = mic({ 'rate': '44100', 'channels': '2', 'debug': false, 'exitOnSilence': 6 });
var micInputStream = micInstance.getAudioStream();

micInputStream.on('data', function(data) {
  //console.log("Recieved Input Stream: " + data.length);
});

micInputStream.on('error', function(err) {
  console.log("Error in Input Stream: " + err);
});

micInputStream.on('silence', function() {
  // detect silence.
});
micInstance.start();
console.log("TJ is listening, you may speak now.");

//end mic setup

var textStream = micInputStream.pipe(
  speech_to_text.createRecognizeStream({
    content_type: 'audio/l16; rate=44100; channels=2'
  })
);

//converting speech to text

textStream.setEncoding('utf8');
textStream.on('data', function(str) {
  console.log(' ===== Speech to Text ===== : ' + str); // print each text we receive
  parseText(str);
});

textStream.on('error', function(err) {
  console.log(' === Watson Speech to Text : An Error has occurred ===== \nYou may have exceeded your payload quota.') ; // handle errors
  console.log(err + "\n Press <ctrl>+C to exit.") ;
});

function parseText(str){
  var redlighton = str.indexOf("on") >= 0 && str.indexOf("red") >= 0  ;
  var greenlighton = str.indexOf("on") >= 0 && str.indexOf("green") >= 0  ;
  var bluelighton = str.indexOf("on") >= 0 && str.indexOf("blue") >= 0  ;
  var lightoff = str.indexOf("off")  ;

  if (redlighton) {
    speak("Okay. Here you go.");
    led = new Gpio(17, 'out');
  }else if (greenlighton){
    speak("Here is green.");
    led = new Gpio(18, 'out');
  }else if (bluelighton){
    speak("Good choice. I like the color blue too.");
    led = new Gpio(27, 'out');
  }else if (lightoff){
    speak("If you insist.")
    led.writeSync(0);
  }else{
    if (str.length > 10){
      speak("Sorry. Could you say that command again?")
    }
  }
}


/*
var Gpio = require('onoff').Gpio,
led = new Gpio(18, 'out');
var iv = setInterval(function(){
led.writeSync(led.readSync() === 0 ? 1 : 0)
}, 500);
// Stop blinking the LED and turn it off after 5 seconds.
setTimeout(function() {
clearInterval(iv); // Stop blinking
led.writeSync(0);  // Turn LED off.
led.unexport();    // Unexport GPIO and free resources
}, 5000);

// Gpio17=red, Gpio27=blue, Gpio18=green

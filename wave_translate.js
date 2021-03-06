/************************************************************************
* Step #1: LED Config
*************************************************************************/

var ws281x = require('rpi-ws281x-native');
var NUM_LEDS = 1;        // Number of LEDs
ws281x.init(NUM_LEDS);   // initialize LEDs

var color = new Uint32Array(NUM_LEDS);  // array that stores colors for leds
color[0] = 0xffffff;                    // default to white

// note that colors are specified as Green-Red-Blue, not Red-Green-Blue
// e.g. 0xGGRRBB instead of 0xRRGGBB
var colorPalette = {
    "red": 0x00ff00,
    "read": 0x00ff00, // sometimes, STT hears "read" instead of "red"
    "green": 0xff0000,
    "blue": 0x0000ff,
    "purple": 0x008080,
    "yellow": 0xffff00,
    "magenta": 0x00ffff,
    "orange": 0xa5ff00,
    "aqua": 0xff00ff,
    "white": 0xffffff,
    "off": 0x000000,
    "on": 0xffffff
}

/************************************************************************
* Step #1: Configuring your Bluemix Credentials
*************************************************************************/

var pigpio = require('pigpio')
pigpio.initialize();

var watson = require('watson-developer-cloud');
var config = require('./config');  // gets our username and passwords from the config.js files
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

var LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2');
var language_translator = new LanguageTranslatorV2({
  username: config.TUsername,
  password: config.TPassword,
  url: 'https://gateway.watsonplatform.net/language-translator/api/'
});

var AudioContext = require('web-audio-api').AudioContext
context = new AudioContext
var _ = require('underscore');

/************************************************************************
* Step #2: Configuring the Microphone
*************************************************************************/

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
ws281x.render(0xffffff);

/************************************************************************
* Step #3: Converting your Speech Commands to Text
*************************************************************************/

var textStream = micInputStream.pipe(
  speech_to_text.createRecognizeStream({
    content_type: 'audio/l16; rate=44100; channels=2'
  })
);

/*********************************************************************
* Step #4: Parsing the Text
**********************************************************************/

textStream.setEncoding('utf8');
textStream.on('data', function(str) {
  console.log(' ===== Speech to Text ===== : ' + str);
  parseText(str);
});

textStream.on('error', function(err) {
  console.log(' === Watson Speech to Text : An Error has occurred ===== \nYou may have exceeded your payload quota.') ;
  console.log(err + "\n Press <ctrl>+C to exit.") ;
});

function parseText(str){
  var containsWaveArm = (str.indexOf("raise") >= 0 || str.indexOf("weave") >= 0 || str.indexOf("wave") >= 0 || str.indexOf("wait") >= 0 || str.indexOf("leave") >= 0 ) && (  str.indexOf("arm") >= 0) ;
  var introduceYourself = str.indexOf("introduce") >= 0 && str.indexOf("yourself") >= 0  ;
  var whatisYourname = str.indexOf("what") >= 0 && str.indexOf("your") >= 0 && str.indexOf("name") >= 0  ;
  var introductions = str.indexOf("my") >= 0 && str.indexOf("name") >= 0 && str.indexOf("is") >= 0  ;
  var canYouDance = str.indexOf("can") >= 0 && str.indexOf("you") >= 0 && str.indexOf("dance") >= 0  ;
  var containsTurn = str.indexOf("turn") >= 0;
  var containsChange = str.indexOf("change") >= 0;
  var containsSet = str.indexOf("set") >= 0;
  var containsLight = str.indexOf("light") >= 0;
  var containsDisco = str.indexOf("disco") >= 0; 
  var translate = str.indexOf("translate") >= 0;

  if (containsWaveArm) {
    ws281x.render(0xff0000);
    speak("I would love to wave my arm.");
    waveArm("wave") ;
  }else if (introduceYourself){
    ws281x.render(0xff0000);
    speak(" Hi, my name is TJ Bot, but you can call me TJ.");
  }else if (whatisYourname){
    ws281x.render(0xff0000)
    speak(" My name is TJ Bot. You can call me TJ");
  }else if (introductions){
    ws281x.render(0xff0000)
    speak(" Hi. My name is TJ.");
  }else if (canYouDance){
    discoParty();
    dance();
  }else if ((containsTurn || containsChange || containsSet) && containsLight) {
    setLED(str);
  }else if (containsDisco) {
    discoParty();
  }else if (translate) {
    ws281x.render(0xff0000)
    translatetext(str);
  }else{
    if (str.length > 10){
      ws281x.render(0x00ff00)
      speak("Sorry. Could you repeat that?")
    }
  }
}

/*********************************************************************
* Step #5: Wave Arm
**********************************************************************/

var mincycle = 500; var maxcycle = 2300 ;
var dutycycle = mincycle;
var iswaving = false ;

function waveArm(action) {
  iswaving = true ;
  var Gpio = pigpio.Gpio;
  var motor = new Gpio(7, {mode: Gpio.OUTPUT});
  var times =  8 ;
  var interval = 700 ;

  if (action == "wave") {
    var pulse = setInterval(function() {
      motor.servoWrite(maxcycle);
      setTimeout(function(){
        if (motor != null) {
          motor.servoWrite(mincycle);
        }
      }, interval/3);

      if (times-- === 0) {
        clearInterval(pulse);
        if (!isplaying) {
          setTimeout(function(){
            micInstance.resume();
            iswaving = false ;
          }, 500);
        }
        return;
      }
    }, interval);
  }else {
    motor.servoWrite(maxcycle);
    setTimeout(function(){
      motor.servoWrite(mincycle);
    }, 400);
  }
}

/*********************************************************************
* Step #6: Convert Text to Speech and Play
**********************************************************************/

var Sound = require('node-aplay');
var soundobject ;
function speak(textstring){

  micInstance.pause();
  var params = {
    text: textstring,
    voice: config.ENvoice,
    accept: 'audio/wav'
  };
  text_to_speech.synthesize(params).pipe(fs.createWriteStream('output.wav')).on('close', function() {

    soundobject = new Sound("output.wav");
    soundobject.play();
    soundobject.on('complete', function () {
      console.log('Done with playback! for ' + textstring + " iswaving " + iswaving);
      if (!iswaving && !isplaying) {
        micInstance.resume();
      }
    });
  });
}

function speakES(textstring){

  micInstance.pause();
  var params = {
    text: textstring,
    voice: config.ESvoice,
    accept: 'audio/wav'
  };
  text_to_speech.synthesize(params).pipe(fs.createWriteStream('output.wav')).on('close', function() {

    soundobject = new Sound("output.wav");
    soundobject.play();
    soundobject.on('complete', function () {
      console.log('Done with playback! for ' + textstring + " iswaving " + iswaving);
      if (!iswaving && !isplaying) {
        micInstance.resume();
      }
    });
  });
}

/*********************************************************************
* Piece #7: Dance to a Song
**********************************************************************/

var pcmdata = [] ;
var samplerate ;
var soundfile = "sounds/club.wav"
var threshodld = 0 ;

function decodeSoundFile(soundfile){
  console.log("decoding mp3 file ", soundfile, " ..... ")
  fs.readFile(soundfile, function(err, buf) {
    if (err) throw err
    context.decodeAudioData(buf, function(audioBuffer) {
      console.log(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate, audioBuffer.duration);
      pcmdata = (audioBuffer.getChannelData(0)) ;
      samplerate = audioBuffer.sampleRate;
      findPeaks(pcmdata, samplerate);
      playsound(soundfile);
    }, function(err) { throw err })
  })
}

function dance(){
  speak("I would love to. Let me play a song to dance to.") ;
  decodeSoundFile(soundfile);
}

var isplaying = false ;
function playsound(soundfile){
  isplaying = true ;
  music = new Sound(soundfile);
  music.play();
  music.on('complete', function () {
    console.log('Done with music playback!');
    isplaying = false;
  });
}

function findPeaks(pcmdata, samplerate, threshold){
  var interval = 0.05 * 1000 ; index = 0 ;
  var step = Math.round( samplerate * (interval/1000) );
  var max = 0 ;   var prevmax = 0 ;  var prevdiffthreshold = 0.3 ;

  //loop through song in time with sample rate
  var samplesound = setInterval(function() {
    if (index >= pcmdata.length) {
      clearInterval(samplesound);
      console.log("finished sampling sound")
      return;
    }
    for(var i = index; i < index + step ; i++){
      max = pcmdata[i] > max ? pcmdata[i].toFixed(1)  : max ;
    }
    // Spot a significant increase? Wave Arm
    if(max-prevmax >= prevdiffthreshold){
      waveArm("dance");
    }
    prevmax = max ; max = 0 ; index += step ;
  }, interval,pcmdata);
}

/*********************************************************************
 * Step #8: Commands for LED
 **********************************************************************/

function setLED(msg){
    var words = msg.split(" ");
    for (var i = 0; i < words.length; i++) {
        if (words[i] in colorPalette) {
            color[0] = colorPalette[words[i]];
            break;
        }
    }
    ws281x.render(color);
}

function discoParty() {
    for (i = 0; i < 30; i++) {
        setTimeout(function() {
            var colors = Object.keys(colorPalette);
            var randIdx = Math.floor(Math.random() * colors.length);
            var randColor = colors[randIdx];
            setLED(randColor);
        }, i * 250);
    }
}

/************************************************************************
* Step #9: Translate Text
*************************************************************************/

function translatetext(msg) {
  language_translator.translate({
    text: msg.substr (msg.indexOf("translate") +9, msg.length),
    source: 'en',
    target: 'es'
  }, function(err, translation) {
    if (err)
      console.log(err)
    else {
      console.log(translation);
      speakES(translation.translations[0].translation);
    }
  })
}

/************************************************************************
* Step #10: Exit Commands
*************************************************************************/

process.on('SIGINT', function () {
  pigpio.terminate();
  ws281x.reset();
  process.nextTick(function () { process.exit(0); });
});

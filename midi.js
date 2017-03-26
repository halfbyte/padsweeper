/*************************** MIDI STUFF ***************************/
/* (c) 2017 Jan 'halfbyte' Krutisch                               */
/*                                                                */
/******************************************************************/

// inputs outputs
var midiIn, midiOut;
// velocities to send to launchpad for certain colors
var launchpadColors = {
  unexposed: 0x1D, // dimmed ambber
  exploded: 0x0F, // red
  mine: 0x0D, // dimmed red
  flagged: 0x0F, // red
  questioned: 0x0B, // red flashing
  adjacent: [0x0c, 0x1C, 0x2C, 0x3C, 0x2D, 0x3D, 0x3E, 0x3E, 0x3E, 0x3E], // shades of green > yellow
  error: 0x2f // orange
}
// flag mode means pressing buttons flags instead of exposes
// no right click on a button right.
var midiFlagMode = false;

setSqOld = setSq;
function newSetSq(thisSq) {
  setSqOld(thisSq);
  midiSetSq(thisSq);
}
setSq = newSetSq;

initAll = initMIDI;

function launchpadPos(thisSq) {
  var row = Math.floor(thisSq / 8);
  var col = Math.floor(thisSq % 8);
  return row * 16 + col;
}

function noteOnHandler(row, col) {
  var thisSquare = row * 8 + col;
  if (col < 8) {
    // main field
    if (midiFlagMode) {
      // emulate right click
      clickSq({button: 2}, thisSquare);
    } else {
      // emulate normal click
      clickSq({}, thisSquare);
      if (exposed[thisSquare] > unexposed) {
        // show adjacent fields
        midiShowAdjacent(thisSquare);
      }
    }
  } else {
    // rightmost buttons
    if (row === 6) { clickSmiley(); }
    if (row === 7) { midiFlagMode = !midiFlagMode; midiSendNoteOn(120, midiFlagMode ? 0x0B: 0x0F); }
  }
}

function noteOffHandler(row, col) {
  if (col < 8) {
    midiShowMineCount();
  } else {
    // if (row === 7) { midiFlagMode = false; midiSendNoteOn(120, 0x0F); }
  }
}

function midiInputHandler(event) {
  var msg = event.data;
  if (msg[0] !== 144) { return; } // we're only interested in noteon messages

  var row = Math.floor(msg[1] / 16);
  var col = Math.floor(msg[1] % 16);

  if (msg[2] === 127) {
    noteOnHandler(row, col);
  } else if (msg[2] === 0) {
    noteOffHandler(row, col);
  }
}

function midiShowAdjacent(thisSquare) {
  if (!midiOut) { return; }
  var adj = adjacent[thisSquare];
  var i;
  for(i=0;i<8;i++) {
    if (adj > i) {
      midiOut.send([176, 104 + i, launchpadColors.adjacent[i+1]])
    } else {
      midiOut.send([176, 104 + i, launchpadColors.adjacent[0]]);
    }
  }
  for(i=0; i<2;i++) {
    midiSendNoteOn(8, 0x0c);
    midiSendNoteOn(8 + 16, 0x0c);
  }
}

// technically, we could have 8 adjacents, but most I've seen with 10 mines is 5
function midiShowMineCount() {
  if (!midiOut) { return; }
  var i;
  var count = mines - flags;
  console.log("MINES", mines);
  for(i=0;i<8;i++) {
    if (count > i) {
      midiOut.send([176, 104 + i, launchpadColors.adjacent[i+1]])
    } else {
      midiOut.send([176, 104 + i, launchpadColors.adjacent[0]]);
    }
  }
  for(i=0; i<2;i++) {
    if (count - 8 > i) {
      midiSendNoteOn(8 + (i*16), launchpadColors.adjacent[6]);
    } else {
      midiSendNoteOn(8 + (i*16), 0x0c);
    }
  }
}

function midiSendNoteOn(note, vel) {
  if (!midiOut) {return;}
  midiOut.send([144, note, vel]);
}

function midiSetSq(thisSquare) {
  var exp = exposed[thisSquare];
	var className = "sq";
	var s;

  if (exp <= unexposed) {
    // unexposed squares, including flagged or queried
    if (exp == unexposed) {
      // unexposed
      midiSendNoteOn(launchpadPos(thisSquare), launchpadColors.unexposed);
    } else if (exp == flagged) {
      // flagged
      midiSendNoteOn(launchpadPos(thisSquare), launchpadColors.flagged);
    } else {
      // queried
      midiSendNoteOn(launchpadPos(thisSquare), launchpadColors.questioned);
    }
  } else {
    // exposed squares
    var adj = adjacent[thisSquare];
    if (exp == exploded) {
      midiSendNoteOn(launchpadPos(thisSquare), launchpadColors.exploded);
    } else if (exp == incorrect) {
      midiSendNoteOn(launchpadPos(thisSquare), launchpadColors.error);
    } else if (adj == mine) {
      midiSendNoteOn(launchpadPos(thisSquare), launchpadColors.exploded);
    } else {
      midiSendNoteOn(launchpadPos(thisSquare), launchpadColors.adjacent[adj]);
    }
  }
}

function midiInitDisplay() {
  midiOut.send([0xb0, 0, 0]); // RESET
  midiOut.send([0xb0, 00, 0x28]); // Switch Flashing On
  midiSendNoteOn(104, 0x1D);
  midiSendNoteOn(120, 0x0F);
}

function initMIDI() {
  navigator.requestMIDIAccess().then(function(midiAccess) {
    midiAccess.inputs.forEach(function(input) {
      if (input.name === 'Launchpad Mini') {
        midiIn = input;
      }
    });
    midiAccess.outputs.forEach(function(output) {
      if (output.name === 'Launchpad Mini') {
        midiOut = output;
      }
    });
    if (midiIn && midiOut) {
      midiIn.addEventListener('midimessage', midiInputHandler);
      midiInitDisplay();
    }
    init(8, 64, 10);
    midiShowMineCount();
  });
}

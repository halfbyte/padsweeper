# Minesweeper for Launchpad

A small experiment to bring minesweeper to the novation launchpad mini

# Credits

Original minesweeper implementation by Andrew D. Birrell (see https://birrell.org/andrew/minesweeper/)

# Implementation notes

- I've tried to add the MIDI stuff as unobtrusive as possible, which involves weird function wrapping at some points
- It only runs on Launchpad mini due to the way I query the MIDI devices. It's easy to adjust, though.
- Since I don't send SysEx to the device, it works via file:// protocol, so you can just check out 
  or download the code and open index.html in a browser.
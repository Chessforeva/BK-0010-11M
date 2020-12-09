
KeyMapper = function()
{
  var self = this;
  
  var /*int*/nextEvent = 0;
  var /*int*/nextKey = -1;
  var /*int*/lastKey = -1;
  var /*boolean*/pressedKey = false;
  var /*boolean*/capsLocked = false;
  var rus = false;
  

  this.setRus = function() { pushKey(14); rus = true; }	/*RUS*/
  this.setLat = function() { pushKey(15); rus = false; } /*LAT*/
  this.isRus = function() { return rus; }
  this.getCaps = function() { return capsLocked; }
  this.Capsed = function() { capsLocked = !capsLocked; }
  
  function /*int*/translateKey(/*KeyEvent*/ e) {
    var /*int*/key = e.keyCode || e.which;

    switch (key)
    {
    case 16: /*Shift*/
     return -1;
    case 17: /*Ctrl*/
	if(e.location==1) self.setRus(); /*RUS*/
	if(e.location==2) self.setLat(); /*LAT*/
     return -1;
    case 18: /*Alt*/
     return -1;
    case 20:
      self.Capsed();
      return -1;
    case 19:
    case 27:
      nextEvent/*STOP*/ |= 1;
      return key;  
    }
    
    var Ob = bkkeys.getMappedKey(key, e.shiftKey||capsLocked, e.altKey, rus);

	/* Object to catch AP2 + 0...9 functional keys case */
    key = Ob.code;
    
    if (key < 0) return -1;
	
    if(!Ob.isAp2)	// to access graphical symbols somehow
	{
	var a = e.altKey, c = e.ctrlKey;
	if(a&&c) key = (255-key)&0xFF>>>0;
	else {
	 if(a) key |= 128;  /*(the most proper, AR2+key also)*/
	 if(c) key |= 64;
	 }
	}
    
    switch (key)
    {
    case 1002:
          nextEvent/*VIDEO MODE*/ |= 2;
	  break;
    case 1004:
          nextEvent/*RESET*/ |= 4;
	  break;  
    }
    return key;
  }
  
  this.key_byCodeHit = function(n)
  {
      nextKey = n;
      lastKey = n;
      pressedKey = true;
  }
  
  this.key_byCodeRelease = function(n) {
    if ((n >= 0) && (n == lastKey))
    {
      nextKey = -1;
      lastKey = -1;
      pressedKey = false;
    }
  }

  /*void*/this.keyHit = function(/*KeyEvent*/e)
  {
    var k = e.keyCode || e.which;

    if (joyMapper.translateKey(e, true)) {
	return;
	}
    
    var /*int*/key = translateKey(e);
     
    if ((key >= 0) && (k != lastKey))
    {
      nextKey = key;
      lastKey = k;
      pressedKey = true;
    }
  }

  /*void*/this.keyRelease = function(/*KeyEvent*/ e) {
    var /*int*/key = e.keyCode || e.which;

    if ((key >= 0) && (key == lastKey))
    {
      nextKey = -1;
      lastKey = -1;
      pressedKey = false;
    }

    joyMapper.translateKey(e, false);

  }

  /*int*/this.pollKey = function() {
    if (!pressedKey) {
      return -1;
    }
    pressedKey = false;
    return nextKey;
  }

  /*boolean*/this.pollKeyHold = function() {
    return (nextKey != -1);
  }

  /*int*/this.pollEvents = function() {
    var /*int*/a = nextEvent;
    nextEvent = 0;
    return a;
  }
  
  return self;
}

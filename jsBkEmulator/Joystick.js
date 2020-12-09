
/* on key press action
 Joystick is NumPad.
 Also wraparounds to get arrow keys act as joystick.
 */

JoystickMapper = function()
{
  var self = this;
  
  var /*boolean[13]*/kD= [];	// keys down

  this.keysubstit = function(code)
  {
	/*
	1)arrows,space,enter ==> NumPad
	2)also NumPad codes when NumLock switched
	*/
    switch (code)
    {
    case 45: code=96; break;
    case 35: code=97; break;
    case 40: code=98; break;
    case 34: code=99; break;
    case 37: code=100; break;
    case 12: code=101; break;
    case 39: code=102; break;
    case 36: code=103; break;
    case 38: code=104; break;
    case 33: code=105; break;
    case 32: code=107; break;
    case 46: code=110; break;
    }
    return code;
  }
  
  this.bk2asc = function(code) {
    switch (code)
    {
    	/* BK arrow, enter,space code ==> NumPad */
    case 8: code=100; break;
    case 26: code=104; break;
    case 25: code=102; break;
    case 27: code=98; break;
    case 10: code=110; break;
    case 32: code=107; break;
    }
    return self.keysubstit(code);
  }

  /*boolean*/this.translateKey = function(/*KeyEvent*/ e, /*boolean*/isDown)
  {
    var /*int*/code = e.keyCode || e.which;

    if(!overJoystick || (code==13))
    {
	if(typeof(e.location)=="undefined") return false;	//?wtf
 	
	if(e.location!=3) return false;	// NumPad keys only
    }

    code = self.keysubstit(code);
    
    switch (code)
    {
    /*Numpad 0-9*/
    case 96: 
    case 97: 
    case 98: 
    case 99: 
    case 100: 
    case 101: 
    case 102:
    case 103:
    case 104:
    case 105:
      kD[(code - 96)] = isDown;
      return true;
    case 110/*NumPad . Del*/:
      kD[10/*DOT*/] = isDown;
      return true;
    case 107/*Numpad + */:
      kD[12/*PLUS*/] = isDown;
      return true;
    case 13:
      kD[11/*ENTER*/] = isDown;
      return true;      
    }

    return false;
  }

  /*int*/this.getJoystickState = function() {
  
    var /*int*/state = 0;
    if (kD[7] || kD[8] || kD[9]) state |= 1;
    if (kD[1] || kD[2] || kD[3] || kD[5]) state |= 2;
    if (kD[1] || kD[4] || kD[7]) state |= 4;
    if (kD[3] || kD[6] || kD[9]) state |= 8;
    if (kD[0] || kD[12]) state |= 16;
    if (kD[10] || kD[11]) state |= 32;
    return state;
  }
  
  function init()
   {
    for(var i=0;i<13;i++) kD[i]=0;
   }
  init();
  
  return this;
}

/* to read state when memory accessed */

Joystick = function()
{
  var /*int*/state = 0;

  /*void*/this.setState = function(/*int*/newState) {
    state = newState;
  }

  /*short*/this.getIO = function()
  {
    var /*short*/acc = 0;
    if (state & 0x1/*UP*/) acc |= 0x400;
    if (state & 0x2/*DOWN*/) acc |= 0x20;
    if (state & 0x4/*LEFT*/) acc |= 0x200;
    if (state & 0x8/*RIGHT*/)acc |= 0x10;
    if (state & 0x10/*FIRE1*/) acc |= 0x2;
    if (state & 0x20/*FIRE2*/) acc |= 0x1;
    return acc;
  }
  
  return this;
}

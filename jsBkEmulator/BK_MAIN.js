/*

BK emulator,  2018.mar 
 
эмулятор БК-0010-01, БК-0011M

*знания от webmsx.org (круто)
исходн. рекомп. java BK2010 -
 наиболее приятный прогр.текст для портации, минимальный и понятный,
 и 32-бит переменные.

GUI кривой, сил нету, все можно доулучшать :)
 
*/

QBusReadDTO = function(v)
{
  /*short*/this.value = v;
  
  return this;
}


function BKautokeys(pop)
{
 var v = BK_autokeys;
 if(pop) v.shift();
 else if(v.length && v[0]) { pushKey(v[0]); v[0]=0; }
}
function BK_starttape(starter) {
switch(starter) {
case 1://BIN binary file
	/* mo\nm\nm\ns\ns\n */
 BK_autokeys = [ 109,111,10,109,10,109,10,115,10,115,10]; break;
case 2://COD basic text for interpreter
	/* cload"m",r\n" */
 BK_autokeys = [ 99,108,111,97,100,34,109,34,44,114,10]; break;
 } 
}

//--------------------
//  on loaded
//--------------------
function FPSinit()
{
 if(base.DRAW()) {
	FPSloop();
	BK_speed.initTicker();
	}
 else setTimeout('FPSinit()',999);
}

	
//--------------------
// The Main Loop
//--------------------
function FPSloop( onetime )
{
  if( onetime || !BK_speed.anim) {
  
  if( !(base.dsks && fdc.drives.length==0) )	// are we waiting for disk drop?
  {
	// if not then process
	
  var to=cpu.Cycles + BK_speed.cyc;	// bunch of cycles
  
  var d=0;
  /* takes most CPU */
  while(cpu.Cycles<to)
	{
	cpu.exec_insn();
	if(base.FakeTape.prep) base.TapeBinLoader();
	}
	
  base.sound_push(); // sounds

  BK_speed.count();
  
  /*once per loop*/
  base.minimizeCycles();	// avoid extreme numbers
  
  var key = keymap.pollKey();
  if(key==32 && BK_autokeys.length) BK_autokeys = [];  
  
  if (key > -1) base.keyboard_punch(key);
  else base.keyboard_setKeyDown(keymap.pollKeyHold());
  key = keymap.pollEvents();
	
  if (key&1) cpu.nmi();
  if (key&2) base.cycleVideomodes();
  if (key&4) cpu.reset();
  base.joystick_setState(joyMapper.getJoystickState());

  if(key<=0) BKautokeys(0);
  
  base.irq();	// may be little to rare
      
  base.updCanvas();	// little faster ;)
  //base.DRAW();
  
  }
  }
  
  if(!onetime) setTimeout('FPSloop()',1000/BK_speed.fps);	// next loop after
}

Gbin.onGot=function(filename, bytes)
	{
	var f = filename.toUpperCase();
	if(f.indexOf(".ROM")>0) {
		cpu.reset();base.loadROM(bytes);
		}
	if(f.indexOf(".BIN")>0) {
		cpu.reset();
		var o = base.FakeTape;
		o.prep=true; o.filename=filename; o.bytes=bytes;
			/*simply load into memory without monitor*/
		//if(!base.isM()) base.LoadBinFast();
			/*monitor is more accurate*/
		setTimeout('BK_starttape(1)',5000);
		}
	if(f.indexOf(".COD")>0) {
		var o = base.FakeTape;
		o.prep=true; o.filename=filename; o.bytes=bytes;
		setTimeout('BK_starttape(2)',5000);
		}
	if(f.indexOf(".IMG")>0 || f.indexOf(".BKD")>0) {
		var isA = (fdc.drives.length==0);
		if(!base.dsks) base.setFDD11Model();
		fdc.addDisk(filename,bytes);
		if(isA) cpu.reset();
		if(LOADDSK.length>1) {
			LOADDSK = LOADDSK.slice(1);
			GoDisks();	// read next disk
			}
		}
	}


/* keypress processing */

function keyact(e){

if(overJoystick)	// when arrows,enter,space, touch buttons are pressed
	{
	e.keycode = e.which = joyMapper.keysubstit(e.keyCode || e.which);
	}
		
if(e.type=="keydown") keymap.keyHit(e);
if(e.type=="keyup") keymap.keyRelease(e);

if(e.type=="keydown") {
 if(e.keyCode==76 && e.ctrlKey) cheatings.livesfinder();
 if(e.keyCode==13 && (e.altKey || e.ctrlKey)) FullScreen=1;
}
e.preventDefault();
e.stopPropagation();

}

// does fake key press action
// f=1 touch case, do not release
function pushKey(n,f) {

 if(n==1000) cpu.nmi();
 else
	{
	if(overJoystick && (n!=10))
		{
		EVENT.type="keydown";
		EVENT.keycode = EVENT.which = joyMapper.bk2asc(n);
		EVENT.location = 3;
		keyact(EVENT);	// make as NumPads key press 
		}
	else
		{
		keymap.key_byCodeHit(n);
		}
	if(!f) setTimeout('popKey('+n+')',450);
	}
}
function popKey(n) {
	if(overJoystick && (n!=10))
		{
		EVENT.type="keyup";
		EVENT.keycode = EVENT.which = joyMapper.bk2asc(n);
		EVENT.location = 3;
		keyact(EVENT);		// will be called on touchup or keyLifter
		}
	else
		{
		setTimeout('BKautokeys(1)',200);
		keymap.key_byCodeRelease(n);
		}
}

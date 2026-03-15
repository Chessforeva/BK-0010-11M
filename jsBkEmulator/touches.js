
// keyboard on buttons
// touch things


TOUCH_ = ('ontouchstart' in document.documentElement);

function isMobileDevice() {
  // Best modern signal: touch-primary device
  if (window.matchMedia('(pointer: coarse)').matches) return true;

  // Fallback for older browsers without matchMedia
  if (!window.matchMedia) {
    return /Android|iPhone|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
    // Note: iPad intentionally omitted — iOS 13+ reports as desktop
  }

  return false;
}
MOBILE_ = isMobileDevice();

function img_folder() {
	return (document.location.href.substr(0,4)=="http"? '/keybimgs/' : './keybimgs/');
}


var EVENT = { type: "", keyCode: 0, which:0, location:0,
 preventDefault: function() {} , stopPropagation: function() {} }; 
 
KBUT_ = [];
			
function AddKeyButtons()
{
    addKey( "Esc",0, 1000,  690,10, 90,90 );
    addKey( "Enter",0, 10,  790,10, 180,90 );
    
    addKey( "Left",0, 8,  680,130, 100,220 );
    addKey( "Up",0, 26,  786,116, 100,110 );
    addKey( "Down",0, 27,  786,240, 100,110 );
    addKey( "Right",0, 25,  892,130, 100,220 );
    
    addKey( "Delete",0, 46,  932,386, 60,60 );
    addKey( "Space",0, 32,  680,386, 240,90 );
}

KBF_ = [];
function keyLifter()
{
var i,o;
for(i in KBF_)
 {
  o = KBF_[i];
  o.i++;
  if(o.i>=6)
   {
    popKey(o.c);
    KBF_.splice(i,1);
   }
 }
 setTimeout('keyLifter()',20);
}

function touchpushKey(c)
{
var i,o,y=1;
for(i in KBF_)
 {
  o = KBF_[i];
  if(o.c==c) { y=0; break; }
 }
if(y)
 {
  pushKey(c,1);	// do not release
  KBF_.push( { i:0, c:c } );
 }
else o.i=0;
}

function touchpopKey(c)
{
var i,o;
for(i in KBF_)
 {
  o = KBF_[i];
  if(o.c==c)
   {
    popKey(o.c);
    KBF_.splice(i,1);
   }
 }
}

function addKey(n,f,c,x,y,w,h)
{
 var s = '<div class="disSel" style="position:absolute; left:'+x+'px;top:'+y+'px;'+
	'visibility:hidden"><img id="kButt'+c+'" src="' +
	img_folder()+(f?f:n)+'.png" width="'+w+'" height="'+h+'" alt="'+n+'" >' +
  '</div>';
 KBUT_.push(c);   
 document.write(s);
}

//function GE(id) { return document.getElementById(id); }
function DummyEv(e) { e.stopPropagation(); e.preventDefault(); return false; } 

function touchLoads()
{
 var O,i,f=0;
 for(i in KBUT_)
   if(GE("kButt"+KBUT_[i])==null) f=1;

 if(f) setTimeout('touchLoads()',999);
 else
  {
  for(i in KBUT_)
  {
   O = GE("kButt"+KBUT_[i]);
   if(TOUCH_)
   {
   O.addEventListener("touchstart", TouchClick, false);
   O.addEventListener("touchmove", DummyEv, false);
   O.addEventListener("touchend", TouchUp, false);
   }
  else
   {
   O.addEventListener("mousedown", TouchClick, false);
   }
   O.style.zIndex = 5555;
  }
  
  }
}

function touchShow(to)
{
  for(var i in KBUT_)
  {
   var O = GE("kButt"+KBUT_[i]);
   O.style.visibility = (to ? "visible" : "hidden");
  }
}

function TouchClick(e)
{
e.stopPropagation(); e.preventDefault();
var t = e.target; if(!t) t=e.currentTarget;

var c = (t.id=="BK_canvas" ? 32 : parseInt(t.id.substr(5)));
c = touch_subst_get(c);

touchpushKey(c);
} 

function TouchUp(e)
{
e.stopPropagation(); e.preventDefault();
var t = e.target; if(!t) t=e.currentTarget;

var c = (t.id=="BK_canvas" ? 32 : parseInt(t.id.substr(5)));
c = touch_subst_get(c);

touchpopKey(c);
} 

if(!TOUCH_) keyLifter();	/* This lifts mouse press events */

AddKeyButtons();


//-----
var touch_subst_keys = [];	// can remap some touches too (as in Keyboard.js) for games

function touch_Subst_Key( onecode, code ) {
	touch_subst_keys.push( { f: onecode, bk: code } );
}

function touch_subst_get(c) {		// substitute one BK keycode to other
	for(var j=0; j<touch_subst_keys.length; j++) {
		var Sb = touch_subst_keys[j];
		if( Sb.f == c ) { c = Sb.bk; break; }
	}
	return c;
}



/*
Clock tick counter, speed correction, loop counters 
*/


BKspeed = function()
{
  var self = this;
  var M = 1000000, N = 30, K = (M*3)/2, Q = 2000;
  
  
  self.mhz = 4*M;		/* User can set 4MHz or 3Mhz */
  self.cyc = self.mhz/16;	/* Looping settings */
  self.fps = 20;
  
  self.anim = 0;	/* animation based */
  
  self.tck = 0;		/* ticker [0..60] */
  self.realCycles = 0;	/* real cycles per second performed */
  
  self.avgCycles = 4*M;	/* for sound, real cycles per second */
  
  self.AFr = false;	/* Animation Frame based performance correction */
  
  self.lastNow = 0;	/* contains last second counter */
  
  function clr() {
	self.tck = 0;		// clear ticker
	self.realCycles = 0;	// and counters
	self.avgCycles = (self.cyc * self.fps)|0;
	}
  
  this.set = function( c, n ) {
  
	self.cyc = c;	/* Cycles per 1-loop */
	self.fps = n;	/* Loops per second */
	
	self.mhz = 0;	/* No MHz counting */
	self.anim = 0;
	clr();
	}
	
		/* automatic adjusting to 4MHz,3MHz */
  this.MHz = function( n, anim ) {
	
	self.mhz = n;
	self.cyc = (n/16)|0;	/* initial */
	self.fps = 20;		/*~about 20 most, or corrected */
	self.anim = anim;
	if(anim) {
			self.fps = 10;	/*exactly per second*/
			self.cyc *=100/62;
			}
	clr();
	}
	
  this.count = function() {
	self.realCycles += self.cyc;
	}

  this.adjust = function() {
	
	var A = self.realCycles, adj="";
  
	if( self.mhz && !BK_speed.anim ) {
	 var B = (self.cyc*self.fps), C = self.mhz, D = (C-A);
	 if(D>Q && B<(C+K)) { self.cyc+=N; adj="+"; }	/* increase performance or ...*/
	 if(D<-Q && B>(C-K)) { self.cyc-=N; adj = "-"; }	 /* ...slow down (if reasonable) */
	 self.fps = 20;
	 }

	self.avgCycles = A;	/* can calculate Bps */
	self.realCycles = 0;
	var q = GE("MHZshow");
	if(q!=null) q.innerHTML = ''+(A/M).toFixed(1)+'Mhz'+adj;
	}
  
  this.initTicker = function() {
  	self.AFr = (window.requestAnimationFrame!=null);
	if(self.AFr) pulse60tcks();
	}

 return self;
}

 /* animation precise pulse 60 times per second */
function pulse60tcks() {

	if((++BK_speed.tck)>=60) {
		BK_speed.adjust();
		BK_speed.tck = 0;
	};
	if(BK_speed.anim && (BK_speed.tck%6==0)) FPSloop(1);
	
	window.requestAnimationFrame(pulse60tcks);
 }

var BK_speed = new BKspeed();	// And define variable



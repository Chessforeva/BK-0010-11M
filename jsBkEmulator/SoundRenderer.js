
SoundRenderer = function()
{
  var self = this;

  var /*int*/xCPS = 0;
  var synth = null;
  var P = null;
  
  var B = [];	// real buffer to play
  var Bpos = 0;
  var Bz = 0;	// flag-count lasting same sound
  var Bclr = 0;	// flag-count should clear buffers
  var adjspd = 0;	// counter for speed adjusting

  var /*int*/ofs = 0;
  var /*int*/xAcc = 0;
  var /*int*/val = -16;
  var /*int*/synthVal = 0;  
  var /*int*/covoxVal = 0;
  var /*int*/bitVal = -16;
  
  var Chan = 1;		// Channels
  
  var context = null;
  
  self.On = false;	// sound on or off
  
  self.covox = false;
  self.cycles = 0;
  self.initpause = 0;	// pause, if too slow
  
  this.setSynth = function(S) { synth = S; }
  
  this.setSound = function(on) {

  self.On = on;
  if(on && context == null) {
	var A = (window.AudioContext || window.webkitAudioContext ||
		window.WebkitAudioContext);
		
	if(A==null) { soundOn=0; return; }	// wtf
	context = new A();
	if(typeof(context.createScriptProcessor)=="undefined") {
		context = null; soundOn=0; return;
	}
	
	P = context.createScriptProcessor(4096, 3, 3);
	if(P!=null) P.onaudioprocess = onAudio;
	}

  if(context != null && P!=null) {
	if(on) P.connect(context.destination);
		else {
		P.disconnect();
		clear2();
		}
	}
  
  }
  
  function clear2() {
	if(!self.initpause) { B = []; Bpos = 0; Bz = 0; }
	adjustSpeed();
	adjspd=0;
	ofs = 0;
	Bclr = 0;
  }

  this.clear = function(a) {
	if(a) clear2();
	else Bclr++;		// now will wait for silence and then clear
  }
	//~every .0232s 
  function onAudio(e) {
  
    var p = Bpos;
    for(var C=0; C<Chan; C++) {
	
	var O = e.outputBuffer.getChannelData(C);
	var j=0, Sz = O.length, L = B.length;
	
	if(self.initpause)
	{
	 self.initpause--;
	 while(j<Sz) O[j++]=0;
	}
	else
	{
	 p = Bpos;
	 
	 if(Chan==1) {
	   while(j<Sz && p<L) O[j++]=B[p++]; 
	  }
	 else {	/* 3channels */
	   while(j<Sz && p<L) O[j++]=B[p++][C];
	  }
	
	 if(C==0) {
	
	 var last = (p==0 ? 0 :(Chan==1 ? B[p-1] : B[p-1][C]));
	
	 if(j>0) {
		Bz=0;
		if(j<Sz && p>1 && !synth.On) Bz=1;
		}
		
	 if(Bz) {
		Bz = (Bz+1)%1000;		// little lasting sound
		while(j<Sz) O[j++]=last;
		}

	 if(Bclr) {
		switch(Bclr) {
		case 1: if(j<Sz) clear2(); break;
		case 2: if(last==0) clear2(); break;
		}
	  }
	 }
	
	 while(j<Sz) O[j++]=0;
	}
	
	}	// each channel
    Bpos = p;

  }
  
  function adjustSpeed(c)  {
	  
    var S = BK_speed, spd = (c ? (S.mhz ? S.mhz : S.cyc*S.fps) : S.avgCycles);
	
	/* cycles per sample */
    var C = (spd / 48010)|0; /*better be prepared on time >=48000*/
	
    xCPS = (C * 4096);	
  }
  
  this.adjConstSpeed = function()  { adjustSpeed(true); };
  

 /*void*/this.updateTimer =  function()
  { 
    var /*long*/cy = cpu.Cycles;
    var /*int*/xStep = /*(int)*/(cy - self.cycles) * 4096;
    var /*int*/xRem = xCPS - ofs;

    if (xStep < xRem)
     {
	xAcc += val * xStep;
	ofs += xStep;
     }
    else
     {
	xAcc += val * xRem;
	cSum( xAcc );
	xStep -= xRem;
	ofs = 0;
	xAcc = 0;
	
	while (xStep >= xCPS) {
		cSum(val * xCPS);
		xStep -= xCPS;
	}
	
	xAcc = (val * xStep);
	ofs = xStep;
	
	if(!self.initpause && (++adjspd)>50000) self.clear();

     }

    self.cycles = cy;
    
    if(!self.covox) covoxVal = 0;
    if(!synth.On) synthVal = 0;
    if(!self.On) bitVal = -16;
  }

  function cSum(A) {

    var g,c;

    if(synth.On) {
		synthVal = synth.nextSample();	// 1 mixed or 3 channels
		if(synth.mixed) {
			c = synthVal-val;
			val+=(c>32?32: (c<-32?-32:c));	// simple mixed distorted value
			g = val;
			}
		else {
			g = synthVal;		// independent 3 channels, may be slow 
			synthVal=0; val=0;
			}
		}
    else if(self.covox)		// 1 channel
		{	//...2)phase
		c = covoxVal-val;
		val+=(c>32?32: (c<-32?-32:c));	// smoothing
		g = val;
		}
	else g = (A/xCPS);	// 1 channel

    var q = Chan;
    Chan = (synth.On && !synth.mixed ? 3 : 1);
    if(Chan!=q) clear2();
    
 /* The correct float values should be [-1.0 ... 1.0], but ok anyway. */
 
    B.push(g);
  }
  
  /*void*/this.updateBit = function(/*int*/maskedVal) {
    this.updateTimer();
    bitVal = ((maskedVal==0) ? -16/*Off*/ : 16/*On*/);
    val = (bitVal + covoxVal + synthVal);
  }

  /*void*/this.updateCovox = function(/*int*/value) {
    this.updateTimer();
    var v = value&255;
    covoxVal = (v&128 ?v-256:v)/2;	//1)phase
  }
  
  adjustSpeed();
  
  return self;

}

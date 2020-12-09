
AY8910 = function()
{
  var self = this;

  var /*int*/xCps=0,c32=0;
  var /*int*/xSubPos=0;
  var /*int*/cy16=0;

  var /*int[16]*/ayRegs = [];
  var /*int*/R=-1;	/* selected reg */
	
  var /*int[]*/vol = [ 0, 1, 2, 3, 5, 7, 11, 15, 22, 31, 45, 63, 90, 127, 180, 255 ];
	
  var /*int[3]*/tones = [0,0,0];
  var /*int[3]*/toneCntrs = [0,0,0];
  var /*int[3]*/toneToggles = [0,0,0];
  var /*int*/ePeriod=0;
  var /*int*/eCntr=0;
  var /*int*/e=0;			/*envelope*/
  var /*int*/ne=0;		/*negative env.*/
  var /*boolean*/st = false;
  var /*int*/nSR=65535;	/* noise */
  var /*int*/nPeriod=0;
  var /*int*/nCntr=0;

  var mix=0;	// mixed 3 channels
  
  self.mixed = true;	// mix (faster) or not (slower)
  
  var U = [0,0,0];	// values, if unmixed
  
  self.On = false;
  
  function init()
  {
   xCps = 4000;	//~62.5 cycles per sample
   c32 = xCps*32;
   for(var i=0;i<16;i++) ayRegs[i]=0;
  }

  function /*void*/updateNoise() {
    if (nSR & 1) {
      nSR ^= 0x12000;
    }
    nSR >>>= 1;
  }

  function /*void*/nextCycle()
  {
	  
  if ((++cy16)>=16) {
    cy16=0;
	
    for (var i=0; i<3; ++i)
    {
      var /*int*/a = toneCntrs[i]-1;
      if (a <= 0) {
        a = tones[i];
        toneToggles[i]^=1;
      }
      toneCntrs[i]=a;
    }

    if ((--nCntr) <= 0) {
      nCntr = nPeriod;
      updateNoise();
    }

    if ((--eCntr)<= 0) {
        eCntr = ePeriod;
        if (!st) {
          e = (++e) & 0xF;
          if (e == 0) {
            var /*int*/shape = ayRegs[13];

            if ((shape & 8) == 0) {
              st = true;
              ne=0;
            } else {
              if (shape & 2) ne=(ne^15)>>>0;
              if (shape & 1) {
                st = true; ne=(ne^15)>>>0;
              }
            }
          }
        }
      }
	  

    if(self.mixed) mix = 0;
     else { U[0]=0; U[1]=0; U[2]=0; }

    for (var c=0; c<3; ++c) {	/*mixing channels */
      
      var isOn = 1;
      if ((ayRegs[7] & (1<<c)) == 0) {
        isOn = toneToggles[c];
      }

      if (((ayRegs[7] & (8<<c)) == 0) && 
        ((nSR & 1) == 0)) {
        isOn = 0;
      }

      if(isOn) {
		
          var amp = ayRegs[(8+c)];

          if ((amp & 0x10) != 0) amp = e^ne;
	  
	  var v = vol[(amp&15)>>>0];
      
          if(self.mixed) mix+=v;
	   else U[c]+=v;
	}
    }
	
   }
  }
  
  function nextMixed()
  {
      var /*int*/step = 64 - xSubPos;
      var /*int*/Rem = xCps-step;
      
      var a=(mix * step);	// accum.

      while (Rem >= 64) {
        a+=(mix<<6);	//*64
        Rem -= 64;
        nextCycle();
      }

      xSubPos = Rem;

      return F(a+(mix*Rem));
  }
  
  function F(v) {
	v/=c32;
	if(v>64)v-=128;
	return v;
  }
      
 /*int*/this.nextSample = function()
  {
      if(self.mixed) return nextMixed();
      
      var /*int*/step = 64 - xSubPos;
      var /*int*/Rem = xCps-step;

      var a=(U[0] * step), b=(U[1] * step), c=(U[2] * step);	// accum.

      while (Rem >= 64) {
        a+=(U[0]<<6);	b+=(U[1]<<6); c+=(U[2]<<6); //*64
        Rem -= 64;
        nextCycle();
      }

      xSubPos = Rem;
      return [ F(a+(U[0]*Rem)), F(b+(U[1]*Rem)), F(c+(U[2]*Rem)) ];
  }

  /*void*/this.setRegIndex = function(/*int*/reg) {
    R = reg;
  }

  /*void*/this.writeReg = function(/*byte*/data)
  {
    if ((R >= 0) && (R < 16)) {
		ayRegs[R] = data;
      if ((R >= 0) && (R <= 5))
      {
        for (var i=0; i<3; ++i)
		{ var j=i<<1; tones[i] = ((ayRegs[j] | (ayRegs[j+1] << 8)) & 0xFFF); }
      } else if ((R == 12) || (R == 11)) {
        ePeriod = (ayRegs[11] | (ayRegs[12] << 8));
      } else if (R == 6) {
        data &= 0x1F;
        nPeriod = (data*2);
	}
	else if (R == 13)
	{
        e = 0;
        ne =((data & 4) ? 0 : 15);

        st = false;
        eCntr = ePeriod;
	}
    }
  }
  
  init();
  
  return self;
}

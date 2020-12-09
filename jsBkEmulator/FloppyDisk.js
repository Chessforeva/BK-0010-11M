
FloppyDisk = function( diskName, diskData, diskId )
{
  var self = this;
  
  /*
	2 cylinder heads x 10 sectors x
		512(chain of 256 bytes of data + markers ) = 10240 bytes
	
	819000 ~ (80 x 10240)
  */
  
  var T = 10240; // image track size in bytes (x 80)
  var R = 6250; // raw track size ( 2 heads, words )
  var W = R/2; // .... (1 head)
  
  /* disk rotation speed; cpu cycles per word */
  // Orig. 204=01; 272=M;
  // Other source says 5 rotations in sec., so
  // 3MHz/(5*T) = 192, or 256 for M(4MHz)
	
   var /*long*/period = 256;

  /* buffers */
  var /*int[W]*/rawTrack = [[],[]];
  var /*byte[T]*/imageTrack = [];

  var /*int*/track=0; // track[0..79]
  var /*int*/P=0;  // track position
  var /*boolean*/trackDirty = false;
  var /*boolean*/wordChanged = false;
  var /*boolean*/isWriting = false;
  var /*boolean*/writingMarker = false;
  var /*boolean*/gotWrite = false;
  var /*int*/writeData=0;
  var /*int*/lastHead=0;
  var /*boolean*/verbose = false;

  self.readOnly = false;
  
  self.cycles = 0;
  
  self.diskId = diskId;	// A:...D:
  self.imageName = diskName;	// file name
  self.imageFile = diskData;	// array of Uint8
  
  this.setVerbose = function (to) { verbose = to; }
  
  function /*int*/writeAM(head,/*int*/k, /*int*/type)
  {
    for (var i=0;i<6;i++) rawTrack[head][k++]=0;

    rawTrack[head][k++] = 0x1A1A1;
    rawTrack[head][k++] = ( 0x1A100 | type );

    return k;
  }

  function /*void*/Image2raw() {
  
    var i,S,k,a,j;
    
    for(i=0;i<W;i++) {
	 rawTrack[0][i]=0x4E4E;
	 rawTrack[1][i]=0x4E4E;
	}
    
    for (var /*int*/sector = 0; sector < 10; ++sector)
     {
      S =  sector * 304;
      for (var /*int*/head = 0; head < 2; ++head)
      {
        /*int*/k = 21+S;

        k = writeAM(head, k, 254);

        /*int*/a = head + (track << 8);
        rawTrack[head][k++] = a;
        a = ((sector+1) << 8) | 2;
        rawTrack[head][k++] = a;
        rawTrack[head][k++] = 0x2FFFF; /* CRC */

        /*int*/j = (sector + (head * 10)) * 512;

        k = 43+S;
        k = writeAM(head, k, 251);
        for (i=0; i<256; i++)
        {
          a = (imageTrack[j++] & 0xFF) << 8;
          a |= imageTrack[j++] & 0xFF;
          rawTrack[head][k++] = a;
        }
        rawTrack[head][k++] = 0x2FFFF; /* CRC */

      }
     }
  }

  function /*void*/Raw2image() {
    var /*int*/sector = 0;
    var /*int*/word = 0;
    var /*int*/state = 0;
    var /*boolean*/r = false;	// reported

    if (verbose) console.log("FDD: Analysing raw track " + track);
    for (var /*int*/head = 0; head < 2; ++head) {
      if (verbose) console.log("Head " + head);
      state = 0;
      for (var /*int*/k=0; k<W; ++k) {
        var /*int*/data = rawTrack[head][k];

        switch (state)
        {
        case 0:
          if ((data & 0x10000) && ((data & 0xFFFF) == 41470)) {
          state = 1;
          word = 0;
          if (verbose) console.log("Found sector address marker");
	  }
          break;
        case 1:
          ++word;
          switch (word)
          {
          case 1:
            if ((data & 0xFFFF) != ((track << 8) | head)) {
              if (verbose) { console.log("Invalid cylinder/head");
              } else if (!r) {
                r = true;
                console.log("Broken write at track " + track);
              }
              state = 0;
            }
            break;
          case 2:
            if ((data & 0xFF) != 2) {
              if (verbose) { console.log("Invalid sector size");
              } else if (!r) {
                r = true;
                console.log("Broken write at track " + track);
              }
              state = 0;
            }
            else {
              sector = (data & 0xFFFF) >>> 8;
              if ((sector < 1) || (sector > 10)) {
                if (verbose) { console.log("Invalid sector number");
                } else if (!r) {
                  r = true;
                  console.log("Broken write at track " + track);
                }
                state = 0;
		 }
		}
            break;
          case 3:
            if ((data & 0x20000) != 0) {
              if (verbose) console.log("Found sector " + sector);
              state = 2;
	      }
            break;
          default:
            state = 0;
          }

          break;
        case 2:
          if (data & 0x10000) {
            data &= 0xFFFF;
            if (data == 41470)
            {
              state = 1;
              word = 0;
              if (verbose) console.log("Found sector address marker");
            }
            else {
              if ((data == 41467) || (data == 41464)) {
              state = 3;
              word = 0;
              if (verbose) console.log("Found sector data marker");
	      }
            }
          }
          break;
        case 3:
          if ((word++) >= 256)
	  {
          if (!(data & 0x20000)) {
            state = 0;
            if (verbose) console.log("No CRC");
          }
          else
          {
            var /*int*/w = 512 * (sector - 1 + (head * 10));
            var /*int*/m = k - 256;
            for (var /*int*/i = 0; i < 256; ++i) {
              var /*int*/a = rawTrack[head][m++] & 0xFFFF;
              imageTrack[w++] = /*(byte)*/(a >>> 8) & 0xFF;
              imageTrack[w++] = /*(byte)*/a & 0xFF;
            }
            state = 0;
            if (verbose) console.log("Sector converted");
	   }
	  }
          break;
        default:
          state = 0;
        }
      }
    }
  }

  function /*void*/saveTrack()
  {
    if (!self.readOnly && trackDirty) {
    
      Raw2image();
      var /*long*/k = track*T, t=k+T, a=self.imageFile, j=a.length, i=0;
      
      while(j<k) a[j++]=0;
      while(i<T) a[k++]=imageTrack[i++];
    }
    trackDirty = false;
  }

  function /*void*/loadTrack()
  {
    var /*long*/k = track*T, a=self.imageFile, l=Math.min(k+T,a.length)-k, i=0;
    while(i<l) imageTrack[i++]=a[k++];
    while(i<T) imageTrack[i++]=0;    

    Image2raw();
    trackDirty = false;
    if (verbose) console.log("FDD: selected track " + track);
  }

  this.unmountImage = function()
  {
    /* when should save */
    saveTrack();    
    self.cycles = 0;
  }


  this.mountImage = function() {
  
    self.unmountImage();

    self.cycles = cpu.Cycles;
    
    loadTrack();
    console.log("FDD: image mounted");
  }

  /*void*/this.stepPlus = function()
  {
    if (track<82)
	{
	saveTrack();
	track++;
	loadTrack();
	}
  }

  /*void*/this.stepMinus = function()
  {
    if (track>0)
	{
	saveTrack();
	track--;
	loadTrack();
	}
  }

  /*int*/this.getStatus = function(/*int*/head)
  {
      
    var a=0;

    if (self.readOnly) a|=4;

    a|=((track==0)?1:0);

    if (P >= 3110/*~W*/) a|=32768;

    if (isWriting)
    {
      if (!gotWrite) a|=128;
      if (wordChanged && !gotWrite) a|=16384;
    }
    else
    {
      if (wordChanged) a|=128;
      if ((rawTrack[head][P] & 0x20000) !=0) a|=16384;
    }
    if (verbose) console.log("FDD: reading status word " + a +
	" at track position " + P);
    
    return a;
  }
  
  /*int*/this.getData = function(/*int*/head) {
    wordChanged = false;

    if (verbose) console.log("FDD: reading data word " + t +
	" at track position " + P);

    return rawTrack[head][P];
  }
  

  /*boolean*/this.isMarkerPos = function(/*int*/head) {

    if (verbose) console.log("FDD: Scanning for marker at track position " + P);

    return ((rawTrack[head][P] & 0x10000) != 0);
  }

  /*void*/this.setMarker = function(/*boolean*/isMarker) {
    writingMarker = isMarker;
    if (verbose)
      console.log("FDD: writing marker mode set to (" + isMarker + ")");
  }

  /*void*/this.deferredWrite = function(/*int*/head, /*int*/data)
  {
    data = (data & 0xFFFF)>>>0;
    isWriting = true;
    gotWrite = true;
    writeData = ((data & 0xFF) << 8) | ((data >>> 8) & 0xFF);
    wordChanged = false;
    lastHead = head;
    trackDirty = true;
    if (verbose) console.log("FDD: writing data word " + data);
  }

  function /*void*/updateWriteState()
  {
    if (gotWrite)
    {
      if (!self.readOnly) {
        if (verbose) console.log("FDD: physically writing data word " +
		writeData + " at track position " + P);
        rawTrack[lastHead][P] = (writeData | (writingMarker ? 0x10000 : 0));
      }
      gotWrite = false;
      wordChanged = false;
      return;
    }

    if (!wordChanged) {
      if (!self.readOnly) {
        if (verbose)
	 console.log("FDD: physically writing CRC at track position " + P);
         rawTrack[lastHead][P] = (0x2FFFF/*getCRC()*/ | (writingMarker ? 0x10000 : 0));
      }
      wordChanged = true;
    }
    else {
      isWriting = false;
    }
  }

  this.updateTimer = function() {
  
    var d = (cpu.Cycles - self.cycles);

    if ( d < period) {
      return;
    }
    var /*long*/c = (d / period)|0;

    self.cycles += c * period;
	
    if ((++P) >= W) P=0;		/* Rotate disk */
    if (isWriting) updateWriteState();
     else wordChanged = true;

    if ((--c)>0)
     {
     if ((++P) >= W) P=0;		/* Rotate disk */
     if (isWriting) updateWriteState();
     P+=(c-1);		/* Disk rotates at constant speed anyway */
     P %= W;
     }

  }

  /*void*/this.flush = function() {
    if (!self.readOnly && trackDirty)
      saveTrack();
  }
  
  this.reSized819200 = function() {
  
	saveTrack();
  
	var L = 819200, a = self.imageFile, l = a.length, i, c, q, trunc=true;
	if(l>L) {
	 c = a[L-1];	// last symbol
	 for(i=L;i<l && trunc;i++) {
		q=a[i]; if(q!=0&&q!=255&&q!=c) trunc=false;
		}
	 if(trunc) {
		var A = new Uint8Array(L);
		for(i=0;i<L;i++) A[i]=a[i];
		return A;
		}
	}	
	return self.imageFile;
  }
  
  return self;
}

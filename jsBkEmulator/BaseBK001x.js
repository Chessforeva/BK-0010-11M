
/*
 BK machine base.
 
 Also display routes.
 Fake tape is .bin file loader only.
*/

BaseBK001x = function()
{
  var self = this;
  
  var /*short[106496]*/memory = [];

  var /*int[8]*/mmap = [];
  var /*boolean[8]*/mmap_readable = [];
  var /*boolean[8]*/mmap_writeable = [];
  var /*int*/rom160length=0;

  var /*short*/syswritereg=0;
  var /*short*/iowritereg=0;
  var /*short*/ioreadreg=0;

  var /*short*/scrollReg=0;
  var /*short*/scrollPos=0;
  var /*short*/paletteReg=0;

  var /*int*/videoMode=0;
  var /*boolean*/is11M;


  //------------- [smk start 1]
  // SMK-512 case:
  
  var /*short*/sysmmapreg=0; 
  var /*boolean*/smkCREnabled = false;
  var /*short*/oldSMKCR = 0;
  var disableSlot100 = false;
  
  var pageMasks = [
    0x0000000F,
    0x000000F0,
    0x00000F00,
    0x0000F000,
    0x000F0000,
    0x00F00000,
    0x0F000000,
    0xF0000000
];
  var mMap = [];
	for (var i = 0; i < 32; i++) mMap[i] = 0;
	
  // Memory remap for 512 Kb
  var /*int*/mmapReadable = 0;
  var /*int*/mmapWriteable = 0;
  var /*int*/mmapSpecial = 0;
  var /*int*/page160length = 0;
  
  //------------- [smk end 2]
  
  var /*CPUTimer*/ timer = new CPUTimer();
  var /*Keyboard*/ keyboard = new Keyboard();
  var /*SystemRegs*/ sregs = new SystemRegs();
  var /*Joystick*/ joystick = new Joystick();  
  var plugins = [];

  var /*SoundRenderer*/ srend = new SoundRenderer();
  var /*AY8910*/ synth = new AY8910();
  var synth_guess = 0;			// 0 - none, 1-speaker, 2 - covox or 8910
  var /*int*/tapeDelay = 0;
  var /*long*/lastTape = 0;
  var /*int*/TAPE_SPEED = 272;

  var monoColorRGB = [[0,0,0], [60,60,60],[250,250,250],[130,130,130]];
  var Black=[0,0,0],Blue=[0,0,255],Green=[0,255,0],Red=[255,0,0],Yellow=[255,255,0],
	Magenta=[255,0,255],Cyan=[0,255,255],White=[255,255,255],DarkRed=[139,0,0],
	RedBrown=[128,64,0],Salad=[85,171,85],LightGreen=[128,255,128],
	Violet=[238,130,238],VioletBlue=[138,43,226];
  var fullColorRGB = [
	Black, Blue, Green, Red,
	Black, Yellow, Magenta, Red,
	Black, Cyan, Blue, Magenta,
	Black, Green, Cyan, Yellow,
	Black, Magenta, Cyan, White,
	Black, White, White, White, 
	Black, DarkRed, RedBrown, Red,
	Black, Salad, LightGreen, Yellow,
	Black, Violet, VioletBlue, Magenta,
	Black, LightGreen, VioletBlue, RedBrown,
	Black, Salad, Violet, DarkRed,
	Black, Cyan, Yellow, Red,
	Black, Red, Green, Cyan,
	Black, Cyan, Yellow, White,
	Black, Yellow, Green, White,
	Black, Cyan, Green, White 
];

  var modePaletteMaps = [];
  var /*QBusReadDTO*/ readDTO = QBusReadDTO(-1);
  var /*QBusReadDTO*/ rdDto = QBusReadDTO(-1);
  
  var HDret = { data:0 };		// word of returned data
  
  var CS,CX,gDATA,Px=[],Bf=[];
  var Cmap,Base,Limit;
  
  this.FakeTape = { prep:false /* is ready to load, or save */, filename:"", bytes:[],
					wr:false };
  this.dsks = false;		// flopies
  this.hdds = false;		// hdd disks (SMK)
  
  this.isM = function() { return is11M; }
  
  this.remap = false;
	      
  this.minimizeCycles = function()
  {
   timer.updateTimer();
   if(srend.On) srend.updateTimer();
   if(self.dsks) fdc.updateTimer();
   
   var n = cpu.Cycles - 1000;
   cpu.Cycles-=n;
   timer.cycles-=n;
   if(srend.On) srend.cycles-=n;
   if(self.dsks) fdc.mCyc(n);
  }
  
  function loadtomem(addr,romarr,skip)
  {
    var a=addr, a2=a, n=romarr.length+skip, i=0;
    while(i<n) {
		memory[a] = romarr[i++];
		a++; a2+=2;
		}
  }
  
  // Address for Basic,Focal,MSTD ROM 
  function load120000(a) { loadtomem(69632,a,0); }
  
  function load160000(a) { loadtomem(102400,a,0); }		//4KB disk hE000 @#160000
  
  function load000000(a) { loadtomem(0,a,0); }			//can overwrite memory
  
  this.loadDisksRom = function(a) {
	load160000(a);
  }
  
  function init()
  {
   var i,j;
    for (i=0; i<256; ++i)
     for (j=0; j<8; ++j)
        modePaletteMaps[((i<<3)+j)] = ((i>>>j) & 1) ? [255,255,255] : [0,0,0];

    fillMPMEntry(1, monoColorRGB, 0);
    for (i = 0; i < 16; ++i)
      fillMPMEntry(2 + i, fullColorRGB, i * 4);
      
    plugins.push(timer);
    plugins.push(keyboard);
    plugins.push(sregs);
   
    scrdefs();
  }
  
  function memLoads0()
  {
    if(!self.remap) {
	
    var i,i2;
    for(i=0;i<8;i++)
	{
		mmap_writeable[i] = (i<4);
		mmap_readable[i] = true;
		mmap[i] = (i>3 ? 65536 : 0) + (4096 * (i%4));
	}

    for(i=0; i<16384; ++i) {
       memory[i] = ((((i >>> 7) ^ i) & 1) ? 0xFFFF : 0 );
	} 

	/*
		loading ROM files in mapped memory by pages
	*/

    loadtomem(65536,monit10_data,0);	//8KB addr h8000 @#100000
    loadtomem(69632,basic10_data,-64);	//24KB addr hA000 @#120000
    loadtomem(81920,b11mbos_data,0);	//8KB BK OS
    loadtomem(86016,b11mext_data,0);	//8KB
    loadtomem(90112,bas11m1_data,0);	//8KB Basic BK-11M (2part)
    loadtomem(94208,bas11m0_data,0);	//16KB (1part)

	//4KB disk hE000 @#160000
	loadtomem(102400, (SMK ? smk512_data: disk327_data),0);
    }
  }
  
  this.updinternals = function()	// update internal values
  {
    for(var i=0,a=0;i<0x8000;i++,a+=2)
	{
	this.readWord(a,readDTO);
	this.writeWord(a,readDTO.value);		
	}
  }	

  function /*void*/fillMPMEntry(/*int*/ofs, /*byte[]*/cmap, /*int*/mapofs)
  {
    var i,j,k;
    ofs <<= 11;    
    for (i=0; i<256; ++i)
      for (j=0; j<8; j+=2) {
        var col = cmap[(( (i >>> j) & 0x3) + mapofs)];
        for (k=0;k<2;k++) modePaletteMaps[(ofs++)] = col;
      }
  }

  /*
   to: 0 - black/white
	1 -  mono 4 grey colours
	2 -  colour 16 colours
  */
  this.setVideoMode = function(to)
  {
  videoMode = to;
  scrdefs();
  }
  this.getVideoMode = function() { return videoMode; }
  
  /*void*/this.setBase10Model = function()
  {
    memLoads0();
    is11M = false;
    var m = mmap, r = mmap_readable, w = mmap_writeable;
    m[2] = 8192; m[3] = 12288; m[4] = 65536;
    r[4] = true; r[5] = false; r[6] = false; r[7] = false;
    w[4] = false; w[5] = false; w[6] = false; w[7] = false;
    scrdefs();
    rom160length = 8064;
  }
  
  function set10Model() {
    memLoads0();
    is11M = false;
    var m = mmap, r = mmap_readable, w = mmap_writeable;     
    m[2] = 8192; m[3] = 12288; m[4] = 65536;
    m[5] = 69632; m[6] = 73728; m[7] = 77824;
    r[4] = true; r[5] = true; r[6] = true; r[7] = true;
    w[4] = false; w[5] = false; w[6] = false; w[7] = false;
    scrdefs();
    rom160length = 8064;
  }
  
  /*void*/this.setBASIC10Model = function() {
    set10Model();
  }
  
  /*void*/this.setFOCAL10Model = function() {
    set10Model();
    load120000(focal10_data);
  }
  
  
  /*void*/this.setFDD10Model = function() {
    memLoads0();
    is11M = false;
    var m = mmap, r = mmap_readable, w = mmap_writeable;    
    m[2] = 8192; m[3] = 12288; m[4] = 65536;
    m[5] = 16384; m[6] = 20480; m[7] = 102400;
    r[4] = true; r[5] = true; r[6] = true; r[7] = true;
    w[4] = false; w[5] = true; w[6] = true; w[7] = false;
    rom160length = 4096;
    scrdefs();
    self.addFloppies()
  }
  
  function set11Model() {
    memLoads0();
    is11M = true;
    var m = mmap, r = mmap_readable, w = mmap_writeable;  
    m[2] = 8192; m[3] = 12288; m[4] = 90112;
    m[5] = 86016; m[6] = 81920; m[7] = 102400;
    r[4] = true; r[5] = true; r[6] = true; r[7] = true;
    w[4] = false; w[5] = false; w[6] = false; w[7] = false;
    rom160length = 4096;
    scrdefs();

  }

  /*void*/this.setFDD11Model = function() {
    set11Model();
    self.addFloppies();
  }
 
//------------- [smk start 2]
  
/*
 SMK 512 logic, because of too different memory handling
 and don't need to slow down much in real BK cases.
*/
   
  function setFDD11MModel() {
	is11M = true;
	mapLongPage(0, 0, true);      // Bank 0, Low (0-8KB)
	mapLongPage(1, 4096, true);   // Bank 0, High (8-16KB)
   
   // 0xC000
	var addr = 49152;                   // RAM Bank 1 Start
	mapLongPage(2, addr, true);   		// Bank 1, Low (16-24KB)
	mapLongPage(3, addr + 4096, true); // Bank 1, High (24-32KB)
   
   // 0x8000
	addr = 32768;                      // RAM Bank 2 Start
	mapLongPage(4, addr, true);   		// Bank 2, Low (32-40KB)
	mapLongPage(5, addr + 4096, true); // Bank 2, High (40-48KB)
   
	mapLongPage(6, 81920, false); // BASIC ROM (octal 140000)
	mapLongPage(7, 102400, false);// Monitor ROM (octal 160000)
	page160length = 4096;
	
   }
   
  this.setSMK11Model = function() {
	  SMK = true;	  
	  memLoads0();
	  setFDD11MModel();
      setSMKMode( 112, true );
   }

  function mapLongPage(longSlot, offset, writeable) {

    var shortSlot = (longSlot << 2) >>> 0;
    var pages = 4;

    for (var i = 0; i < pages; i++) {
        mMap[(i + shortSlot)] = offset;
        offset = (offset + 1024) >>> 0;
    }

    var pageMask = pageMasks[longSlot];

    mmapReadable = ((mmapReadable | pageMask) & 0xFFFFFFFF) >>> 0;

    if (writeable) {
        mmapWriteable = ((mmapWriteable | pageMask) & 0xFFFFFFFF) >>> 0;
    } else {
        mmapWriteable = ((mmapWriteable & ( pageMask ^ 0xFFFFFFFF )) & 0xFFFFFFFF) >>> 0;
    }

    mmapSpecial = (((mmapSpecial & ( pageMask ^ 0xFFFFFFFF )) | 0x80000000) & 0xFFFFFFFF) >>> 0;
}

function doClassic11MMap(data) {
	
    data = (data & 0xFFFF)>>>0; // because original is short
    sysmmapreg = data;

    if (!disableSlot100) {

        var romSel = data & 27;

        if (romSel != 0) {

            if ((romSel & 1) != 0) {
                mapLongPage(4, 94208, false);
                mapLongPage(5, 98304, false);

            } else if ((romSel & 2) != 0) {
                mapLongPage(4, 90112, false);
                mapLongPage(5, 86016, false);

            } else {
                var mask = ((pageMasks[4] | pageMasks[5]) & 0xFFFFFFFF) >>> 0;
                mmapReadable = ((mmapReadable & ( mask ^ 0xFFFFFFFF )) & 0xFFFFFFFF) >>> 0;
                mmapWriteable = ((mmapWriteable & ( mask ^ 0xFFFFFFFF )) & 0xFFFFFFFF) >>> 0;
            }

        } else {

            var ramSel = (data >>> 8) & 7;
            var ramAddr = ((ramSel ^ 6) << 13) >>> 0;

            mapLongPage(4, ramAddr, true);
            mapLongPage(5, (ramAddr + 4096) >>> 0, true);
        }
    }

    var romSel2 = (data >>> 12) & 7;
    var ramSel2 = ((romSel2 ^ 6) << 13) >>> 0;

    mapLongPage(2, ramSel2, true);
    mapLongPage(3, (ramSel2 + 4096) >>> 0, true);
}


function setSMKMode(data, force) {

    var d = (data & 0xFFFF)>>>0;

    if (!SMK) return false;

    var doUpdate = force;

         if (!force) {
			if (smkCREnabled) { 
				if ((d & 15) != 6) {
					smkCREnabled = false;
				}
				doUpdate = true;
            }
			else {
               if ((d & 15) == 6) {
				   smkCREnabled = true
                  return true;
               }
               return false;
            }
         }

    oldSMKCR = d;

    if (!doUpdate) return false;

    disableSlot100 = false;

    doClassic11MMap(sysmmapreg);
	
    var seg = 0;

    seg = (seg | (d & 13)) >>> 0;
    seg = (seg | ((d >>> 9) & 2)) >>> 0;
    seg = ((seg << 14) + 106496) >>> 0;

    page160length = 7680;

    var page170ofs = (seg + 12288 + 2048) >>> 0;

    var mode = (data >>> 4) & 7;

    switch (mode) {
		case 0:
			mapLongPage(6, seg + 8192, true);
			mapLongPage(7, seg + 12288, true);
			return true;
		case 1:
			mapLongPage(4, seg + 8192, true);
			mapLongPage(5, seg + 12288, true);
			mapLongPage(6, seg + 0, true);
			mapLongPage(7, seg + 4096, true);
			disableSlot100 = true;
			return true;
		case 2:
			mapLongPage(6, seg + 8192, true);
			mapLongPage(7, seg + 12288, true);
			return true;
		case 3:
			mapLongPage(5, seg + 4096, true);
			mapLongPage(6, seg + 8192, true);
			mapLongPage(7, 102400, false);
			mmapReadable = (mmapReadable & 0xFFF0FFFF) >>> 0;
			mmapWriteable = (mmapWriteable & 0xFFF0FFFF) >>> 0;
			disableSlot100 = true;
			break;
		case 4:
			mapLongPage(4, seg + 0, true);
			mapLongPage(5, seg + 4096, true);
			mapLongPage(6, seg + 8192, true);
			mapLongPage(7, seg + 12288, true);
			disableSlot100 = true;
			mmapWriteable = (mmapWriteable & 0xFFF0FFFF) >>> 0;
			return true;
		case 5:
			mapLongPage(4, seg + 0, true);
			mapLongPage(5, seg + 4096, true);
			mapLongPage(6, seg + 8192, true);
			mapLongPage(7, seg + 12288, true);
			disableSlot100 = true;
			return true;
		case 6:
			mapLongPage(6, 81920, false);
			mapLongPage(7, 102400, false);
			break;
			   
        case 7:

            page160length = 8192;

            mapLongPage(5, (seg + 12288) >>> 0, true);
            mapLongPage(6, seg >>> 0, true);
            mapLongPage(7, 102400, false);

            mMap[30] = mMap[28];
            mMap[31] = mMap[29];

            disableSlot100 = true;

            mmapReadable = (mmapReadable | 0xC0000000) >>> 0;
            mmapReadable = (mmapReadable & 0xFFF0FFFF) >>> 0;
            mmapWriteable = (mmapWriteable & 0xFFF0FFFF) >>> 0;

            return true;
    }

    mMap[30] = page170ofs;
    mMap[31] = (page170ofs + 1024) >>> 0;

    mmapReadable = ((mmapReadable | 0xC0000000) & 0xFFFFFFFF) >>> 0;
    mmapWriteable = ((mmapWriteable | 0xC0000000) & 0xFFFFFFFF) >>> 0;

    return true;
}


this.setMemoryModelByFDCBits = function(data) {
	
	  var d = (data & 0xFFFF)>>>0;
      if (SMK) {
         setSMKMode(d, false);
         return (d & 4) == 0;
      } else if (is11M) {
         return true;
      } else {
         var isReadable = true;
         switch(d & 12) {
         case 8:
			console.log("Trying to set BK10?!");
            //this.setBase10Model();
            break;
         case 9:
         case 10:
         case 11:
         default:
			console.log("Trying to set BK10 FDD10?!");
            //this.setFDD10Model();
            break;
         case 12:
            console.log("Trying to set BK10 BASIC?!");
			//this.setBASIC10Model();
            isReadable = false;
         }

         return isReadable;
      }
   } 
 
function smk_readWord(/*int*/ia, /*QBusReadDTO*/ result) {

	var C = (ia & 0xFFFE)>>>0; /*short*/
    var page = ia >>> 11;                 // 2KB pages
    var pageMask = (1 << page) >>> 0;

    var mapped = (mMap[page] + ((ia & 2047) >>> 1)) >>> 0;

    if ((mmapSpecial & pageMask) == 0) {

        if ( ia < (0xE000 + page160length) &&
            (mmapReadable & pageMask) != 0) {
				
            result.value = (memory[mapped] & 0xFFFF)>>>0;
            return true;
        }

        return false; // super.readWord
    } 

	result.value = 0;
	var replied = false;
		
	for (var /*QBusSlave*/ pli in plugins) {
			var plugin = plugins[pli];
			var base = plugin.getBaseAddress;
			if (base <= ia) {
				if (((ia - base) >>>1) < plugin.getNumWords) {
					replied |= plugin.readWord(ia, result);
					break;
				}
			}
	}
	
	if ( (mmapReadable & pageMask) != 0 &&
            ia < (0xE000 + page160length) ) {
			result.value |= ((memory[mapped] & 0xFFFF)>>>0);

		return true;
	}
		

	if (C == 65484) {
		result.value |= (ioreadreg | joystick.getIO())&0xFFFF>>>0;
		return true;
	}

	if (C == 65486) {
		var /*int*/tape = 32;

		result.value |= /*(short)*/tape | (keyboard.getKeyDown() ? 0 : 64) 
			| (is11M ? 49280 : 32912) | (syswritereg & 8);
		syswritereg &= 65527; 
		return true;
	}

	if (C == 65460) {
		result.value |= scrollReg;
		return true;
	}

	return (replied ? true : false);
    
}

 
function smk_writeByteAsWord(/*int*/ia, /*short*/d) {

 	var C = (ia & 0xFFFE)>>>0; /*short*/
    var page = ia >>> 11;
    var pageMask = (1 << page) >>> 0;
	var dL = d & 0xFF, dH = (d & 0xFF00), b = ((ia & 1) == 0);

    var mapped = (mMap[page] + ((ia & 2047) >>> 1)) >>> 0;

	var Wo = ( b ? ((memory[mapped] & 0xFF00) | dL) : ((memory[mapped] & 0xFF) | dH) );
	
    updatepixel(mapped,Wo);
	
    if ((mmapSpecial & pageMask) == 0) {

        if (  ia < (0xE000 + page160length) &&
            (mmapWriteable & pageMask) != 0) {
			
			memory[mapped] = Wo;
            return true;
        }

        return false;
    }
    
    if (is11M && (C == 65458))
    { 
      paletteReg = ( b ? ((paletteReg & 0xFF00) | dL) : ((paletteReg & 0xFF) | dH ) );
      scrdefs();
      return true;
    }
	
	for (var /*QBusSlave*/ pli in plugins) {
		var plugin = plugins[pli];
		var base = plugin.getBaseAddress;
		if (base <= ia) {
			if (((ia - base) >>>1) < plugin.getNumWords) {
				return plugin.writeByteAsWord(ia, Wo);
			}
		}
	}
	
	if (C == 65484)
		{
		if (b) {
			synth_guess |= 2;
			if (srend.On) {
				srend.updateTimer();
				if (srend.covox) srend.updateCovox(d);
				if(synth.On) synth.writeReg(/*(byte)*/((d^255)&255)>>>0 );
			}
			iowritereg = ((iowritereg & 0xFF00) | dL);
		} else {
			iowritereg = ((iowritereg & 0xFF) | dH);
		}
		return true;
	}

	if (ia == 65486)
		{
		syswritereg = /*(short)*/((syswritereg & 0xFF00) | dL | 8);
		if(srend.On) srend.updateBit(d & 64);
		synth_guess |= 1;
		return true;
		}
	if (ia == 65487)
		{
		syswritereg = ((syswritereg & 0xFF) | dH | 8);
		return true;
		}

	if (C == 65460) {
		scrollReg = ((scrollReg & 0xFF00) | dH);
		scrdefs();
		return true;
	}

	return false;

}


function smk_writeWord(/*int*/ia, /*short*/d) {
	
	var C = (ia & 0xFFFE)>>>0;
    var page = ia >>> 11;
    var pageMask = (1 << page) >>> 0;

    var mapped = (mMap[page] + ((ia & 2047) >>> 1)) >>> 0;
	
	updatepixel(mapped, d);

    if ((mmapSpecial & pageMask) == 0) {

        if ( ia < (0xE000 + page160length) &&
            (mmapWriteable & pageMask) != 0 ) {

            memory[mapped] = d;
            return true;
        }

        return false;
    }
	  
	if (is11M && (C == 65458))
		{
		paletteReg = d;
		scrdefs();
		return true;
		}
		  		  
	for (var /*QBusSlave*/ pli in plugins) {
		var plugin = plugins[pli];
		var base = plugin.getBaseAddress;
		if (base <= ia) {
			if (((ia - base) >>>1) < plugin.getNumWords) {
				return plugin.writeWord(ia, d);
			}
		}
	}

	var wW = false;
	if (ia < (0xE000 + page160length) && (mmapWriteable & pageMask) != 0) {
		memory[mapped] = d;
		wW = true;
	}

    if (C == 65484)
    {
      if (srend.On) {
        srend.updateTimer();
        if(srend.covox) srend.updateCovox(d);
        if(synth.On) synth.setRegIndex(((d^255)&255)>>>0);
      }
      iowritereg = d;
      return true;
    }
	
    if (C == 65486)
    {
	  if (is11M && (d & 2048) != 0) {
		doClassic11MMap(d);
		}
      else
      {
		syswritereg = (d | 8);
		if(srend.On) srend.updateBit(d & 64);
      }
      return true;
    }
	
    if (C == 65460)
    {
      scrollReg = /*(short)*/(d & 0x2FF);
      scrdefs();
      return true;
    }

    return (wW);
}

this.smk_writeWordBrute = function(/*int*/addr, /*short*/data) {
	
    var page = addr >>> 11;
    var pageMask = (1 << page) >>> 0;

    var mapped = (mMap[page] + ((addr & 2047) >>> 1)) >>> 0;
    memory[mapped] = (data & 0xFFFF)>>>0;
}

/* Standard BK cases */

  /*boolean*/this.readWord = function(/*int*/addr, /*QBusReadDTO*/ result)
  {
    var /*int*/ia = addr & 65535;
	
	if(SMK) return smk_readWord(ia,result);		// Too different memory handling
	
    var /*int*/page = ia >>> 13;
    var /*int*/mapped = mmap[page] + ((ia & 0x1FFF) >>> 1);
		
    if (page < 7)
    {	  
      if (mmap_readable[page] != 0) {
        result.value = memory[mapped]&0xFFFF>>>0;
        return true;
      }

      return true;	//super.readWord(addr, result);
    }

    for (var /*QBusSlave*/ pli in plugins) {
      var plugin = plugins[pli];
      var base = plugin.getBaseAddress;
      if (base <= ia) {
        if (((ia - base) >>>1) < plugin.getNumWords) {
			return plugin.readWord(addr, result);
		}
      }
    }
   
    if (mmap_readable[page] && (ia < 57344 + rom160length)) {
	  result.value = memory[mapped]&0xFFFF>>>0;
      return true;
    }
    
    var C = (ia & 0xFFFE)>>>0; /*short*/

    if (C == 65484) {
      result.value = /*(short)*/(ioreadreg | joystick.getIO())&0xFFFF>>>0;
      return true;
    }

    if (C == 65486) {
      var /*int*/tape = 32;

      result.value = /*(short)*/tape | (keyboard.getKeyDown() ? 0 : 64) 
			| (is11M ? 49280 : 32912);
      return true;
    }

    if (C == 65460) {
      result.value = scrollReg;
      return true;
    }

    return false;
  }

  this.readWORD = function(addr) {
	var DTO = QBusReadDTO(-1);
	this.readWord(addr,DTO);
	return DTO.value;
  }
  
  /*boolean*/this.writeByteAsWord = function(/*int*/addr, /*short*/data)
  {
    var /*int*/ia = addr & 65535;
	var d = ((data & 0xFFFF)>>>0);
	
	if(SMK) return smk_writeByteAsWord(ia,d);		// Too different memory handling
	
    var /*int*/page = ia >>> 13;
    var /*int*/mapped = mmap[page] + ((ia & 0x1FFF) >>> 1);
	var dL = data & 0xFF, dH = (data & 0xFF00), b = ((ia & 1) == 0);
	
	var Wo = ( b ? ((memory[mapped] & 0xFF00) | dL) : ((memory[mapped] & 0xFF) | dH) );    
    updatepixel(mapped,Wo);
    
    if (page < 7)
    {
      if (mmap_writeable[page])
      {
       memory[mapped] = Wo;
       return true;
      }
      return false;	//super.writeWord(addr, data);
    }

    var C = (ia & 0xFFFE)>>>0; /*short*/
    
    if (is11M && (C == 65458))
    { 
      paletteReg = ( b ? ((paletteReg & 0xFF00) | dL) : ((paletteReg & 0xFF) | dH ) );
      scrdefs();
      return true;
    }

    for (var /*QBusSlave*/ pli in plugins) {
      var plugin = plugins[pli];    
      var base = plugin.getBaseAddress;
      if (base <= ia) {
        if ((ia-base)/2 < plugin.getNumWords)
        {
          return plugin.writeByteAsWord(addr, d);
        }
      }
    }

    if (mmap_writeable[page] && (ia < 57344 + rom160length))
    {
      memory[mapped] = Wo;
      return true;
    }

    if (C == 65484)
    {
      if (b) {
        synth_guess |= 2;
        if (srend.On) {
          srend.updateTimer();
          if (srend.covox) srend.updateCovox(d);
          if(synth.On) synth.writeReg(/*(byte)*/((d^255)&255)>>>0 );
        }
        iowritereg = ((iowritereg & 0xFF00) | dL);
      } else {
        iowritereg = ((iowritereg & 0xFF) | dH);
      }
      return true;
    }

    if (ia == 65486)
    {
      syswritereg = /*(short)*/((syswritereg & 0xFF00) | dL);
      if(srend.On) srend.updateBit(d & 64);
	  synth_guess |= 1;
      return true;
    }
    if (ia == 65487)
    {
      syswritereg = ((syswritereg & 0xFF) | dH);
      return true;
    }

    if (C == 65460) {
      scrollReg = ((scrollReg & 0xFF00) | dH);
      scrdefs();
      return true;
    }
    return false; //super.writeByteAsWord(addr, data);
  }
  
  /*boolean*/this.writeByte = function(/*int*/addr, /*byte*/data) {
    var /*int*/ia = addr & 65535;
	var d = ((data & 0xFFFF)>>>0), b = (d&0xFF)>>>0;
    return this.writeByteAsWord(ia, (ia&1) ? ((b<<8)|0xFF) : (b|0xFF00));
  }

  
  /*boolean*/this.readByte = function(/*int*/addr, /*QBusReadDTO*/ result)
  {
	var ia = addr & 65535;  
    var a = this.readWord(ia, result);

    if (ia & 1) result.value = (result.value >>> 8);

    result.value = (result.value & 0xFF);
    return a;
  }

  /*boolean*/this.writeWord = function(/*int*/addr, /*short*/data)
  {
	var /*int*/ia = addr & 65535;
	var d = (data & 0xFFFF) >>> 0;
	
	if(SMK) return smk_writeWord(ia, d);
		
    var /*int*/page = ia >>> 13;
    var /*int*/mapped = mmap[page] + ((ia & 0x1FFF) >>> 1);

    updatepixel(mapped, d);
	 
    if (page < 7)
    {
      if (mmap_writeable[page])
      {
        memory[mapped] = d;
        return true;
      }
      return false; //super.writeWord(addr, data);
    }

    var C = (ia & 0xFFFE)>>>0;
	
    if (is11M && (C == 65458))
    {
      paletteReg = d;
      scrdefs();
      return true;
    }
		
    for (var /*QBusSlave*/ pli in plugins) {
      var plugin = plugins[pli];    
      var base = plugin.getBaseAddress;
      if (base <= ia) {
        if (((ia - base) >>>1) < plugin.getNumWords)
        {
          return plugin.writeWord(addr, d);
        }
      }
    }

    if (mmap_writeable[page] && (ia < 57344 + rom160length))
    {
      memory[mapped] = d;
      return true;
    }

    if (C == 65484)
    {
      if (srend.On) {
        srend.updateTimer();
        if(srend.covox) srend.updateCovox(d);
        if(synth.On) synth.setRegIndex(((d^255)&255)>>>0);
      }
      iowritereg = d;
      return true;
    }

    if (C == 65486)
    {
      if (is11M && ((d & 0x800) != 0))
      {
        var w = mmap_writeable, r = mmap_readable, m = mmap;
        var /*int*/sel = d & 0x1B;
        if (sel)
        {
          w[4] = false; w[5] = false;
          if (sel & 1)
          {
            r[4] = true; r[5] = true;
            m[4] = 94208; m[5] = 98304;
          } else if (sel & 2)
          {
            r[4] = true; r[5] = true;
            m[4] = 90112; m[5] = 86016;
          }
          else {
            r[4] = false; r[5] = false;
          }
        }
        else {
          w[4] = true; w[5] = true;
          r[4] = true; r[5] = true;
          sel = (d>>>8)&7;
          sel = ((sel^6)>>>0)<<13;
          m[4] = sel; m[5] = (sel + 4096);
        }

        sel = (d>>>12)&7;
        sel = ((sel^6)>>>0)<<13;
        m[2] = sel; m[3] = (sel + 4096);
      }
      else
      {
        syswritereg = d;
        if(srend.On) srend.updateBit(d & 64);
      }
      return true;
    }

    if (C == 65460)
    {
      scrollReg = /*(short)*/(d & 0x2FF);
      scrdefs();
      return true;
    }

    return false; //super.writeWord(addr, data);
  }

  /*int*/this.getBaseAddress = 0;

  /*int*/this.getNumWords = 0;
    
  /*boolean*/this.gotInterrupt = function()
  {
    for (var /*QBusSlave*/ pli in plugins) {
      var plugin = plugins[pli];
      if (plugin.gotInterrupt()) return true;
    }
    return false;
  }

  /*byte*/this.interruptVector = function()
  {
    for (var /*QBusSlave*/ pli in plugins) {
      var plugin = plugins[pli];
      if (plugin.gotInterrupt()) return plugin.interruptVector();
    }
    return -1;
  }

  /*void*/this.reset = function()
  {
    for (var /*QBusSlave*/ pli in plugins) {
      var plugin = plugins[pli];
      plugin.reset();
      }
    srend.clear(1);
  }

  this.irq = function() {
	if(is11M && timerEnabled()) cpu.irq();
  }
  
  /*boolean*/function timerEnabled() {
    return ((paletteReg & 0x4000) == 0);
  }

  /* DISPLAY */

  function updatepixel(addr, val)
  {
    if(gDATA == null || typeof(Px[addr])==="undefined") return;
    
    var q,p,i=0,w=Px[addr]*4,buf=[];
	
    for(q=0,p=Cmap + ((val & 0xFF) << 3); q<8; q++)
	 buf[i++]=modePaletteMaps[p++];
	
    for(q=0,p=Cmap + ((val >>> 8) << 3); q<8; q++)
	 buf[i++]=modePaletteMaps[p++];
	 
    for(i=0;i<16;i++,w+=4)
	{
	var b = buf[i];
	gDATA.data[w]=b[0];
	gDATA.data[w+1]=b[1];
	gDATA.data[w+2]=b[2];
	gDATA.data[w+3]=255;
	}
  }

   this.updCanvas = function()
  {
    CX.putImageData(gDATA,0, 0);	
  }
  
  this.cycleVideomodes = function() {
	videoMode = (videoMode+1)%3;
	scrdefs();
  }
  
  function scrdefs()
  {
    if (!is11M) Cmap = videoMode << 11;
    else if (videoMode == 0) Cmap = 0;
    else Cmap = (2 + (paletteReg >>> 8 & 0xF)) << 11;

    Base = ((is11M && ((paletteReg & 0x8000) == 0)) ? 57344 : 8192);
    Limit = (((scrollReg & 0x200) == 0) ? 64 : 256) << 5;
    scrollPos = ((scrollReg + 40 & 0xFF) * 32);
    self.DRAW();    
  }
  
  function /*void*/copyFramebufferFast()
  {
    var src=scrollPos,dst=0,q,p,J,a,l = Limit;
    Px=[]; Bf=[];

    while ((l--)>0) {
      J = (Base + src++);
      Px[J]=dst;      
      a = memory[J] & 0xFFFF;
	
      for(q=0,p=Cmap + ((a & 0xFF) << 3); q<8; q++)
	 Bf[dst++]=modePaletteMaps[p++];
	
      for(q=0,p=Cmap + ((a >>> 8) << 3); q<8; q++)
	 Bf[dst++]=modePaletteMaps[p++];
      src &= 8191;
    }

    while (dst < 131072)
	{
	J = (Base + src++);
	Px[J]=dst;
	src &= 8191;
	Bf[dst++]=[0,0,0];
	}
  }
  
  this.DRAW = function()
  {
  CS = document.getElementById("BK_canvas");
  if(CS==null) return 0;
  
  copyFramebufferFast();
  
  CX = CS.getContext('2d',{ willReadFrequently: true });
  gDATA = CX.getImageData(0, 0, 512, 256);

  for(var i=0,k=0;i<131072;i++,k+=4)
   {
    var b = Bf[i];
    gDATA.data[k]=b[0];
    gDATA.data[k+1]=b[1];
    gDATA.data[k+2]=b[2];
    gDATA.data[k+3]=255;
   }
 
   this.updCanvas();
   return 1;
  }
  
  /*
  FakeTape
   loads .bin,.cod files, or prepares for download
  */
  
  /* fast loader for BIN files on BK10, avoid monitor */
  this.LoadBinFast = function() {
	var r = cpu.regs;
	r[0]=32;r[1]=208;r[2]=65535;
	r[3]=33242;r[4]=77;r[5]=39998;
	r[6]=502;r[7]=39998;cpu.setPSW(136);
	self.writeWord(208, 3); self.writeWord(210, 0);
	self.TapeBinLoader();
	r[7]=this.readWORD(180);
  }
 
  this.TapeEMT36 = function() {
	  if( self.FakeTape.wr ) this.TapeBinSaver();
	  else this.TapeBinLoader();
  }
  
  this.TapeBinLoader = function() {
	
	// if should read tape
    if(cpu.regs[7] != (is11M ? 55692 : 39998)) return;

    var i,r = cpu.regs;
    var /*short*/ p = is11M ? r[0] : r[1];
    var /*QBusReadDTO*/ dto = new QBusReadDTO(-1); 
    var d = this.FakeTape.bytes;
    
    this.writeByte(/*(short)*/(is11M ? 42 : p+1), /*(byte)*/4);
    
    if (!this.readByte(p, dto)) return;
    var oper = dto.value&0xFF>>>0;
    if (oper == (is11M ? 1 : 3))
    {
      if (!this.readWord(/*(short)*/(p+2), dto)) return;
      var /*short*/ addr = dto.value;
      if (addr == 0)
        {
          addr = /*(short)*/(d[0]|(d[1]<<8))&0xFFFF>>>0;
        }
	
      console.log("Reading file "+this.FakeTape.filename+
	" at address "+addr.toString(8)+"\n");
	
      var /*short*/ size = /*(short)*/(d[2]|(d[3]<<8))&0xFFFF>>>0;
        
      for (i=0; i<size; i++) {
          this.writeByte(/*(short)*/(addr+i), /*(byte)*/d[4+i]);
        }
 
      if (is11M)
        {
          this.writeWord(/*(short)*/(p+24), addr);
          this.writeWord(/*(short)*/(p+26), size);
        }
      else
        {
          this.writeWord(/*(short)*/(p+22), addr);
          this.writeWord(/*(short)*/(p+24), size);
          this.writeWord(180, addr);
          this.writeWord(182, size);
        }
        
      var b,fill = false;
      for (i=0; i<16; i++)
        {
          if (!this.readByte(/*(short)*/(p+6+i), dto)) return;
          b = /*(byte)*/dto.value&0xFF>>>0;
          if (fill || (b==0))
          {
            fill = true;b = 32;
          }
          this.writeByte(/*(short)*/(p+(is11M ? 28 : 26)+i), b);
        }
        
    this.writeByte(/*(short)*/(p+1),0);
	
    this.readWord(r[6], dto);
	r[7] = dto.value&0xFFFF>>>0;
	r[6] = (r[6]+2)&0xFFFF>>>0;
	
	this.FakeTape.prep = false;
      
    }
  }  
  
  this.TapeBinSaver = function()  {
	
	// if should write tape
    if(cpu.regs[7] != (is11M ? 55692 : 39998)) return;
	
	var i,r = cpu.regs;
    var /*short*/ p = is11M ? r[0] : r[1];
    var /*QBusReadDTO*/ dto = new QBusReadDTO(-1);
	this.FakeTape.bytes = [];
    var d = this.FakeTape.bytes;
	
	this.readWord( 212, dto);
	var filesize = (dto.value & 0xFFFF)>>>0;
	this.readWord( 210, dto);
	var filestart = (dto.value & 0xFFFF)>>>0;

	// in reality program loads at address 003052 (=1578)
	d[0]=(filestart&255)>>>0;
	d[1]=((filestart>>8)&255)>>>0;
	d[2]=(filesize&255)>>>0;
	d[3]=((filesize>>8)&255)>>>0;
	
	for(var i=0; i<filesize; i++) {
		this.readByte( (filestart+i), dto);
		d[4+i]=(dto.value & 255)>>>0;
	}

	this.FakeTape.prep = false;
	
	this.writeByte(/*(short)*/(p+1),0);
	
    this.readWord(r[6], dto);
	r[7] = dto.value&0xFFFF>>>0;
	r[6] = (r[6]+2)&0xFFFF>>>0;

  }
  
  
  /*
	Can load BASIC,FOCAL,
  
  */
  
  this.loadROM = function(name, data) {
   var i,j=0, L = data.length, a = new Uint16Array(L>>1);
   for(i in a) a[i]=data[j++]+(data[j++]<<8);
   
   if(L<5000) {	// 4Kb?
	// disk controller rom
	//set11Model();			// 11m
	load160000(a);
	}
	else if (L<9000) {	// 8Kb?
		// basic, focal
	//set10Model();			// 10
	load120000(a);
	}
    else {	// larger 8Kb
	 //load at 0 everything
	//set11Model();			// set 11m
	load000000(a);
	}

   return;
  }

  this.addHDD = function() {
    if(!self.hdds) {
		plugins.push(hdc0);
		self.hdds = true;	
	}
  }
 
  this.addFloppies = function() {

    if(!self.dsks) {
		plugins.push(fdc);
		self.dsks = true;	
	}
    else fdc.mountDisks();
	
	if(SMK) self.addHDD();
		
    if(!is11M && !self.remap) {
	/* 0o120000  JMP @#160000   to 327 disk driver */
        self.writeWord(40960, 95);
        self.writeWord(40962, 57344);
	}
  }
  
  this.keyboard_punch = function(key) { keyboard.punch(key); }
  this.keyboard_setKeyDown = function(dn) { keyboard.setKeyDown(dn); }
  this.joystick_setState =  function(state) { joystick.setState(state); }
  this.sound_push = function(s) {
	if(srend.On!=(soundOn==1) /*Global UI */) srend.setSound(soundOn);
	//else if(srend.On) srend.pushSound();
	} 
  this.soundClear = function() { srend.clear(1); srend.adjConstSpeed(); } 
  this.sounds = function( synthOn, synthMix, synthpaused, covoxOn ) {
	if(synthOn || covoxOn) { soundOn=1; self.sound_push(); }
	synth.On = synthOn;
	srend.covox = covoxOn;
	synth.mixed = synthMix;
	if(synthpaused) srend.initpause = 3333;
	else if(!soundOn || (!synthOn) || covoxOn) srend.initpause = 0;
	}
	this.sound_clear_allow = function(yn) {
	srend.allowClear = yn;
    }
  this.getSoundGuess = function() { return synth_guess; }
  this.setDirtyCovox = function() { srend.dirty = true; }
  
  init();
  
  memLoads0();
  
  this.setBASIC10Model();
  
  srend.covox = false;
  srend.setSynth(synth);
  
  return self;
}

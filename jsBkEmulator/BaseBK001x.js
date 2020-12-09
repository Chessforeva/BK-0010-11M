
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

  var /*CPUTimer*/ timer = new CPUTimer();
  var /*Keyboard*/ keyboard = new Keyboard();
  var /*SystemRegs*/ sregs = new SystemRegs();
  var /*Joystick*/ joystick = new Joystick();  
  var plugins = [];

  var /*SoundRenderer*/ srend = new SoundRenderer();
  var /*AY8910*/ synth = new AY8910();
  var /*int*/tapeDelay = 0;
  var /*long*/lastTape = 0;
  var /*int*/TAPE_SPEED = 272;
  var /*boolean*/covoxEnabled;
  var /*boolean*/covoxSmart;
  var /*boolean*/covoxByte;
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
  
  var CS,CX,gDATA,Px=[],Bf=[];
  var Cmap,Base,Limit;
  
  var cyclooped = 0;	// counters
  var cyclast = 0;
  
  this.FakeTape = { prep:false /* is ready to load*/, filename:"", bytes:[] };
  this.dsks = false;
  
  this.isM = function() { return is11M; }
  
  this.remap = false;
	      
  this.minimizeCycles = function()
  {
   cyclooped = (cpu.Cycles-cyclast);
  
   timer.updateTimer();
   if(srend.On) srend.updateTimer();
   if(self.dsks) fdc.updateTimer();
   
   var n = cpu.Cycles - 1000;
   cpu.Cycles-=n;
   timer.cycles-=n;
   if(srend.On) srend.cycles-=n;
   if(self.dsks) fdc.mCyc(n);
	
   cyclast = cpu.Cycles;
  }
  
  function loadtomem(addr,romarr,skip)
  {
    var a=addr, n=romarr.length+skip, i=0;
    while(i<n) memory[a++] = /*(short)*/romarr[i++];
  }
  
  // Address for Basic,Focal,MSTD ROM 
  function load120000(a)
  {
  loadtomem(69632,a,0);
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
    
    var i;
    for(i=0;i<8;i++)
	{
	mmap_writeable[i] = (i<4);
	mmap_readable[i] = true;
	mmap[i] = (i>3 ? 65536 : 0) + (4096 * (i%4));
	}

    var val = 0, flag = 256;
    for (i=0; i<16384; i++, flag--)
	{
	memory[i] = val
	val = 0xFFFF-val;

	if (flag == 192)
		{
		val = 0xFFFF-val;
		flag = 256;
		}
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
    loadtomem(102400,disk326_data,0);	//4KB disk hE000 @#160000
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
    self.addFloppies();
  }

  

  
  /*void*/this.setFDD11Model = function() {
    memLoads0();
    is11M = true;
    var m = mmap, r = mmap_readable, w = mmap_writeable;  
    m[2] = 8192; m[3] = 12288; m[4] = 90112;
    m[5] = 86016; m[6] = 81920; m[7] = 102400;
    r[4] = true; r[5] = true; r[6] = true; r[7] = true;
    w[4] = false; w[5] = false; w[6] = false; w[7] = false;
    rom160length = 4096;
    scrdefs();
    self.addFloppies();
  }

  /*boolean*/this.readWord = function(/*int*/addr, /*QBusReadDTO*/ result)
  {
    var /*int*/ia = addr & 65535;
    var /*int*/page = ia >>> 13;
    var /*int*/mapped = mmap[page] + ((ia & 0x1FFF) >>> 1);

    if (page < 7)
    {
      if (mmap_readable[page] != 0) {
        result.value = memory[mapped]&0xFFFF>>>0;
        return true;
      }

      return true;	//readWord(addr, result);
    }

    for (var /*QBusSlave*/ pli in plugins) {
      var plugin = plugins[pli];
      var base = plugin.getBaseAddress();
      if (base <= ia) {
        if ((ia - base) / 2 < plugin.getNumWords())
          return plugin.readWord(addr, result);
      }
    }
   
    if (mmap_readable[7] && (ia < 57344 + rom160length)) {
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
    var /*int*/page = ia >>> 13;
    var /*int*/mapped = mmap[page] + ((ia & 0x1FFF) >>> 1);

    var Wo = ((ia & 1) == 0) ?
          ((memory[mapped] & 0xFF00) | (data & 0xFF)) :
	((memory[mapped] & 0xFF) | (data & 0xFF00));
    
    updatepixel(mapped,Wo);
    
    if (page < 7)
    {
      if (mmap_writeable[page] != 0)
      {
       memory[mapped] = Wo;
       return true;
      }
      return false;	//super.writeWord(addr, data);
    }

    var C = (ia & 0xFFFE)>>>0; /*short*/
    
    if (is11M && (C == 65458))
    { 
      paletteReg = ((ia & 1) == 0) ?
          ((paletteReg & 0xFF00) | (data & 0xFF)) :
	((paletteReg & 0xFF) | (data & 0xFF00));
	
      scrdefs();
      return true;
    }

    for (var /*QBusSlave*/ pli in plugins) {
      var plugin = plugins[pli];    
      var base = plugin.getBaseAddress();
      if (base <= ia) {
        if ((ia-base)/2 < plugin.getNumWords())
        {
          return plugin.writeByteAsWord(addr, data);
        }
      }
    }

    if ((mmap_writeable[7] != 0) && (ia < 57344 + rom160length))
    {
      memory[mapped] = Wo;
      return true;
    }

    if (C == 65484)
    {
      if ((ia & 1) == 0) {
        if (srend.On) {
          srend.updateTimer();
          if (covoxEnabled) {
            if (covoxSmart) {
              if (((((iowritereg^data)&0xFF)>>>0) != 8) && covoxByte)
                srend.updateCovox(data);
              covoxByte = true;
            } else {
              srend.updateCovox(data);
            }
          }
	  
        if(synth.On) synth.writeReg(/*(byte)*/((data^255)&255)>>>0 );
        }
        iowritereg = /*(short)*/((iowritereg & 0xFF00) | (data & 0xFF));
      } else {
        iowritereg = /*(short)*/((iowritereg & 0xFF) | (data & 0xFF00));
      }
      return true;
    }

    if (ia == 65486)
    {
      syswritereg = /*(short)*/((syswritereg & 0xFF00) | (data & 0xFF));
      if(srend.On) srend.updateBit(data & 0x40);
      return true;
    }
    if (ia == 65487)
    {
      syswritereg = /*(short)*/((syswritereg & 0xFF) | (data & 0xFF00));
      return true;
    }

    if (C == 65460) {
      scrollReg = /*(short)*/((scrollReg & 0xFF00) | (data & 0xFF));
      scrdefs();
      return true;
    }
    return false; //super.writeByteAsWord(addr, data);
  }
  
  /*boolean*/this.writeByte = function(/*int*/addr, /*byte*/data) {
    var b = data&0xFF>>>0;
    return this.writeByteAsWord(addr,
	/*(short)*/(addr&1) ? ((b<<8)|0xFF) : (b|0xFF00));
  }

  
  /*boolean*/this.readByte = function(/*int*/addr, /*QBusReadDTO*/ result)
  {
    var /*boolean*/a = this.readWord(addr, result);

    if (addr & 1)
    {
      result.value = /*(short)*/(result.value >>> 8);
    }
    result.value = /*(short)*/(result.value & 0xFF);
    return a;
  }

  /*boolean*/this.writeWord = function(/*int*/addr, /*short*/data)
  {
    var /*int*/ia = addr &= 65535;
    var /*int*/page = ia >>> 13;
    var /*int*/mapped = mmap[page] + ((ia & 0x1FFF) >>> 1);
    var d = data&0xFFFF>>>0;
    
    updatepixel(mapped, d);
	 
    if (page < 7)
    {
      if (mmap_writeable[page] != 0)
      {
        memory[mapped] = d;
        return true;
      }
      return false; //super.writeWord(addr, data);
    }

    var C = (ia & 0xFFFE)>>>0; /*short*/
	
    if (is11M && (C == 65458))
    {
      paletteReg = d;
      scrdefs();
      return true;
    }

    for (var /*QBusSlave*/ pli in plugins) {
      var plugin = plugins[pli];    
      var base = plugin.getBaseAddress();
      if (base <= ia) {
        if ((ia - base) / 2 < plugin.getNumWords())
        {
          return plugin.writeWord(addr, d);
        }
      }
    }

    if ((mmap_writeable[7] != 0) && (ia < 57344 + rom160length))
    {
      memory[mapped] = d;
      return true;
    }

    if (C == 65484)
    {
      if (srend.On) {
        srend.updateTimer();
        if (covoxEnabled) {
          if (covoxSmart) {
            if (((((iowritereg ^ d) & 0xFFFF)>>>0) != 8) && (!covoxByte))
              srend.updateCovox(d);
            covoxByte = false;
          } else {
            srend.updateCovox(d);
          }
        }
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
        if(srend.On) srend.updateBit(d & 0x40);
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

 /*int*/this.getBaseAddress = function()
  {
    return 0;
  }

  /*int*/this.getNumWords = function()
  {
    return 0;
  }

    
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

  /*void*/this.setCovoxMode = function(/*int*/mode) {
    switch (mode)
    {
    case 0:
      covoxSmart = false;
      covoxEnabled = false;
      break;
    case 2:
      covoxSmart = true;
      covoxEnabled = true;
      break;
    case 1:
    default:
      covoxSmart = false;
      covoxEnabled = true;
    }
    srend.covox = covoxEnabled;
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
  
  CX = CS.getContext('2d');
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
   Only loads .bin files
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
  
  /*
	Can load BASIC,FOCAL,
  
  */
  
  this.loadROM = function(name, data) {
   var i,j=0,a = new Uint16Array(data.length/2);
   for(i in a) a[i]=data[j++]+(data[j++]<<8);
   set10Model();
   load120000(a);
   return;
  }
 
  this.addFloppies = function() {

      if(!self.dsks) {
	plugins.push(fdc);
	self.dsks = true;	
	}
      else fdc.mountDisks();
      
      if(!is11M && !self.remap) {
	/* 0o120000  JMP @#160000   to 326 disk driver */
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
	synth.mixed = synthMix;
	if(synthpaused) srend.initpause = 3333;
	else if(!soundOn || (!synthOn) || covoxOn) srend.initpause = 0;
	self.setCovoxMode( covoxOn?1:0 );
	}

  init();
  
  memLoads0();
  
  self.setCovoxMode(0);	/* No Covox, sounds like a drill on WebAudio */
  self.setBASIC10Model();
  srend.setSynth(synth);
  
  return this;
}

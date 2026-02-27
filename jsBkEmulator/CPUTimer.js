
CPUTimer = function()
{
  var self = this;
  
  var /*short*/start;
  var /*short*/count;
  var /*short*/config;
  
  /*
    It takes 2,812 seconds for timer (on 3MHz BK-0010) to count 0... to 0xFFFF
    So, (3m cycles * 2.812)/0x10000 = 128
  */
  var /*long*/period = 128;
  
  self.cycles = 0;

  /*int*/this.getBaseAddress = 65478;

  /*int*/this.getNumWords = 3;

  /*boolean*/this.gotInterrupt = function()
  {
    return false;
  }

  /*byte*/this.interruptVector = function()
  {
    return 0;
  }

  /*boolean*/this.readWord = function(/*int*/addr, /*QBusReadDTO*/ result)
  {
    self.updateTimer();

    switch (addr)
    {
    case 65478:
      result.value = start;
      return true;
    case 65480:
      result.value = count;
      return true;
    case 65482:
      result.value = config;
      return true;
    case 65479:
    case 65481:
    }
    return false;
  }

  /*boolean*/this.writeByteAsWord = function(/*int*/addr, /*short*/data)
  {
    self.updateTimer();
    return true;
  }

  /*boolean*/this.writeWord = function(/*int*/addr, /*short*/data)
  {
    self.updateTimer();
    
    switch (addr) {
    case 65478 /*177706*/:
      start = data&0xFFFF>>>0;

      return true;
    case 65480 /*177710*/:
      return true;
    case 65482:/*177712*/
      setConfig(data);
      return true;
    case 65479:
    case 65481: }
    return false;
  }

  /*void*/this.reset = function()
  {
    start = 4608;
    count = 65535;
    config = 65280;
    self.cycles = 0;
  }

  function /*void*/setConfig(/*short*/data) {
    var /*int*/a = 128;

    if ( data & 0x40 ) {
      a <<= 2;
    }
    if ( data & 0x20 ) {
      a <<= 4;
    }
    
    period = a;

    count = start;

    config = /*(short)*/(data | 0xFF00);
  }
  

  /*void*/this.updateTimer = function()
  {
    var d = (cpu.Cycles - self.cycles);

    if ( d < period) {
      return;
    }
	
	
    var /*long*/c = (d / period)|0;

    self.cycles += c * period;

    if ((config & 0x1) != 0)
    {
      count = start;
      return;
    }

    if ((config & 0x10) == 0) {
      return;
    }
   
   flag_timer_start_low = (((count/start)>1) ? start : 0);		// If low then lags will be ...
	
   
    if (c >= (count & 0xFFFF))
    {
      if ((config & 0x4) != 0)
      {
        config |= 0x80;
      }
      if ((config & 0x2) == 0)
      {
        if ((config & 0x8) != 0)
        {
          config = (config & 0xFFEF)>>>0;
          count = start;
          return;
        }

       if (start == 0) {
          count = ((count - c) & 0xFFFF )>>>0; 
        } else {
          count = (((start - (c - count)) % start) & 0xFFFF )>>>0;
        } 
	
        return;
      }
    }
  
    count = ((count - c) & 0xFFFF )>>>0;
  
  }
  
  return self;
}

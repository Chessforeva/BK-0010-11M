
Keyboard = function()
{
  var /*short*/keycode = 0;
  var /*short*/status = 64;
  var /*boolean*/keyDown = false;

  /*int*/this.getBaseAddress = function()
  {
    return 65456;
  }

  /*int*/this.getNumWords = function()
  {
    return 2;
  }

  /*boolean*/this.readWord = function(/*int*/addr, /*QBusReadDTO*/ result)
  {
    if (addr == 65456) {
      result.value = status;
      return true;
    }
    status &= 0xFF7F;
    result.value = /*(short)*/(keycode & 0x7F);
    return true;
  }

  /*boolean*/this.writeByteAsWord = function(/*int*/addr, /*short*/data)
  {
    return this.writeWord(addr, data);
  }

  /*boolean*/this.writeWord = function(/*int*/addr, /*short*/data)
  {
    if (addr == 65456)
    {
      status = /*(short)*/((status & 0xFFBF) | (data & 0x40));
      return true;
    }
    return false;
  }

  /*boolean*/this.gotInterrupt = function()
  {
    return ((status & 0xC0)>>>0 == 128);
  }

  /*byte*/this.interruptVector = function()
  {
    status &= 0xFF7F;
    return /*(byte)*/(((keycode & 0x80) != 0) ? 188 : 48);
  }

  /*void*/this.reset = function()
  {
    if (!keyDown)
    {
      keycode = 0;
      status = 64;
    }
    else
    {
      status = 192;
    }
  }

  /*void*/this.punch = function(/*byte*/key)
  {
    keycode = /*(short)*/(key & 0xFF)>>>0;
    status |= 0x80;
    keyDown = true;
  }

  /*void*/this.setKeyDown = function(/*boolean*/isDown)
  {
    keyDown = isDown;
  }

  /*boolean*/this.getKeyDown = function() {
    return keyDown;
  }
  
  return this;
}

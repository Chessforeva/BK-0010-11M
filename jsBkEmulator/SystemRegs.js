
SystemRegs = function()
{
  /*int*/this.getBaseAddress = function()
  {
    return 65472;
  }

  /*int*/this.getNumWords = function()
  {
    return 3;
  }

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
    switch (addr) {
    case 65472:
      result.value = 0xFFCE;
      return true;
    case 65474:
      result.value = 0xFFFF;
      return true;
    case 65476:
      result.value = 0xFF20;
      return true;
    case 65473:
    case 65475: }
    return false;
  }

  /*boolean*/this.writeByteAsWord = function(/*int*/addr, /*short*/data)
  {
    return true;
  }

  /*boolean*/this.writeWord = function(/*int*/addr, /*short*/data)
  {
    return true;
  }

  /*void*/this.reset = function()
  {
  }
}

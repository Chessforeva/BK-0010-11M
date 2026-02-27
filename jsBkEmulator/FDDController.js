
FDDController = function()
{
  var self = this;
  
  var DRIVES_MAX = 2;	// 2 disks only A: B:
  
  var D = []; // list of drives
  var /*FloppyDisk*/ drive = null;
  var /*short*/controlReg = 0;
  var /*boolean*/seekingMarker = true;
  var /*boolean*/diskEnabled = false;
  var /*boolean*/isReadable = true;
  
  var fstSmk = true;
  
  self.drives = D;

  /*int*/this.getBaseAddress = 65112;

  /*int*/this.getNumWords = 2;

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
    this.updateTimer();

    if (!isReadable) {
      return false;
    }
    result.value = 0;

    var C = (addr & 0xFFFE)>>>0;
    
    var head = ((controlReg >>> /*HEAD*/5) & 1);
    
    if (C == 65112) {
      if (diskEnabled)
      {
        var /*int*/a = drive.getStatus(head);
        if (seekingMarker) {
          if (!drive.isMarkerPos(head))
            a &= 0xFF7F;
          else
	    {
            seekingMarker = false;
	    }
        }
        result.value = (/*(short)*/a & 0xFFFF)>>>0;
      }
      return true;
	  }
    if (C == 65114) {
      if (diskEnabled)
        result.value = /*(short)*/drive.getData(head)&0xFFFF>>>0;
      return true;
    }
    return false;
  }

  /*void*/this.reset = function()
  {
    controlReg = 0;
    seekingMarker = true;
    diskEnabled = false;
  }

  /*void*/this.shutdown = function()
  {
      for(var j in D) D[j].unmountImage();      
      D = []; self.drives = D;
  }
  
  /*boolean*/this.writeByteAsWord = function(/*int*/addr, /*short*/data)
  {
    var A = (addr & 0xFFFF)>>>0;
    if (A == 65112)
      return this.writeWord(65112, /*(short)*/(controlReg & 0xFF00 | data & 0xFF));
    if (A == 65113) {
      return this.writeWord(65112, /*(short)*/(controlReg & 0xFF | data & 0xFF00));
    }
    return this.writeWord(A, data);
  }

  /*boolean*/this.writeWord = function(/*int*/addr, /*short*/data)
  {
    this.updateTimer();

    var C = (addr & 0xFFFE)>>>0;
	var d = (data & 0xFFFF)>>>0;
	
    if (C == 65112)
    {

      var /*int*/a = (controlReg ^ d)>>>0;
		
      if ( a & 19 )
      {
        if (diskEnabled) {
          drive.flush();
        }
	
	/*set drive*/
	
	    switch (d & 19)
		{
		case 17: drive = D[0]; break;
		case 18: drive = D[1]; break;
		default: drive = null;
		}
	
        diskEnabled = (drive != null);
      }  

	  if(!SMK) {

    // ... existing FDD model switching logic ...


      if (a & 0xC) {	/* Actually error case */
	  
        base.remap = true;	// do not reload memory
        switch (data & 0xC)
        {
        case 12:
          base.setBASIC10Model();
          console.log("FDC: setBASIC10Model");
          isReadable = false;
          break;
        case 8:
          base.setBase10Model();
          console.log("FDC: setBase10Model");
          isReadable = true;
          break;
        default:
          if(base.isM()) {
			base.setFDD11Model();
			console.log("FDC: setFDD11Model");
		}
	  else {
			base.setFDD10Model();
			console.log("FDC: setFDD10Model");
			}
	  
          isReadable = true;
        }
        base.remap = false;

	   }
	  
	  }

      if (diskEnabled)
      {
        if (((a & 0x80) != 0) && ((d & 0x80) != 0))
        {
          if (d & 0x40) {
            drive.stepPlus();
	    }
          else {
            drive.stepMinus();
          }
        }

        if (( a & 0x200/*WRMARKER*/) != 0) {
          drive.setMarker( (d & 0x200/*WRMARKER*/)!=0 );
        }
      }
      if (d & 0x100) {
        seekingMarker = true;
      }
	  
	  if (SMK) {
		  isReadable = base.setMemoryModelByFDCBits(d);
      }
	  
      controlReg = d;
	}
	
    else
		if (C == 65114) {
			seekingMarker = false;
			if (diskEnabled)
				drive.deferredWrite((controlReg >>> /*HEAD*/5) & 1, d);
		} else
			{ return false; }
    return true;
  }
  
  this.updateTimer = function() {
	for(var j in D) D[j].updateTimer();
  }
  
  this.mCyc = function(n) {
  	for(var j in D) D[j].cycles-=n;
  }
  
  
  this.mountDisks = function() {
	for(var j in D) D[j].mountImage();
  }
  
  /* this adds disks A:,B:,C:,D: */
  this.addDisk = function(name,data) {
	var c = D.length, ok = (c<DRIVES_MAX);
	if(ok) {
	 D[c] = new FloppyDisk(name,data,String.fromCharCode(65+c)+':');
	 D[c].mountImage();
	 }
	return ok;
  }
  
  return self;
}

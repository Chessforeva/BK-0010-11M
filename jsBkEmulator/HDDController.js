/*

HDD Image oparetions

*/

HDDController = function()
{
	var self = this;

	this.getBaseAddress = 65504;

	this.getNumWords = 8;			// o177750 to o177766

	this.gotInterrupt = function() {
      return false;
	}
	
	this.interruptVector = function() {
      return 0;
	}
	
	this.reset = function() {}
	
	this.hdd = null;

	var verbose = false;

	var ideError = 1;
	var ideTrkHigh = 0;
	var ideTrkLow = 0;
	var ideDevHead = 0;
	var ideSector = 0;
	var ideCount = 0;
	var ideFeatures = 0;
	var ideStatus = 0;
	var mounted = false;
	var cylinders = 0xFFFF;
	var heads = 16;
	var sectors = 255;
	var firstDataSector = 1; 
	var /*HDD*/ drive = null;
	var drive_selected = 0;

	this.mount = function(/*HDD*/newDrive) {
      if (newDrive != drive) {
         if (drive != null) {
            drive.unmount();
         }

         drive = newDrive;
         if (newDrive == null) {
            mounted = false;
         } else {
            mounted = true;
            cylinders = drive.HDDStru.tracks;
            sectors = drive.HDDStru.sectors;
            heads = drive.HDDStru.heads;
			firstDataSector = 1;
            var totalSectors = drive.getSectorCount();
            if (totalSectors < ( firstDataSector + sectors )) {
               cylinders = 0;
               mounted = false;
               drive = null;
            } else {
               cylinders = ((totalSectors - firstDataSector) / (heads * sectors))|0;
            }
			this.hdd = drive;
         }
      }
   }
   
   /*boolean*/ this.setGeometry = function(newHeads, newSectors) {
      if (drive != null && newHeads > 0 && newSectors > 0) {
         heads = newHeads;
         sectors = newSectors;
         cylinders = ((drive.getSectorCount() - firstDataSector) / (heads * sectors))|0;
         drive.HDDStru.sectors = sectors;
         drive.HDDStru.heads = heads;
         drive.HDDStru.tracks = cylinders;
         return true;
      } else {
         return false;
      }
   }
   
   /*int*/function translateCHS( cylinder, head, sector ) {
      var r = 0xFFFF;
	  if( cylinder < cylinders &&
				head < heads &&
				sector <= sectors ) {
			r = (((cylinder * heads) + head) * sectors) + sector;
		}
	  return r;	
   }

   /*int*/ function translateLBA( cylinder, head, sector ) {
      return 0xFFFF;
   }

   /*int*/ function sectorFromCHS() {
      var trck = (ideTrkHigh & 255) | ((ideTrkLow & 255) << 8);
      return translateCHS(trck, ideDevHead & 15, ideSector & 255);
   }

   function execWriteData(data) {
      if (drive != null) {
         drive.writeWord((data & 0xFFFF)>>>0);
      }

   }

   function execReadData() {
      return ( drive != null ? drive.readWord() : 0xFFFF );
   }

   function execReset() {
      ideStatus = 64;
      ideError = 4;
   }
   
   /*
   STAT_ERR = 1; STAT_DRQ = 8; STAT_DF = 32; STAT_DRDY = 64; STAT_BSY = 128; ERR_ABRT = 4;
   */
   
   this.execCommand = function(command) {

      command = (command & 255)>>>0;
      if (drive != null && drive.enabled()) {
         var startSector = 0;		  
         switch(command) {
         case 0:
            ideStatus = 65; ideError = 4; break;
         case 8:
            execReset(); break; 
         case 32:
         case 33:
            ideStatus = 64;
            startSector = sectorFromCHS();
            if(verbose) console.log("Reading " + ideCount + " sectors starting from " + startSector);
            if(!drive.startRead( startSector, ideCount )) {
               ideStatus |= 1;	
            }				
            break;
         case 48:
         case 49:
            ideStatus = 64;
            startSector = sectorFromCHS(); 
            if(verbose) console.log("Writing " + ideCount + " sectors starting from " + startSector);
            if(!drive.startWrite( startSector, ideCount )) {
               ideStatus |= 1;	
            }				
            break;		 
         case 64:
         case 65:
         case 112:
         case 196:
         case 197:
         case 198:
         case 224:
         case 226:
         case 230:
         case 239:
            break;
         case 144:
            ideError = 1; break;
         case 145:
            var newSectors = ideCount & 255;
            var newHeads = (ideDevHead & 15) + 1;
            if(verbose) console.log("Set Heads:Sectors = (" + newHeads + ":" + newSectors + "), but doing nothing" );
            self.setGeometry(heads, sectors);
            ideStatus = 64;
            break;			
         case 225:
            ideStatus = 64; break;
         case 227:
            ideStatus = 64; break;
         case 229:
            ideCount = 255; ideStatus = 64; break;
         case 236:
            ideStatus = 64;
            var q = drive.startRead(0, 1);
            if(verbose) console.log("start read, " + (q ? "reading" : "failed"));
            break;
         default:
            if(verbose) console.log("Unsupported command " + command);		 
            ideStatus = 65; ideError = 4; break;
         }

      } else {
         ideStatus = 65; ideError = 4;
      }
   }


   /*bool*/ this.readWord = function( addr, /*QBusReadDTO*/ result, /*bool*/ opcode) {
	   
      if (!mounted) {
        result.value = 46705;
        return true;
      }
      var r = 0;	// response
      switch(addr) {
      case 65504:	// IDE_CMD, IDE_STATUS
        r = 64;
        if (drive.getDataRequest()) {
          r |= 8;
        }
        if(verbose) console.log("get status");
        break;
      case 65505:
      case 65507:	// IDE_RESET, IDE_STATUS2
      case 65509:
      case 65511:
      case 65513:
      case 65515:
      case 65517:
         break;
      case 65506:	// IDE_DEV_HEAD
         if(verbose) console.log("get device head");
         r = ideDevHead; break;
      case 65508:	// IDE_TRK_LOW
         if(verbose) console.log("get track low");
         r = ideTrkLow; break;
      case 65510:	// IDE_TRK_HIGH
         // Bit 4 is the Magic Bit
         //drive_selected = (ideTrkHigh & 0x10) ? 1 : 0;
         if(verbose) console.log('' + drive_selected + " is the current drive");
         if(verbose) console.log("get track high");
         r = ideTrkHigh; break;
      case 65512:	// IDE_SECTOR
         if(verbose) console.log("get sector");	  
         r = ideSector; break;
      case 65514:	// IDE_COUNT
         if(verbose) console.log("get count");
         r = ideCount; break;
      case 65516:	// IDE_FEATURES, IDE_ERROR
         if(verbose) console.log("get feat.,error");
         r = ideError; break;
      case 65518:	// IDE_DATA
         r = execReadData();
         if(verbose) console.log("read data: o" + r.toString(8) + " ("+ r + ")"); 
         break;
      default:
         break;
      }

      result.value = ((r^0xFFFF) & 0xFFFF) >>> 0;
      return true;
   }

  /*bool*/ this.writeWord = function( addr, data ) {

      if (!mounted) {
        return true;
      }

      var m = ((data ^ 0xFFFF) & 0xFFFF) >>> 0;	// masked
	  
      if(verbose) console.log("Write o" + addr.toString(8) + " (" + addr + "): " + m); 
      switch(addr) {
      case 65504:
         if ((ideDevHead & 16) == 0) {
            if(verbose) console.log("cmd");
            this.execCommand(m);
         }
		 break;
      case 65505:
      case 65509:
      case 65511:
      case 65513:
      case 65515:
      case 65517:
         break;
      case 65506:
         if(verbose) console.log("set device head");
         ideDevHead = (m & 15)>>>0; break;
      case 65507:
         if(verbose) console.log("reset");
         execReset(); break;
      case 65508:
         if(verbose) console.log("set track low");
         ideTrkLow = m; break;
      case 65510:
         // Bit 4 is the Magic Bit
         drive_selected = (m & 0x10)>>>0;
		 if(verbose) console.log('' + drive_selected + " drive selected");
         if(verbose) console.log("set track high");
         ideTrkHigh = m; break;
      case 65512:
         if(verbose) console.log("set sector");
         ideSector = m; break;
      case 65514:
         if(verbose) console.log("set count");
         ideCount = m; break;
      case 65516:
         if(verbose) console.log("set features");
         ideFeatures = m; break;
      case 65518:
         execWriteData( m ); break;
      default:
         break;
      }

      return true;
   }

   /*bool*/ this.writeByteAsWord = function( addr, data ) {
      return this.writeWord(addr, data);
   }
   
	return self;
}


// This is a substitute for nothing

DummyHDDController = function()
{
	
	var self = this;

	this.getBaseAddress = 65504;

	this.getNumWords = 8;

	this.gotInterrupt = function() {
      return false;
	}
	
	this.interruptVector = function() {
      return 0;
	}
	
	this.reset = function() {}
	
	
   /*bool*/ this.readWord = function( addr, /*QBusReadDTO*/ result, /*bool*/ opcode) {
      result.value = 0;
      return true;
   }

   /*bool*/ this.writeWord = function( addr, data ) {
      return true;
   }

    /*bool*/ this.writeByteAsWord = function( addr, data ) {
      return true;
   }
	
	return self;
}

/* Not used */
AltproHDDController = function()
{
	var self = this;

	this.getBaseAddress = 65504;

	this.getNumWords = 8;

	this.gotInterrupt = function() {
      return false;
	}
	
	this.interruptVector = function() {
      return 0;
	}
	
	this.reset = function() {}

	var ideError = 1;
	var ideTrkHigh = 0;
	var ideTrkLow = 0;
	var ideDevHead = 0;
	var ideSector = 0;
	var ideCount = 0;
	var ideFeatures = 0;
	var ideStatus = 0;
	var mounted = false;
	var cylinders = 0;
	var heads = 16;
	var sectors = 255;
	var /*HDD*/ drive = null;
	var firstDataSector = 1; 

	this.mount = function(/*HDD*/ newDrive) {
      if (newDrive != drive) {
         if (drive != null) {
            drive.shutdown();
         }

         drive = newDrive;
         if (newDrive == null) {
            mounted = false;
         } else {
            mounted = true;
            var totalSectors = newDrive.getSectorCount();
            if (totalSectors < (firstDataSector + sectors)) {
               cylinders = 0;
               mounted = false;
               drive = null;
            } else {
               cylinders = ((totalSectors - firstDataSector) / (heads * sectors))|0;
            }
         }
      }
   }

   /*int*/function translateCHS( cylinder, head, sector ) {
      return (cylinder < cylinders && head < heads && sector <= sectors ?
		((cylinder * heads + head) * sectors) + sector :
		-1);
   }

   /*int*/ function translateLBA( cylinder, head, sector ) {
      return -1;
   }

   /*int*/ function sectorFromCHS() {
      var trck = (ideTrkLow & 255) | ((ideTrkHigh & 255) << 8);
      return translateCHS(trck, ideDevHead, ideSector);
   }

   this.execWriteData = function(data) {
      if (drive != null) {
         drive.writeWord(data);
      }

   }
   
   /*short*/ function execReadData() {
      return ( drive != null ? drive.readWord() : -1 );
   }

   /*
   STAT_ERR = 1; STAT_DRQ = 8; STAT_DF = 32; STAT_DRDY = 64; STAT_BSY = 128; ERR_ABRT = 4;
   */
   
   this.execCommand = function(command) {
      command &= 255;
      if (drive != null && drive.enabled()) {
         switch(command) {
         case 0:
            ideStatus = 65; ideError = 4; break;
         case 32:
         case 33:
            ideStatus = 64;
			drive.startRead( sectorFromCHS(), ideCount );
			break;
         case 64:
         case 65:
         case 112:
         case 145:
         case 196:
         case 197:
         case 198:
         case 224:
         case 226:
         case 230:
         case 239:
         case 3120:
         case 3121:
            break;
         case 144:
            ideError = 1; break;
         case 225:
            ideStatus = 64; break;
         case 227:
            ideStatus = 64; break;
         case 229:
            ideCount = 255; ideStatus = 64; break;
         case 236:
            ideStatus = 64; drive.startRead(0, 1); break;
         default:
            ideStatus = 65; ideError = 4; break;
         }

      } else {
         ideStatus = 65; ideError = 4;
      }
   }


   /*bool*/ this.readWord = function( addr, /*QBusReadDTO*/ result, /*bool*/ opcode) {
      var r = 0;	// response
      switch(addr) {
      case 65504:	// IDE_CMD, IDE_STATUS
      case 65505:
      case 65507:	// IDE_RESET, IDE_STATUS2
      case 65509:
      case 65511:
      case 65513:
      case 65515:
      case 65517:
      default:
         break;
      case 65506:	// IDE_DEV_HEAD
         r = ideDevHead; break;
      case 65508:	// IDE_TRK_LOW
         r = ideTrkLow; break;
      case 65510:	// IDE_TRK_HIGH
         r = ideTrkHigh; break;
      case 65512:	// IDE_SECTOR
         r = ideSector; break;
      case 65514:	// IDE_COUNT
         r = ideCount; break;
      case 65516:	// IDE_FEATURES, IDE_ERROR
         r = ideError; break;
      case 65518:	// IDE_DATA
         r = execReadData(); break;
      }

      result.value = ((~r )& 0xFFFF) >>> 0;
      return true;
   }

  /*bool*/ this.writeWord = function( addr, data ) {
      var m = ((~data) & 0xFFFF) >>> 0;	// masked
      switch(addr) {
      case 65504:
         if ((ideDevHead & 1) == 0) {
            this.execCommand(m);
         }
		 break;
      case 65505:
      case 65507:
      case 65509:
      case 65511:
      case 65513:
      case 65515:
      case 65517:
      default:
         break;
      case 65506:
         ideDevHead = m; break;
      case 65508:
         ideTrkLow = m; break;
      case 65510:
         ideTrkHigh = m; break;
      case 65512:
         ideSector = m; break;
      case 65514:
         ideCount = m; break;
      case 65516:
         ideFeatures = m; break;
      case 65518:
         this.execWriteData( m ); break;
      }

      return true;
   }

   /*bool*/ this.writeByteAsWord = function( addr, data ) {
      return this.writeWord(addr, data);
   }
   
   this.mountDisks = function() {
	   // do nothing
	}
   
	return self;
}

/*

 Under Construction.
 Just "dummy" case works ok.

*/

HDDController = function()
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
            if (totalSectors < (1 /*firstDataSector*/ + sectors)) {
               cylinders = 0;
               mounted = false;
               drive = null;
            } else {
               cylinders = ((totalSectors - 1) / (heads * sectors));
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

   /*short*/ execReadData = function() {
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
         r = this.execReadData(); break;
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

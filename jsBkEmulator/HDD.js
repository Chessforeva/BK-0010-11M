
/*

 BK can manage 2 hdd disks. Here is only one.
 
*/

HDD = function( diskName, diskData )
{
	
   var self = this;
   
   var HDI_HEADER_SIZE = 512;
   var SECTOR_LENGTH = 512;
   var NODATA = 57005;
   var totalSectors = 0;
   var /*byte[]*/ rwBuffer = new Uint8Array(SECTOR_LENGTH);	//new byte[SECTOR_LENGTH];
   var /*long*/ sector = 0;
   var offset = 0;
   var sectorsLeft = 0;
   var /*HDD.HDState*/ state = 0;
   
   this.imageName = diskName;
   this.hddImage = diskData;
   
   var HDState = { DISABLED:0, IDLE:1, READING:2, WRITING:3 };
   
   this.HDDStru = {
	   tracks: 0,
	   heads: 0,
	   sectors: 0,
	   totalSectors: 0
   };   
   
   function detectHDI() {
    if(self.imageName.toUpperCase().indexOf(".HDI") < 0) return false;
    
    var header = self.hddImage.slice(0,HDI_HEADER_SIZE);
    var tracks = ( (header[3]<<8)|header[2] ) >>> 0;
    var heads = ( (header[7]<<8)|header[6] ) >>> 0;
    var sectors = ( (header[13]<<8)|header[12] ) >>> 0;
    self.HDDStru.tracks  = tracks;
    self.HDDStru.heads = heads;
    self.HDDStru.sectors = sectors;
    self.HDDStru.totalSectors = (tracks * heads * sectors);
		 
	// byte[510] must be 0xA5
	if ( ((header[510] & 0xFF)>>>0) != 0xA5 ) {
		return false;
	}
	// checksum: sum of bytes[0..510] negated (mod 256) must equal byte[511]
	var cs = 0;
	for (var i = 0; i < 511; i++) {   // i = 0..510 inclusive (SECTOR_SIZEB-1 = 511)
		cs += ((header[i] & 0xFF)>>>0);
	}
	cs = ((((cs & 0xFF) ^ 0xFF) + 1 ) & 0xFF)>>>0;

	return (((header[511] & 0xFF)>>>0) == cs);
  }
  
   this.mount = function() {
	  self.unmount();

	  if(detectHDI()) {
		totalSectors = ((self.hddImage.length / SECTOR_LENGTH)|0)-1;
		//if(totalSectors != self.HDDStru.totalSectors) {
		//	correctTheHeaderAndLength();					// It does not work, but anyway...
		//}
		state = HDState.IDLE;
	  }
   }
   
   // It is useless, but the header is not ok anyway
   function correctTheHeaderAndLength() {
	   
	   // let Gemini produce some vibe-code :)
	   var fileLength = self.hddImage.length;
	   var actualTotalSectors = (fileLength / SECTOR_LENGTH)|0;
	   var heads = self.HDDStru.heads;
	   var sectors = self.HDDStru.sectors;
	   var tracks = (actualTotalSectors / (heads * sectors))|0; 
	   var requiredBytes = 0;
	      
	   for(;;) {
	       
	     totalSectors = tracks * heads * sectors;
	   
	     // Redefine totalSectors to match the derived geometry
	     requiredBytes = totalSectors * SECTOR_LENGTH;
		 if(requiredBytes >= fileLength) break;
		 tracks+=(heads * sectors);
	   }
	   
	   if (fileLength < requiredBytes) {
	       var paddingSize = requiredBytes - fileLength;
	       var newDiskData = new Uint8Array(requiredBytes);
	       newDiskData.set(diskData);
	       // Uint8Array is zero-filled by default, so no need to manual fill
	       diskData = newDiskData;
		   self.hddImage = diskData;
	   }
	   
	   self.HDDStru.tracks  = tracks;
	   self.HDDStru.heads  = heads;
	   self.HDDStru.sectors  = sectors;
	   self.HDDStru.totalSectors = totalSectors;
	   
	   var H = self.hddImage;
	   H[3] = ((tracks & 0xFF00)>>>8);
	   H[2] = ((tracks & 0xFF)>>>0);
	   H[7] = ((heads & 0xFF00)>>>8);
	   H[6] = ((heads & 0xFF)>>>0);
	   H[13] = ((sectors & 0xFF00)>>>8);
	   H[12] = ((sectors & 0xFF)>>>0);
   }
   

   this.unmount = function() {
      state = HDState.DISABLED;
   }


   this.enabled = function() {
      return (state != HDState.DISABLED);
   }

   this.getSectorCount = function() {
      return (!self.enabled() ? 0 : totalSectors);
   }

   this.getDataRequest = function() {
      return (state == HDState.READING || state == HDState.WRITING);
   } 

   function rd_sector() {
      var I = self.hddImage, L = I.length;
      var p = (sector * SECTOR_LENGTH);
      for(var i=0; i<SECTOR_LENGTH && (p+i)<L; i++) {
         rwBuffer[i] = I[p+i];
      }
      while(i<SECTOR_LENGTH) rwBuffer[i++] = 0;
   }
   
   function wr_sector() {
      var I = self.hddImage, L = I.length;
      var p = (sector * SECTOR_LENGTH);
      for(var i=0; i<SECTOR_LENGTH; i++) {
         I[p+i] = rwBuffer[i];
      }
   }

   /*boolean*/ this.startRead = function(startSector, sectorCount) {
      if (!self.enabled()) {
         return false;
      } else {
         state = HDState.IDLE;
         if (startSector >= totalSectors) {
            return false;
         } else {
            sector = startSector;
			rd_sector();
            sectorsLeft = sectorCount - 1;
            offset = 0;
            state = HDState.READING;
            return true;
         }
      }
   }

   /*short*/ this.readWord = function() {
      if (state != HDState.READING) {
         return NODATA;
      } else {
         var acc = rwBuffer[offset++];
         acc |= (rwBuffer[offset++] << 8);		  
         if (offset >= SECTOR_LENGTH) {
            offset = 0;
            if ((sectorsLeft--) < 0 || (++sector) >= totalSectors) {
               state = HDState.IDLE;
               return acc;
            }
            rd_sector();
         }

         return acc;
      }
   }

   /*boolean*/ this.startWrite = function( startSector, sectorCount ) {
      if (!self.enabled()) {
         return false;
      } else {
         state = HDState.IDLE;
         if (startSector >= totalSectors) {
            return false;
         } else {
            sector = startSector;

            sectorsLeft = sectorCount;
            offset = 0;
            state = HDState.WRITING;
            return true;
         }
      }
   }

   /*boolean*/ this.writeWord = function(/*short*/ data) {
	  var d = (data & 0xFFFF)>>>0;
      if (state != HDState.WRITING) {
         return false;
      } else {
         rwBuffer[offset++] = d & 255;
         rwBuffer[offset++] = (d >>> 8) & 255; 
         if (offset >= SECTOR_LENGTH) {
            wr_sector();
            offset = 0;
            sectorsLeft--;
            sector++;
            if ( sectorsLeft == 0 ) {
               state = HDState.IDLE;
               return true;
            }
            if ( (sectorsLeft < 0) || (sector >= totalSectors) ) {
               state = HDState.IDLE;
               return false;
            }
         }
         return true;
      }
   }
   
   return self;
}

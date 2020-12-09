
BKkeys = function()
{

 var self = this;
 
 /*js keycodes map lcase, uppercase+Shift*/
 this.keymap = [];
 
 this.vkb = [];		// virtual keyboard mapping
 var AP2 = false;
 
 function d(cd)
 {
   if(typeof(self.keymap[cd])=="undefined") {
   
    self.keymap[cd] = {
    bk_lat_lcase:0, bk_lat_ucase:0,	// Lat 
    bk_rus_lcase:0, bk_rus_ucase:0,	// Rus
    bk_ap2:0	// AP2+key pressed
    };
   }
   return self.keymap[cd];
 }
 
 /* html keycode, Lat, Lat+with shift pressed */  
 function lat(cd,L,U)	// lat
 {
  var O = d(cd);  O.bk_lat_lcase = L; O.bk_lat_ucase = U;
 }
 
 /* html keycode, Lat */  
 function lats(cd,bk) { lat(cd,bk,bk) }	// lat same

 
  /* html keycode, Rus, Rus+with shift pressed */  
 function rus(cd,L,U)	// rus
 {
  var O = d(cd); O.bk_rus_lcase = L; O.bk_rus_ucase = U;
 }

 /* html keycode, Lat,with shift, AP2 code */  
 function latap2(cd,L,U,ap2)
 {
  var O = d(cd); lat(cd,L,U); O.bk_ap2 = ap2;
 }
 
 function init()
 {
  /*cuken on querty mapping*/

  var m=[190/*ю*/,70/*а*/,188/*б*/,87/*ц*/,76/*д*/,
  84/*е*/,65/*ф*/,85/*г*/,219/*х*/,66/*и*/,81/*й*/,82/*к*/,
   75/*л*/,86/*м*/,89/*н*/,74/*о*/,71/*п*/,90/*я*/,72/*р*/,
   67/*с*/,78/*т*/,69/*у*/,186/*ж*/,68/*в*/,
   77/*ь*/,83/*ы*/,80/*з*/,73/*ш*/,222/*э*/,79/*щ*/,88/*ч*/,221/*ъ*/,192/*ё*/];
    
  lat(8/*Backspace*/,24/*BS*/,19/*VS <=|*/);
  lat(9/*Tab*/,137/*TAB*/,20/*TAB8*/);
  lats(13/*Enter*/,10/*VVOD*/);
  
   //16=Shift,17=Ctrl,18=Alt,,20=CapsLock,
   
   /*
   19=Pause,Break, 27=ESC
       = STOP
   */
   
  lats(32/*Space*/,32/*PROBEL*/);
  
   //33=PgUp,34=PgDn,35=End,36=Home
   
  lats(37/*Left*/,8);
  lats(38/*Up*/,26);
  lats(39/*Right*/,25);
  lats(40/*Down*/,27);
  
   //44=PrntScrn,45=Insert,46=Delete
   //91=WIN Key Start, 93=WIN Menu
   //144=NumLock, 145=ScrollLock
   
  latap2(188,44/*,*/,60/*<*/, 156);
  latap2(190,46/*.*/,62/*>*/, 158);
  latap2(191,47/*slash*/,63/*?*/, 159);
  lat(192,96/*`*/,126/*~*/);
  lat(219,91/*[*/,123/*{*/);
  lat(220,92/*bk-slash*/,124/*|*/);
  lat(221,93/*]*/,125/*}*/);
  lat(222,39/*'*/,34/*"*/);

  latap2(186,59/*;*/,58/*:*/, 155);
  lat(187,61/*=*/,43/*+*/);
  latap2(189,45/*-*/,95/*_*/, 157);
  
if(navigator.userAgent.indexOf("Firefox") >= 0)
  {
  latap2(59,59/*;*/,58/*:*/, 155);
  lat(61,61/*=*/,43/*+*/);
  latap2(173,45/*-*/,95/*_*/, 157);
  }
  
	
  latap2(49,49/*1*/,33/*!*/, 177);
  latap2(50,50/*2*/,64/*@*/, 178);
  latap2(51,51/*3*/,35/*#*/, 179);
  latap2(52,52/*4*/,36/*$*/, 180);
  latap2(53,53/*5*/,37/*%*/, 181);
  latap2(54,54/*6*/,94/*^*/, 182);
  latap2(55,55/*7*/,38/*&*/, 183);
  latap2(56,56/*8*/,42/*asterisk*/, 184);
  latap2(57,57/*9*/,40/*(*/, 185);
  latap2(48,48/*0*/,41/*)*/, 186);
  
  lat(112/*F1*/,129/*POVT*/,14/*RUS*/);
  lat(113/*F2*/,3/*KT*/,15/*LAT*/);
  lat(114/*F3*/,153/*=|=>*/,1002/*Video modes*/);
  lats(115/*F4*/,22/*|<=*/);
  lats(116/*F5*/,23/*|=>*/);
  lats(117/*F6*/,130/*IND_SU*/);
  lats(118/*F7*/,132/*BLOK_RED*/);
  lats(119/*F8*/,144/*SHAG*/);
  lats(120/*F9*/,12/*SBR*/);
  lat(121/*F10*/,155/*32,64*/,157/*inverted screen colour*/);
  lats(122/*F11*/,0);
  lats(123/*F12*/,1004/*Reset*/);
  
  var i;
  /* latin*/
  for(i=65;i<90;i++) lat(i,i+32,i);
  /* cyrillic*/
  for(i=0;i<32;i++) rus(m[i],64+i,96+i);
  
 }

 this.getMappedKey = function(key,shift,alt,rus) {
  
  if(typeof(self.keymap[key])=="undefined") return -1;
  var o = self.keymap[key];
  
  var Ob = { code:0, isAp2:false };
  
  if(alt && o.bk_ap2) {
	Ob.code = o.bk_ap2;	/* (AR2+... special) */
	Ob.isAp2 = true;
	}
  else
	{
  
	if(!(o.bk_rus_ucase|o.bk_rus_lcase)) rus=false;
  
	Ob.code = ( rus ? (shift ? o.bk_rus_ucase : o.bk_rus_lcase) :
		(shift ? o.bk_lat_ucase : o.bk_lat_lcase) );
	}
  return Ob;
 }
 
 /* VIRTUAL KEYBOARD */

 function vkbinit() {
	var P=[6,10,88,64,5,-63,86,63,5,-65,86,63,9,-63,84,62,7,
	-63,86,63,10,-64,82,65,8,-66,83,63,13,-63,80,65,10,-65,97,63,13,
	-63,95,62,-947,5,57,58,5,-62,56,64,5,-61,57,61,4,-62,57,61,6,
	-60,56,61,4,-62,58,62,6,-64,55,64,5,-64,57,63,6,-63,52,64,9,
	-64,57,63,5,-62,55,60,8,-60,54,61,8,-64,51,63,9,-62,55,61,8,
	-63,83,66,-947,0,84,62,8,-64,56,62,4,-59,56,61,7,-62,57,60,5,
	-62,57,61,6,-60,54,59,6,-59,56,58,6,-60,56,61,5,-61,57,60,5,
	-59,56,61,5,-61,54,59,9,-60,55,60,8,-61,51,58,11,-57,50,58,11,
	-59,52,57,-947,5,100,64,7,-63,56,61,6,-61,53,63,8,-62,58,61,4,
	-62,56,60,6,-60,54,60,7,-60,55,61,7,-60,57,59,4,-61,55,60,7,
	-60,55,61,7,-61,53,62,8,-62,56,62,5,-61,54,59,9,-60,97,58,
	-943,5,67,55,6,-56,60,59,2,-59,60,59,3,-60,57,60,5,-58,58,58,4,
	-59,56,57,5,-57,56,58,5,-57,58,56,4,-56,57,54,4,-55,57,56,5,
	-58,56,59,8,-58,69,61,-764,-2,118,61,5,-59,71,58,4,-57,444,
	59,4,-62,117,59,5,-115,56,116,7,-121,56,61,-59,0,60,61,1,-117,58,116];
	var G=[186,49,50,51,52,53,54,55,56,57,48,189,186,74,
	67,85,75,69,78,71,219,221,90,72,221,191,70,89,87,65,
	80,82,79,76,68,86,220,190,81,54,83,77,73,84,88,66,50,188], g=[23,37,57,64];
	var F=[187,49,222,51,52,53,55,222,57,48,219,187,56,191,
	190,188],f=[11,12,13,14,15,16,17,19,20,21,23,38,52,65];
	var H=[9,24,25,39,53,68,70,71,72,73],h=[27,8,9,8,13,32,37,38,40,39];
	var R=[81,87,69,82,84,89,85,73,79,80,219,221,
		65,83,68,70,71,72,74,75,76,186,222,90,88,67,86,66,78,77,188,190];
	var X=9, Y=105, c=0, x,y, i,k,a=self.vkb;
	for(i=0;i<296;c^=1) {	/* define rectangles */
		x=X; y=Y;
		X+=P[i++]; Y+=P[i++];
		if(c) a.push( { all:0, lo:0, lo_sh:0, hi:0, hi_sh:0, ru:0,
				X0:x-4,Y0:y, X2:X, Y2:Y } );
		}
	for(i=0;i<9;i++) a[i].all = 112+i;	// F1-F9
	for(i=0,k=11;i<48;) {
		a[k++].lo = G[i++];
		k+=((i==13||i==26)?2:((i==38)?3:0));
		}
	for(i=0;i<4;) a[g[i++]].lo_sh = 1;	/* hold shift */
	for(i=0,k=11;i<17;) {
		a[k++].hi = F[i++];
		k+=((i==13)?14:((i==14)?13:((i==15)?12:0)));
		}
	for(i=0;i<14;) a[f[i++]].hi_sh = 1;	/* hold shift */
	for(i=0;i<10;i++) a[H[i]].all = h[i];
	for(i=0,k=26;i<32;i++) {
		a[k++].ru = R[i];
		k+=((i==11)?3:((i==22)?4:0));
		}
	
 }
 
 /* Virtual keyboard, pressed mouse or touch */
 this.kbpressed = function(U) {
	var a = self.vkb, b = self.keymap, g, o=null;
	var p, cd=0, i, Caps = keymap.getCaps();
	
	if(AP2) AP2--;
	
	for(i=0;i<a.length;i++) { 
		g = a[i]; a[i].i = i;
		if(U.X>=g.X0 && U.Y>=g.Y0 && U.X<=g.X2 && U.Y<=g.Y2) o = a[i];
		}
	if(o!=null) {
		U.X = (o.X0+o.X2)/2; U.Y = (o.Y0+o.Y2)/2;
		if(o.i==9) { cpu.nmi(); return 1; }
		if(o.i==10 || o.i==54 || o.i==55) { keymap.Capsed(); return 1; }
		if(o.i==66) { keymap.setRus(); return 1; }
		if(o.i==69) { keymap.setLat(); return 1; }
		if(o.i==67) { AP2=2; return 1; }
		
		if(!cd && o.all) {
			p = b[o.all];
			cd = (Caps ? p.bk_lat_ucase : p.bk_lat_lcase);
			}
		if(!cd && Caps && o.hi) {
			p = b[o.hi];
			cd = (o.hi_sh ? p.bk_lat_ucase : p.bk_lat_lcase);
			}
		if(!cd && keymap.isRus() && o.ru) {
			p = b[o.ru];
			cd = (Caps ? p.bk_rus_ucase : p.bk_rus_lcase);
			}
		if(!cd && o.lo) {
			p = b[o.lo];
			cd = (o.lo_sh ? p.bk_lat_ucase : p.bk_lat_lcase);
			if(cd>96 && cd<123 && Caps) cd-=32;
			if(cd>47 && cd<58 && AP2 && p.bk_ap2) cd = p.bk_ap2;
			}

		if(cd) pushKey(cd);
		}
	return cd;
 }
 
 init();
 vkbinit();
 
 return this;
}
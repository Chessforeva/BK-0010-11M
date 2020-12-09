/*
 Cheating tool;
 Known addresses in various games.
*/

/* 
Helps finding lives in games
Press Ctrl+L, die, Ctrl+L, die, Ctrl+L
See console for possible address.
*/

cheatings = new function(){
 
 var self = this;

 this.cheathelp = function() {
	
  alert("Lives cheating tool available:\n"+
	"1.Start a game (see all lives), press Ctrl+L;\n"+
	"2.Die (lives now -1), press Ctrl+L again;\n"+
	"3.Die again (lives now -2) and press Ctrl+L third time.\n"+
	"Tool will look for lives counter and fix it to the initial.\n");
 }
	
 var lv_dmp = {c:0,a:[]};
 var lv_cht = [];
	
 this.livesfinder = function() {
 
  var a=lv_dmp;
  a.a[a.c++] = read16dump();
  if(a.c==3) {
	var f=0, s="\n";
	lv_cht = [];
	for(var i=0;i<a.a[0].length;i++)
		if(a.a[0][i]==a.a[1][i]+1 && a.a[1][i]==a.a[2][i]+1) {
		 lv_cht[f++]={adr:(i<<1),val:a.a[0][i]};
		 s+='addr='+(i<<1)+ " values=" +
			a.a[0][i]+','+a.a[1][i]+','+a.a[2][i]+'(now)\n';
		 console.log(s);
		}
	if(f) alert("Found "+f+" addresses, cheating now!" + s);
	a.c=0;
	}
 }
 
 function livescheat() {
	for(var i in lv_cht)
		base.writeWord(lv_cht[i].adr, lv_cht[i].val);	// cheating'	
 }
 
 this.hack = function() {
 
 var o=base.FakeTape, n=o.filename, D=fdc.drives;
 var dskA=(D.length>0 ? D[0].imageName : "");
 var dskB=(D.length>1 ? D[1].imageName : "");
 
 if(!o.prep) {
 if(n=="VALLEY.BIN") base.writeWord(3140,9<<8); // set lives always =9
 if(n=="DIGGER.BIN") base.writeWord(2226,8); // set lives always = 8
 if(n=="NAVVY.BIN") base.writeWord(15872,65535); // set always = 3
 if(n=="AFRICA.BIN") base.writeWord(5792,99); // set always = 99
 if(n=="PANGO.BIN") base.writeWord(8770,51); // set always = 3
 if(n=="CIRCLER.BIN") base.writeWord(8066,8); // set always = 8
 if(n=="BOLDER.BIN") base.writeWord(2120,100); // set always = 3
 if(n=="LODERUN.BIN") base.writeWord(1006,10); // set always = 3
 if(n=="KLAD4.BIN") base.writeWord(7966,7); // set always = 7
 if(n=="TARZAN.BIN") base.writeWord(1006,5); // set always = 5
 if(n=="JETMAN.BIN") base.writeWord(4240,9); // set always = 9
 if(n=="F15.BIN") base.writeWord(844,8); // set always = 8
 if(dskB=="revolt.bkd")
	if(base.readWORD(596)==2) base.writeWord(596,3); // set always = 3
 if(dskA=="PRNCE.BKD")
	if(base.readWORD(11572)<10) {
		base.writeWord(11572,6);	// health
		base.writeWord(14020,512);	// time left 59min
		}
 }
 livescheat();	// in BK_MAIN.js lives cheating tool

 }
 
 return this;
}

 // ...cheat like this
setInterval('cheatings.hack()',8000);



/*

 Debug window in a div container
 Only Step-debugging available, developed to test the emulator
 
 */

DBG = function() {

var self = this;

this.active = false;		// flag dbg is activated

this.bp = 0;			// breakpoint
this.step = 0;			// 1- step command

var fdraw = true;		// flag to redraw, there are changes

var O = null;

this.Processor = cpu;	//	Which processor is set		

var mem_addr_s = 0;		// Debug memory address


function ADDRESS(a) { return (a&0xFFFF)>>>0; }

function OCT(n) {
	return ("000000" +n.toString(8)).substr(-6);
}

function HEX(n) {
	return ("0000" +n.toString(16)).substr(-4);
}

function OpLen( addr ) {
	var L = Disasm.opmem_length( base, addr );
	return (L==0 ? 1 : L);	// 0 for unknown op
}

  
//	Possibility to stop somewhere, see BK_MAIN.js loops

this.breakpoints = function() {
	if(dbg.active) return true;
	var pc = cpu.regs[7];
	if(pc==dbg.bp) return true;
	
	//	if( parseInt("...",8)==pc ) {
	//		dbg.show();
	//		return 1;
	//		}
	return false;
}

this.init = function( div_id ) {

	O = GE( div_id );
	if(O!=null)  {
		var s = '<table height="340"><tr><td width="260"><table><tr><td>' +
		'<input type="button" class="dbg0" id="dbg_run" value="Run F10,stop F11" title="Run continue" onclick="dbg.Run()"><br>' +
		'<input type="button" class="dbg0" id="dbg_step" value="Step F7" title="Step" onclick="dbg.Step()">' +
		'<input type="button" class="dbg0" id="dbg_over" value="StepOver F8" title="Over" onclick="dbg.StepOver()">' +
		'<br><div class="dbg0" style="display:inline;"> BP:</div>' +
		'<input type="text" id="dbg_AddrBP" class="dbg0" value="" size="7" onchange="dbg.setBreakPoint()">' +
		'</td></tr><tr><td><div id="dbg_asm" class="dbg0"></div></td></tr></table></td>' +
		'<td width="180"><div id="dbg_regs" class="dbg0"></div></td>' +
		'<td width="90"><div id="dbg_stack" class="dbg0"></div></td>' + 
		'<td width="150"><div id="dbg_ports" class="dbg0"></div></td>' +
		'<td width="150"><input type="text" id="dbg_AddrMem" class="dbg0" value="100000" size="7" onchange="dbg.MemRdrw()"> ' +
		'<div id="dbg_mem" class="dbg0"></div></td></tr></table>';
		
		O.innerHTML = s;
	}
}


this.show = function() {
	if(O!=null) {
		O.style.visibility = 'visible';
		fdraw = true;
		self.active = true;
		self.redraw();
		}
	}
	
this.close = function() {
	if(O!=null) {
		O.style.visibility = 'hidden';
		fdraw = true;
		self.active = false;
		}
	}

this.Run = function() {
	self.close();
}

this.Step = function() {
	var pc = cpu.regs[7];
	self.bp = pc;
	self.step = 1;
	self.active = false;
	fdraw = true;
}

this.StepOver = function() {
	var pc = cpu.regs[7], L = OpLen(pc);
	self.bp = ADDRESS( pc+(L<<1) );
	self.active = false;
	fdraw = true;
}

this.setBreakPoint = function() {
	var addr = parseInt( GE("dbg_AddrBP").value, 8 );
	addr = ADDRESS( addr & 0xFFFE );
	GE("dbg_AddrBP").value = OCT(addr,6);
	self.bp = addr;
}


this.redraw = function() {
	if(self.active) {
	
	if(fdraw) {
	
	var Addr = cpu.regs[7];
		
	var ok=0, at=0, a, L, w, s, d=[], T, addr, g;
	for(T=0;(!ok) && (T<2);T++) {
	
		addr = ADDRESS(Addr-80+T);
	
		for(a=0;a<100 && (!ok || a<at+12);a++) {
		
			L = OpLen( addr );

			var InstrTxt = Disasm.disasm(base, addr, false);

			g = (addr == Addr);
			if(g) { ok=1; at=a; }
			s = '';
			if(g) s+= '<font color="blue"><b>';
			s+= OCT(addr) + ': ' + InstrTxt;
			if(g) s+='</b></font>';
			s+='</br>';
			d[a] = s;
			addr = ADDRESS(addr+(L<<1));
			}
		}
	
	s = '<div style="overflow-y: scroll; height:220px; width:300px">';			
	if(at>0) {
		for(a=at-8; a<at+9; a++) {
			s+=d[a];
		}
	}
	GE("dbg_asm").innerHTML = s;
	
	s = 'Cpu <br>';			
	for(a=0;a<8;a++) {
		w = cpu.regs[a];
		s +=  (a==6 ? 'SP' : (a==7 ? 'PC' : 'R'+a)) + ' ' + OCT(w) + ' ' + HEX(w) + '<br>';
		}
	s += '<font color="red">PSW ' + cpu.pswstr() + '</font>';

	GE("dbg_regs").innerHTML = s;
	
	s = 'Stack:' + '<br>';
	
	Addr = cpu.regs[6];		// SP
	addr = ADDRESS(Addr-14);
	for(a=0; a<14; a++) {
			w = (base.readWORD(addr)&0xFFFF)>>>0;
			g = (addr == Addr);
			if(g) s+= '<font color="green"><b>';
			s+= OCT(w);
			if(g) s+='</b></font>';
			s+='<br>';
			addr = ADDRESS(addr+2);
		}

	GE("dbg_stack").innerHTML = s;
	
	s = 'Ports:' + '<br>';
	s += s_port( '177660:' );
	s += s_port( '177662:' );
	s += s_port( '177664:' );
	s += s_port( '177700:' );
	s += s_port( '177702:' );
	s += s_port( '177704:' );
	s += s_port( '177706:' );
	s += s_port( '177710:' );
	s += s_port( '177712:' );
	s += s_port( '177714:' );
	s += s_port( '177716:' );
	
	GE("dbg_ports").innerHTML = s;
	
	self.MemRdrw();
	base.DRAW();
	fdraw = false;
	}
	
	setTimeout('dbg.redraw()',399);
	}
}

function s_port(name) {
	var w = parseInt( name.substr(0,6), 8 );
	return (name + ' ' + OCT( base.readWORD(w) ) + '<br>');
}

this.MemRdrw = function() {

	var s, addr, w=0, a, d=0;
	s = '<div style="overflow-y: scroll; height:220px; width:140px">';
	addr = parseInt( GE("dbg_AddrMem").value, 8 );
	for(a=0; a<1000;a+=d) {
		addr&=65535;
		d=2;
		w = (base.readWORD(addr)&0xFFFF)>>>0;
		var q = OCT(w);
		s+= OCT(addr) + ' ' + (d==1?q.substr(3):q) + ' <br>';
		addr = ADDRESS(addr+d);
	}
	s += '</div>';
	GE("dbg_mem").innerHTML = s;
}

return this;
}


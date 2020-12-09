
Disasm = {

  cpu:null,
  /*String[]*/asmTpl:[ 
    "Unknown", 
    "???", 
    "Dummy", 
    "HALT", 
    "WAIT", 
    "RTI", 
    "BPT", 
    "IOT", 
    "RESET", 
    "RTT", 
    "START", 
    "S(TEP)", 
    "JMP $d", 
    "RTS $r", 
    "SE$c", 
    "CL$c", 
    "SWAB $d", 
    "BR $b", 
    "BNE $b", 
    "BEQ $b", 
    "BGE $b", 
    "BLT $b", 
    "BGT $b", 
    "BLE $b", 
    "JSR $e,$d", 
    "CLR $d", 
    "COM $d", 
    "INC $d", 
    "DEC $d", 
    "NEG $d", 
    "ADC $d", 
    "SBC $d", 
    "TST $d", 
    "ROR $d", 
    "ROL $d", 
    "ASR $d", 
    "ASL $d", 
    "MARK $m", 
    "SXT $d", 
    "MOV $s,$d", 
    "CMP $s,$d", 
    "BIT $s,$d", 
    "BIC $s,$d", 
    "BIS $s,$d", 
    "ADD $s,$d", 
    "XOR $e,$d", 
    "SOB $e,$o", 
    "BPL $b", 
    "BMI $b", 
    "BHI $b", 
    "BLOS $b", 
    "BVC $b", 
    "BVS $b", 
    "BCC $b", 
    "BCS $b", 
    "EMT $t", 
    "TRAP $t", 
    "CLRB $d", 
    "COMB $d", 
    "INCB $d", 
    "DECB $d", 
    "NEGB $d", 
    "ADCB $d", 
    "SBCB $d", 
    "TSTB $d", 
    "RORB $d", 
    "ROLB $d", 
    "ASRB $d", 
    "ASLB $d", 
    "MTPS $d", 
    "MFPS $d", 
    "MOVB $s,$d", 
    "CMPB $s,$d", 
    "BITB $s,$d", 
    "BICB $s,$d", 
    "BISB $s,$d", 
    "SUB $s,$d" ],

  /*String[]*/regnames:[ "R0", "R1", "R2", "R3", "R4", "R5", "SP", "PC" ],

  /*String*/disasm:function(/*QBusProxy*/ mem, /*short*/addr, /*boolean*/full)
  {
    var /*StringBuilder*/ sb = "";
    var /*int*/immWordsNum = 0;
    var /*short[]*/immWords = [0,0];
    var /*QBusReadDTO*/ dto = new QBusReadDTO(-1);
    var A = this.asmTpl;

    if (full) {
      sb+=addr.toString(8)+": ";
    }

    if (!(mem.readWord(addr, dto))) {
      sb+="--- Unreadable memory location ---";
      return sb.toString(8);
    }
    var /*short*/insn = dto.value;

    if (full) {
      sb+=insn.toString(8)+"  ";
    }

    var /*int*/op = cpu.get_opdec(insn & 0xFFFF);

    for (var /*int*/i = 0; i < A[op].length; ++i)
    {
      var /*char*/ c = A[op].charAt(i);

      if (c != '$') sb+=c;
      else switch (c = A[op].charAt(++i))
        {
        case 'd':
        case 's':
          var /*int*/mode = ((c == 's') ? insn >>> 6 : insn>>>0) & 0x3F;

          if ((mode & 0x8) != 0)
          {
            sb+='@';
            mode -= 0x8;
          }
          var /*short*/imm;
          if ((mode == 23) || (mode == 55)) {
            if (mode == 23) sb+='#';
            immWords[(immWordsNum++)] = -1;
            if (!(mem.readWord(/*(short)*/(addr + immWordsNum * 2)&0xFFFF>>>0, dto))) {
              sb+="(Immediate operand unreadable)";
            }
            else {
              imm = immWords[(immWordsNum - 1)] = dto.value;
              if (mode == 55)
                imm = /*(short)*/(imm + addr + immWordsNum * 2 + 2)&0xFFFF>>>0;
              sb+=imm.toString(8);
            }
          }
          else
          {
            var /*String*/left,right;
            switch (mode & 0x38)
            {
            case 16:
              left = "(";
              right = ")+";
              break;
            case 32:
              left = "-(";
              right = ")";
              break;
            case 48:
              left = "(";
              right = ")";
              immWords[(immWordsNum++)] = -1;
              if (!(mem.readWord(/*(short)*/(addr + immWordsNum * 2)&0xFFFF>>>0, dto))) {
                sb+="(Immediate operand unreadable)";
              }
              else {
                imm = immWords[(immWordsNum - 1)] = dto.value;
                sb+=imm.toString(8); }
              break;
            default:
              left = "";
              right = "";
            }

            sb+=left+this.regnames[(mode & 0x7)]+right;
	  }
          break;
        case 'r':
          sb+=this.regnames[(insn & 0x7)];
          break;
        case 'c':
          if ((insn & 0xF) == 0) {
            sb = sb.substr(0,sb.length - 2)+"NOP";
          }
          else {
            if ((insn & 0x8) != 0)
              sb+='N';
            if ((insn & 0x4) != 0)
              sb+='Z';
            if ((insn & 0x2) != 0)
              sb+='V';
            if ((insn & 0x1) != 0)
              sb+='C'; 
          }
          break;
        case 'b':
	  var v = insn&0xFF>>>0; if(v&128) v-=256;
          sb+=(addr + 2 + (/*(byte)*/v*2)).toString(8);
          break;
        case 'o':
          sb+=(addr + 2 - ((insn & 0x3F) * 2)).toString(8);
          break;
        case 'e':
          sb+=this.regnames[(insn >>> 6 & 0x7)];
          break;
        case 'm':
          sb+=(insn & 0x3F).toString(8);
          break;
        case 't':
          sb+=(insn & 0xFF).toString(8);
          break;
        case 'f':
        case 'g':
        case 'h':
        case 'i':
        case 'j':
        case 'k':
        case 'l':
        case 'n':
        case 'p':
        case 'q':
        default:
          sb+="(Unknown operand var '"+c+"' )";
        }

    }

    if (full) {
      sb+=('\n');

      for (i = 0; i < immWordsNum; ++i) {
        sb+=((addr + i * 2 + 2)&0xFFFF>>>0).toString(8) + ": " +
		immWords[i].toString(8) + '\n';
      }
    } 

    return sb;
  },

  /*int*/opmem_length:function(/*QBusProxy*/ mem, /*short*/addr)
  {
    var /*QBusReadDTO*/ dto = new QBusReadDTO(-1);
    var A = this.asmTpl;    

    if (!(mem.readWord(addr, dto))) {
      return 0;
    }
    var /*short*/insn = dto.value;

    var /*int*/op = cpu.get_opdec(insn & 0xFFFF);

    if (op < 3) {
      return 0;
    }
    var /*int*/len = 1;

    for (var /*int*/i = 0; i < A[op].length(); ++i)
    {
      var /*char*/ c = A[op].charAt(i);

      if (c != '$')
        continue;
      switch (c = A[op].charAt(++i))
      {
      case 'd':
      case 's':
        var /*int*/mode = ((c == 's') ? insn >>> 6 : insn) & 0x3F;

        if ((mode == 23) || (mode == 31)) {
          ++len;
        } else {
          mode &= 56;
          if ((mode == 48) || (mode == 56)) {
            ++len;
          }
        }
      }
    }

    return len;
  }
};

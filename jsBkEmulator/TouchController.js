//
// Claude assisted 03.2026
// The canvas touch controls.
//

TOUCH_CTRL = {
        splitInfo : true,	//set true to split the info area into F1 + ENTER
        zones     : null,	//populated by buildZones()
        keyCount  : {},		//live key->number-of-active-touches map
		infowas   : 0,
		infoactivated : 0,
		duration_loops: 0,
		disabled  : []		// list of disabled keys (from cheatings.js) 
    };

// -----
//  ZONE BUILDER
// -----

function buildZones(splitInfo) {
	
	var zones;

    if (splitInfo) {
            zones = [
                /* TOP */
                { key:'key_up',    label:'UP',    hint:'INDEX L', x1:0.00, y1:0.00, x2:0.22, y2:0.38 },
                { key:'key_f1',    label:'F1',    hint:'MENU',    x1:0.22, y1:0.00, x2:0.50, y2:0.38, info:true },
                { key:'key_enter', label:'ENTER', hint:'',        x1:0.50, y1:0.00, x2:0.78, y2:0.38, info:true },
                { key:'key_up',    label:'UP',    hint:'INDEX R', x1:0.78, y1:0.00, x2:1.00, y2:0.38 },
                /* BOT */
                { key:'key_left',  label:'LEFT',  hint:'THUMB L', x1:0.00, y1:0.38, x2:0.20, y2:1.00 },
                { key:'key_down',  label:'DOWN',  hint:'',        x1:0.20, y1:0.38, x2:0.33, y2:1.00 },
                { key:'key_space', label:'SPACE', hint:'THUMB R', x1:0.33, y1:0.38, x2:0.78, y2:1.00 },
                { key:'key_right', label:'RIGHT', hint:'',        x1:0.78, y1:0.38, x2:1.00, y2:1.00 }
            ];
        } else {
            zones = [
                /* TOP */
                { key:'key_up',    label:'UP',   hint:'INDEX L', x1:0.00, y1:0.00, x2:0.22, y2:0.38 },
                { key:'key_f1',    label:'F1',   hint:'MENU',    x1:0.22, y1:0.00, x2:0.78, y2:0.38, info:true },
                { key:'key_up',    label:'UP',   hint:'INDEX R', x1:0.78, y1:0.00, x2:1.00, y2:0.38 },
                /* BOT */
                { key:'key_left',  label:'LEFT', hint:'THUMB L', x1:0.00, y1:0.38, x2:0.20, y2:1.00 },
                { key:'key_down',  label:'DOWN', hint:'',        x1:0.20, y1:0.38, x2:0.33, y2:1.00 },
                { key:'key_space', label:'SPACE',hint:'THUMB R', x1:0.33, y1:0.38, x2:0.78, y2:1.00 },
                { key:'key_right', label:'RIGHT',hint:'',        x1:0.78, y1:0.38, x2:1.00, y2:1.00 }
            ];
        }

    TOUCH_CTRL.zones = zones;
    return zones;
}

// -----
//  HELPERS
// -----
function zoneByKey(key) {
        var zones = TOUCH_CTRL.zones;
        if (!zones) { return null; }
        for (var i = 0; i < zones.length; i++) {
            if (zones[i].key === key) { return zones[i]; }
        }
        return null;
    }

function findZone(canvas, clientX, clientY) {
	
        var zones = TOUCH_CTRL.zones;
        var r  = canvas.getBoundingClientRect();
        var fx = (clientX - r.left) / r.width;
        var fy = (clientY - r.top)  / r.height;
        if (fx < 0 || fx > 1 || fy < 0 || fy > 1) { return null; }
        for (var i = 0; i < zones.length; i++) {
            var z = zones[i];
            if (fx >= z.x1 && fx < z.x2 && fy >= z.y1 && fy < z.y2) {
                return z;
            }
        }
        return null;
    }

function toCanvasPx(canvas, clientX, clientY) {
        var r = canvas.getBoundingClientRect();
        return {
            x: (clientX - r.left) * (canvas.width  / r.width),
            y: (clientY - r.top)  * (canvas.height / r.height)
        };
    }

// -----
//  PRESS / RELEASE STATE
// -----
var touchZone = {};   // touchId -> zone object

function pressZone(canvas, touchId, zone, clientX, clientY) {
        touchZone[touchId] = zone;
        var kc = TOUCH_CTRL.keyCount;
        kc[zone.key] = (kc[zone.key] || 0) + 1;
        if (kc[zone.key] === 1) {
            var p = toCanvasPx(canvas, clientX, clientY);
            onPress(p.x, p.y, zone.key);
            //if (TOUCH_ && navigator.vibrate) { navigator.vibrate(8); }
        }
    }

function releaseZone(touchId) {
        var zone = touchZone[touchId];
        if (!zone) { return; }
        delete touchZone[touchId];
        var kc = TOUCH_CTRL.keyCount;
        kc[zone.key] = (kc[zone.key] > 0) ? kc[zone.key] - 1 : 0;
        if (kc[zone.key] === 0) {
            onRelease(zone.key);
        }
    }

function slideZone(canvas, touchId, clientX, clientY) {
        var oldZone = touchZone[touchId];
        var newZone = findZone(canvas, clientX, clientY);
        if (oldZone === newZone) { return; }
        if (!oldZone && !newZone) { return; }
        /* Same key, different zone object (two UP zones): remap silently */
        if (oldZone && newZone && oldZone.key === newZone.key) {
            touchZone[touchId] = newZone;
            return;
        }
        releaseZone(touchId);
        if (newZone) { pressZone(canvas, touchId, newZone, clientX, clientY); }
    }

// -----
//  CANVAS TOUCH POLICY
// -----
function applyCanvasPolicy(canvas) {
//
// 'none'       -- total lock (recommended for full-screen game canvas)
// 'pinch-zoom' -- allow pinch zoom, block everything else
//                 use this if the canvas is inside a scrollable page
//
	var s = 'pinch-zoom';
	
        canvas.style.touchAction        = s;
        canvas.style.webkitUserSelect   = s;
        canvas.style.userSelect         = s;
        canvas.style.MozUserSelect      = s;
        canvas.style.msUserSelect       = s;
        canvas.style.webkitTouchCallout = s;
        canvas.style.outline            = s;
        canvas.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        }, false);
    }

// -----
//  add listeners
// -----


function addSpaceListenerOnly(canvas) {

 var O = canvas;
 if(TOUCH_)
   {
   O.addEventListener("touchstart", TouchClick, false);
   O.addEventListener("touchmove", DummyEv, false);
   O.addEventListener("touchend", TouchUp, false);
   }
  else
   {
   O.addEventListener("mousedown", TouchClick, false);
   }
	
}

function addTouchListeners(canvas) {

        var split = false;
        if (TOUCH_CTRL.splitInfo)  { split = true; }

        buildZones(split);
        applyCanvasPolicy(canvas);

// for testing only...
/*
		canvas.addEventListener('mousedown', function(e) {
			e.stopPropagation(); e.preventDefault();
            var z = findZone(canvas, e.clientX, e.clientY);
            if (z) { pressZone(canvas, -1, z, e.clientX, e.clientY); }
        }, false);
*/

        canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            var tl = e.changedTouches;
            for (var i = 0; i < tl.length; i++) {
                var t = tl[i];
                var z = findZone(canvas, t.clientX, t.clientY);
                if (z) { pressZone(canvas, t.identifier, z, t.clientX, t.clientY); }
            }
        }, false);  /* non-passive so preventDefault works */

        canvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            var tl = e.changedTouches;
            for (var i = 0; i < tl.length; i++) {
                slideZone(canvas, tl[i].identifier, tl[i].clientX, tl[i].clientY);
            }
        }, false);

        canvas.addEventListener('touchend', function(e) {
            e.preventDefault();
            var tl = e.changedTouches;
            for (var i = 0; i < tl.length; i++) { releaseZone(tl[i].identifier); }
        }, false);

        canvas.addEventListener('touchcancel', function(e) {
            e.preventDefault();
            var tl = e.changedTouches;
            for (var i = 0; i < tl.length; i++) { releaseZone(tl[i].identifier); }
        }, false);
		
		if(TOUCH_CTRL.duration_loops) {
			showControls(canvas);	// display the touch areas
		}
    };

// -----
//  showControls
// -----
//
// Draws the zone map directly on the canvas (no DOM overlay).
//
// Requires addTouchListeners() to have been called first so zones exist.
//

function showControls(canvas) {
	
        if (!canvas) { return; }
        var ctx = canvas.getContext('2d');
        if (!ctx) { return; }

        var zones = TOUCH_CTRL.zones;
        if (!zones) {
            if (console) { console.warn('touch-controller: call addListeners() before showControls()'); }
            return;
        }

        var W  = canvas.width;
        var H  = canvas.height;

        ctx.save();

        /* dark tint */
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(0, 0, W, H);

        /* zones */
        for (var i = 0; i < zones.length; i++) {
            var z  = zones[i];
            var zx = Math.floor(z.x1 * W) + 3;
            var zy = Math.floor(z.y1 * H) + 3;
            var zw = Math.floor((z.x2 - z.x1) * W) - 6;
            var zh = Math.floor((z.y2 - z.y1) * H) - 6;
            var cx = zx + zw / 2;
            var cy = zy + zh / 2;

            /* border */
            ctx.strokeStyle = z.info ? 'rgba(220,180,0,0.70)' : 'rgba(200,200,200,0.55)';
            ctx.lineWidth   = 1.5;
            ctx.strokeRect(zx, zy, zw, zh);

            /* corner ticks (pure lines, ASCII-era feel) */
            var tk = Math.min(zw, zh, 16);
            ctx.lineWidth = 1;
            /* top-left */
            ctx.beginPath();
            ctx.moveTo(zx,      zy + tk);
            ctx.lineTo(zx,      zy);
            ctx.lineTo(zx + tk, zy);
            ctx.stroke();
            /* bottom-right */
            ctx.beginPath();
            ctx.moveTo(zx + zw - tk, zy + zh);
            ctx.lineTo(zx + zw,      zy + zh);
            ctx.lineTo(zx + zw,      zy + zh - tk);
            ctx.stroke();

            /* main label */
            var fSize = Math.max(10, Math.min(Math.floor(zw * 0.22), Math.floor(zh * 0.30), 42));
            ctx.font         = 'bold ' + fSize + 'px "Courier New", Courier, monospace';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle    = z.info ? 'rgba(255,200,0,0.82)' : 'rgba(255,255,255,0.80)';
            ctx.fillText(z.label, cx, cy);

            /* finger hint -- small, top-right */
            if (z.hint) {
                var hSize = Math.max(7, Math.floor(fSize * 0.38));
                ctx.font         = hSize + 'px "Courier New", Courier, monospace';
                ctx.textAlign    = 'right';
                ctx.textBaseline = 'top';
                ctx.fillStyle    = z.info ? 'rgba(255,200,0,0.40)' : 'rgba(255,255,255,0.32)';
                ctx.fillText(z.hint, zx + zw - 5, zy + 5);
            }

            /* key name -- small, bottom-left */
            var kSize = Math.max(7, Math.floor(fSize * 0.32));
            ctx.font         = kSize + 'px "Courier New", Courier, monospace';
            ctx.textAlign    = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle    = 'rgba(255,255,255,0.20)';
            ctx.fillText(z.key, zx + 5, zy + zh - 5);
        }

        /* footer */
        var ftSize = Math.max(9, Math.floor(W * 0.016));
        ctx.font         = ftSize + 'px "Courier New", Courier, monospace';
        ctx.fillStyle    = 'rgba(255,255,255,0.22)';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('-- TOUCH ZONES --', W / 2, H - 4);

        ctx.restore();
		
		TOUCH_CTRL.infowas = 1;
		TOUCH_CTRL.infoactivated = TOUCH_CTRL.duration_loops;
};

// -----
//   Key state
// -----
   
var touch_KEYMAP = {
    'key_up'   : 26,
    'key_down' : 27,
    'key_left' : 8,
    'key_right': 25,
    'key_space': 32,
    'key_f1'   : 112,
    'key_enter': 10,
    'key_esc'  : 1000
}; 


function isDisabledTouch(key) {
	var d=TOUCH_CTRL.disabled;
	for(var i in d) {
		if(d[i]==key) return true;
	}
	return false;
}

onPress = function(x, y, key) {
	cheats_onPress(key);
	if(!isDisabledTouch(key)) {
		var c = touch_KEYMAP[key];
		c = touch_subst_get(c);
		touchpushKey(c);
	}
};

onRelease = function(key) {
	cheats_onRelease(key);	
	if(!isDisabledTouch(key)) {
		var c = touch_KEYMAP[key];
		c = touch_subst_get(c);
		touchpopKey(c);
	}
}; 
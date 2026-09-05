/* ============================================================================
   Guzar Garden — dish artwork
   ----------------------------------------------------------------------------
   Every dish on the menu gets a piece of generated artwork instead of a stock
   photograph. Each category maps to a "kind" (a composition: a bowl, a skewer,
   a piala of tea...) and the dish name is hashed into a seed, so the same dish
   always draws the same picture but no two dishes look alike.

   Drawn in the house palette, flat, top-down, folk-art rather than photoreal —
   the intent is that it reads as illustration on purpose, not as a placeholder.

   REPLACING WITH PHOTOGRAPHY
   Give a dish `img:'photos/plow.jpg'` in the SECTIONS data and the card renders
   that photograph instead; the artwork is only the fallback. So a real shoot can
   land one dish at a time without touching this file.
   ========================================================================== */
(function (global) {
  'use strict';

  /* -- seeded RNG ---------------------------------------------------------- */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* -- palette ------------------------------------------------------------- */
  var P = {
    cream:   '#f7f1e4',
    cream2:  '#efe6d3',
    paper:   '#fffdf8',
    ink:     '#1d1a14',
    clay:    '#b5502c',
    saffron: '#d99a2b',
    lapis:   '#1f4d6b',
    green:   '#1e3527',
    red:     '#b62a19',
    teal:    '#338e75',
    navy:    '#07365a',
    rice:    '#efd9a8',
    crust:   '#c98a3f'
  };
  /* Background wash the plate sits on, cycled per dish. These are deliberately
     a clear step darker than the card so the plate reads as a plate — the
     first pass used near-identical beiges and everything floated in milk. */
  var GROUNDS = ['#dccdac', '#d6c6b0', '#e0d1a9', '#d3c7ae', '#e1d0a6'];

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  /* -- small helpers ------------------------------------------------------- */
  function circle(cx, cy, r, fill, extra) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (extra || '') + '/>';
  }
  // a blobby, hand-drawn looking circle
  function blob(cx, cy, r, wobble, rand, fill) {
    var pts = [], n = 9, i, a, rr;
    for (i = 0; i < n; i++) {
      a = (i / n) * Math.PI * 2;
      rr = r * (1 - wobble / 2 + rand() * wobble);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (i = 0; i < n; i++) {
      var p0 = pts[i], p1 = pts[(i + 1) % n], p2 = pts[(i + 2) % n];
      var cx1 = p1[0] + (p1[0] - p0[0]) * 0.18, cy1 = p1[1] + (p1[1] - p0[1]) * 0.18;
      var cx2 = p1[0] - (p2[0] - p1[0]) * 0.18, cy2 = p1[1] - (p2[1] - p1[1]) * 0.18;
      d += 'C' + cx2.toFixed(1) + ' ' + cy2.toFixed(1) + ',' + cx1.toFixed(1) + ' ' + cy1.toFixed(1) +
           ',' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
    }
    return '<path d="' + d + 'Z" fill="' + fill + '"/>';
  }
  // scatter n marks around a centre within [r0,r1]
  function scatter(n, cx, cy, r0, r1, rand, draw) {
    var out = '', i, a, r;
    for (i = 0; i < n; i++) {
      a = rand() * Math.PI * 2;
      r = r0 + Math.sqrt(rand()) * (r1 - r0);
      out += draw(cx + Math.cos(a) * r, cy + Math.sin(a) * r, a, i);
    }
    return out;
  }

  /* the plate every dish sits on — a rim ring with a dotted band */
  function plate(rand, tone) {
    var rot = (rand() * 360) | 0;
    var dots = '', i;
    for (i = 0; i < 24; i++) {
      dots += '<circle cx="100" cy="27" r="1.5" fill="' + tone + '" opacity=".5" transform="rotate(' +
              (i * 15) + ' 100 100)"/>';
    }
    return '<circle cx="100" cy="100" r="74" fill="' + P.paper + '"/>' +
           '<circle cx="100" cy="100" r="74" fill="none" stroke="' + tone + '" stroke-opacity=".35" stroke-width="1.4"/>' +
           '<circle cx="100" cy="100" r="66" fill="none" stroke="' + tone + '" stroke-opacity=".22" stroke-width="1"/>' +
           '<g transform="rotate(' + rot + ' 100 100)">' + dots + '</g>';
  }

  /* ------------------------------------------------------------------------
     Compositions. Each returns the inner markup for a 200x200 viewBox.
     ---------------------------------------------------------------------- */
  var KINDS = {};

  /* chopped salad in a shallow bowl */
  KINDS.bowl = function (rand) {
    var greens = ['#2f6b32', '#4b8a3c', '#22562a', '#6fa348'];
    var s = plate(rand, P.teal);
    s += circle(100, 100, 56, '#f1e6cd');
    s += blob(100, 100, 49, 0.14, rand, '#e2d2ad');
    // denser than the first pass — a sparse scatter read as confetti, not salad
    s += scatter(40, 100, 100, 3, 45, rand, function (x, y, a, i) {
      var w = 8 + rand() * 10, h = 6 + rand() * 7;
      return '<rect x="' + (x - w / 2).toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) +
             '" height="' + h.toFixed(1) + '" rx="2.8" fill="' + greens[i % 4] + '" transform="rotate(' +
             ((a * 57) | 0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
    });
    s += scatter(9, 100, 100, 6, 38, rand, function (x, y) {
      return circle(x.toFixed(1), y.toFixed(1), (4.2 + rand() * 3).toFixed(1), rand() > .4 ? '#c0392b' : '#9c2a1e');
    });
    s += scatter(7, 100, 100, 8, 36, rand, function (x, y) {
      return circle(x.toFixed(1), y.toFixed(1), (3.2 + rand() * 2).toFixed(1), P.paper);
    });
    s += scatter(6, 100, 100, 10, 40, rand, function (x, y) {
      return circle(x.toFixed(1), y.toFixed(1), 2.6, '#d3901f');
    });
    return s;
  };

  /* soup — broth ring, herbs floating, spoon */
  KINDS.soup = function (rand) {
    var s = plate(rand, P.clay);
    s += circle(100, 100, 58, '#e4cf9d');
    s += circle(100, 100, 52, '#cf8a2c');
    s += circle(100, 100, 52, 'none', ' stroke="#a96716" stroke-width="2" stroke-opacity=".55"');
    // noodles / meat
    s += scatter(11, 100, 100, 5, 38, rand, function (x, y, a) {
      return '<rect x="' + (x - 10).toFixed(1) + '" y="' + (y - 3.2).toFixed(1) + '" width="20" height="6.4" rx="3.2" fill="' +
             (rand() > .5 ? '#7d3313' : '#95461c') + '" transform="rotate(' +
             ((a * 57) | 0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
    });
    s += scatter(14, 100, 100, 8, 44, rand, function (x, y) {
      return circle(x.toFixed(1), y.toFixed(1), (2.8 + rand() * 2).toFixed(1), rand() > .35 ? '#2f6b32' : '#4b8a3c');
    });
    // fat droplets
    s += scatter(8, 100, 100, 10, 46, rand, function (x, y) {
      return circle(x.toFixed(1), y.toFixed(1), (3 + rand() * 3).toFixed(1), '#efc76a');
    });
    return s;
  };

  /* plov — mound of rice, carrot threads, meat.
     The signature dish, so it has to read at a glance: warm saffron rice
     rather than pale straw, carrots spread to the rim instead of bunching in
     the middle, and the meat pushed out to a ring so it never merges into one
     dark blob at the centre. */
  KINDS.plate = function (rand) {
    var s = plate(rand, P.saffron);
    s += blob(100, 101, 56, 0.08, rand, '#d9a63f');
    s += blob(100, 100, 50, 0.12, rand, '#e8bf62');
    s += blob(100, 99, 40, 0.16, rand, '#f0d183');
    // carrot threads, laid at a tangent so they look stirred through
    var i, a, r, w;
    for (i = 0; i < 26; i++) {
      a = rand() * Math.PI * 2;
      r = 12 + Math.sqrt(rand()) * 34;
      w = 13 + rand() * 13;
      var cx = 100 + Math.cos(a) * r, cy = 100 + Math.sin(a) * r;
      var ang = (a * 180 / Math.PI + 70 + rand() * 40) | 0;
      s += '<rect x="' + (cx - w / 2).toFixed(1) + '" y="' + (cy - 2.2).toFixed(1) + '" width="' + w.toFixed(1) +
           '" height="4.4" rx="2.2" fill="' + (rand() > .4 ? '#c9631a' : '#a94a12') + '" transform="rotate(' +
           ang + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')"/>';
    }
    // meat, on a ring
    var n = 5 + ((rand() * 2) | 0);
    for (i = 0; i < n; i++) {
      a = (i / n) * Math.PI * 2 + rand() * .5;
      r = 21 + rand() * 9;
      var mx = 100 + Math.cos(a) * r, my = 100 + Math.sin(a) * r;
      s += '<rect x="' + (mx - 10).toFixed(1) + '" y="' + (my - 7.5).toFixed(1) + '" width="20" height="15" rx="6" fill="' +
           (rand() > .5 ? '#6d2f13' : '#59250f') + '" transform="rotate(' + ((rand() * 360) | 0) + ' ' +
           mx.toFixed(1) + ' ' + my.toFixed(1) + ')"/>';
    }
    // chickpeas and raisins
    s += scatter(10, 100, 100, 10, 42, rand, function (x, y) {
      return circle(x.toFixed(1), y.toFixed(1), 3.4, rand() > .5 ? '#f2e3b4' : '#3d1f27');
    });
    // a whole garlic head, the way it is served
    s += circle(100, 100, 11, '#f3e8cd');
    s += '<g opacity=".5">';
    for (i = 0; i < 6; i++) {
      s += '<path d="M100 100 L' + (100 + Math.cos(i / 6 * 6.283) * 11).toFixed(1) + ' ' +
           (100 + Math.sin(i / 6 * 6.283) * 11).toFixed(1) + '" stroke="#c8b58a" stroke-width="1.6"/>';
    }
    s += '</g>';
    return s;
  };

  /* samsa / tandoor pastry — triangles with sesame */
  KINDS.pastry = function (rand) {
    var s = plate(rand, P.clay);
    var n = 2 + ((rand() * 2) | 0), i;
    for (i = 0; i < n; i++) {
      var a = (i / n) * 360 + rand() * 40;
      var d = 26 + rand() * 6;
      var x = 100 + Math.cos(a * Math.PI / 180) * d;
      var y = 100 + Math.sin(a * Math.PI / 180) * d;
      var rot = ((rand() * 360) | 0);
      s += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + rot + ')">' +
             '<path d="M0 -30 L27 16 L-27 16 Z" fill="#c98a3f"/>' +
             '<path d="M0 -30 L27 16 L-27 16 Z" fill="none" stroke="#a8692a" stroke-width="2.5" stroke-linejoin="round"/>' +
             '<path d="M0 -30 L0 16 M-13 -7 L13 -7" stroke="#a8692a" stroke-width="1.6" opacity=".55" fill="none"/>' +
             '<circle cx="-8" cy="4" r="1.8" fill="#f6ecd2"/><circle cx="6" cy="-2" r="1.8" fill="#f6ecd2"/>' +
             '<circle cx="0" cy="9" r="1.8" fill="#f6ecd2"/><circle cx="-3" cy="-12" r="1.8" fill="#f6ecd2"/>' +
           '</g>';
    }
    return s;
  };

  /* charcoal skewers */
  KINDS.skewer = function (rand) {
    var s = plate(rand, P.navy);
    var n = 2 + ((rand() * 2) | 0), i, j;
    var baseRot = -22 + rand() * 44;
    for (i = 0; i < n; i++) {
      var off = (i - (n - 1) / 2) * 30;
      s += '<g transform="rotate(' + baseRot.toFixed(0) + ' 100 100) translate(' + off.toFixed(0) + ' 0)">' +
             '<rect x="97" y="34" width="6" height="132" rx="3" fill="#9aa0a3"/>' +
             '<rect x="97" y="34" width="6" height="132" rx="3" fill="none" stroke="#7a8083" stroke-width="1"/>';
      for (j = 0; j < 4; j++) {
        var cy = 58 + j * 26;
        var tone = rand() > .4 ? '#8a3f1e' : '#6f2f16';
        s += '<rect x="' + (100 - 15) + '" y="' + (cy - 12) + '" width="30" height="24" rx="9" fill="' + tone + '"/>' +
             '<path d="M' + (100 - 11) + ' ' + (cy - 5) + ' h22 M' + (100 - 11) + ' ' + (cy + 4) + ' h22" stroke="#4a1d0d" stroke-width="2.2" opacity=".5" stroke-linecap="round"/>';
      }
      s += '</g>';
    }
    // onion rings
    s += scatter(4, 100, 100, 34, 52, rand, function (x, y) {
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="7" fill="none" stroke="#e8ddc8" stroke-width="3"/>';
    });
    return s;
  };

  /* manti / steamed dumplings */
  KINDS.dumpling = function (rand) {
    var s = plate(rand, P.lapis);
    var n = 3 + ((rand() * 2) | 0), i, j;
    for (i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + rand();
      var d = n > 3 ? 28 : 24;
      var x = 100 + Math.cos(a) * d, y = 100 + Math.sin(a) * d;
      s += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ((rand() * 360) | 0) + ')">' +
             '<ellipse cx="1.5" cy="3" rx="25" ry="24" fill="#9b7c46" opacity=".28"/>' +
             '<circle cx="0" cy="0" r="25" fill="#e7cf9a"/>' +
             '<circle cx="0" cy="0" r="25" fill="none" stroke="#bd9a58" stroke-width="2.2"/>';
      // pleats, gathered to a twist at the top
      for (j = 0; j < 8; j++) {
        var pa = (j / 8) * Math.PI * 2;
        s += '<path d="M0 0 L' + (Math.cos(pa) * 24).toFixed(1) + ' ' + (Math.sin(pa) * 24).toFixed(1) +
             '" stroke="#b08c4c" stroke-width="2.2" stroke-linecap="round"/>';
      }
      // the filling showing through the twist
      s += '<circle cx="0" cy="0" r="8.5" fill="#c99a55"/>' +
           '<circle cx="0" cy="0" r="4.5" fill="#7d3f1a"/></g>';
    }
    // butter and dill over the top
    s += scatter(9, 100, 100, 12, 46, rand, function (x, y) {
      return circle(x.toFixed(1), y.toFixed(1), 2.6, '#2f6b32');
    });
    return s;
  };

  /* non — the round tandoor loaf, stamped with the house rosette */
  KINDS.bread = function (rand) {
    var s = plate(rand, P.saffron);
    s += circle(100, 100, 62, '#cf9a4e');
    s += circle(100, 100, 62, 'none', ' stroke="#a9752f" stroke-width="3"');
    s += circle(100, 100, 44, '#e0b268');
    s += circle(100, 100, 44, 'none', ' stroke="#b98039" stroke-width="2"');
    // the chekich stamp — a nod to the logo itself
    s += '<g transform="translate(100 100) rotate(' + ((rand() * 45) | 0) + ')" opacity=".55">';
    for (var i = 0; i < 12; i++) {
      s += '<circle cx="0" cy="-26" r="2.6" fill="#8a5a20" transform="rotate(' + (i * 30) + ')"/>';
    }
    for (var k = 0; k < 8; k++) {
      s += '<circle cx="0" cy="-14" r="2" fill="#8a5a20" transform="rotate(' + (k * 45) + ')"/>';
    }
    s += '<circle cx="0" cy="0" r="5" fill="#8a5a20"/></g>';
    // sesame on the rim
    s += scatter(16, 100, 100, 48, 58, rand, function (x, y) {
      return '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="2.6" ry="1.7" fill="#f4e7c9"/>';
    });
    return s;
  };

  /* A shared platter. Wedges alone read as a pie chart, so each one gets its
     own scatter of food on top and the whole thing is inset inside the plate
     rim with a bowl of sauce in the middle. */
  KINDS.platter = function (rand) {
    var s = plate(rand, P.red);
    var fills  = ['#cf8a2c', '#7d3313', '#2f6b32', '#e4cf9d', '#b06a24'];
    var tops   = ['#f2e3b4', '#3d1f27', '#8fbf6a', '#c9631a', '#f3e8cd'];
    var n = 4 + ((rand() * 2) | 0), i, k;
    var rot = (rand() * 360) | 0, R = 54;
    s += '<g transform="rotate(' + rot + ' 100 100)">';
    for (i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2 - 0.05;
      var pick = (i + ((rand() * 5) | 0)) % fills.length;
      var x0 = 100 + Math.cos(a0) * R, y0 = 100 + Math.sin(a0) * R;
      var x1 = 100 + Math.cos(a1) * R, y1 = 100 + Math.sin(a1) * R;
      s += '<path d="M100 100 L' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + R + ' ' + R + ' 0 0 1 ' +
           x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Z" fill="' + fills[pick] + '"/>';
      // a few morsels sitting in the wedge
      for (k = 0; k < 4; k++) {
        var am = a0 + (a1 - a0) * (0.2 + rand() * 0.6);
        var rm = 20 + rand() * 28;
        s += '<circle cx="' + (100 + Math.cos(am) * rm).toFixed(1) + '" cy="' + (100 + Math.sin(am) * rm).toFixed(1) +
             '" r="' + (2.6 + rand() * 2.4).toFixed(1) + '" fill="' + tops[pick] + '" opacity=".85"/>';
      }
    }
    s += '</g>';
    s += circle(100, 100, 17, P.paper);
    s += circle(100, 100, 17, 'none', ' stroke="' + P.red + '" stroke-opacity=".3" stroke-width="1.6"');
    s += circle(100, 100, 12, '#b8321f');
    return s;
  };

  /* piala of tea / coffee, seen from the side with steam */
  KINDS.cup = function (rand) {
    var s = plate(rand, P.teal);
    var band = rand() > .5 ? P.teal : P.lapis;
    // saucer
    s += '<ellipse cx="100" cy="146" rx="52" ry="12" fill="#e8dcc0"/>';
    s += '<ellipse cx="100" cy="143" rx="52" ry="12" fill="' + P.paper + '"/>';
    // bowl of the piala
    s += '<path d="M62 84 h76 a4 4 0 0 1 4 5 l-9 42 a24 24 0 0 1 -23 18 h-20 a24 24 0 0 1 -23 -18 l-9 -42 a4 4 0 0 1 4 -5 Z" fill="' + P.paper + '"/>';
    s += '<path d="M62 84 h76 a4 4 0 0 1 4 5 l-9 42 a24 24 0 0 1 -23 18 h-20 a24 24 0 0 1 -23 -18 l-9 -42 a4 4 0 0 1 4 -5 Z" fill="none" stroke="' + band + '" stroke-opacity=".45" stroke-width="2"/>';
    // liquid
    s += '<ellipse cx="100" cy="86" rx="38" ry="9" fill="' + (rand() > .5 ? '#b8763a' : '#8a5324') + '"/>';
    // decorated band
    s += '<g opacity=".8">';
    for (var i = 0; i < 9; i++) {
      var x = 66 + i * 8.6;
      s += '<path d="M' + x + ' 108 l4 -7 l4 7 l-4 7 Z" fill="' + band + '"/>';
    }
    s += '</g>';
    // steam
    s += '<g fill="none" stroke="' + P.ink + '" stroke-opacity=".18" stroke-width="3" stroke-linecap="round">' +
         '<path d="M86 68 c6 -8 -6 -14 0 -22"/><path d="M100 62 c6 -9 -6 -15 0 -24"/><path d="M114 68 c6 -8 -6 -14 0 -22"/></g>';
    return s;
  };

  /* tall cold drink */
  KINDS.glass = function (rand) {
    var s = plate(rand, P.lapis);
    var liquids = ['#c94f3b', '#d98b2b', '#7b9c3e', '#a8506e', '#3f7f88'];
    var liq = liquids[(rand() * liquids.length) | 0];
    s += '<path d="M72 52 h56 l-7 100 a10 10 0 0 1 -10 9 h-22 a10 10 0 0 1 -10 -9 Z" fill="' + P.paper + '"/>';
    s += '<path d="M74 74 h52 l-6 78 a9 9 0 0 1 -9 8 h-22 a9 9 0 0 1 -9 -8 Z" fill="' + liq + '"/>';
    s += '<path d="M72 52 h56 l-7 100 a10 10 0 0 1 -10 9 h-22 a10 10 0 0 1 -10 -9 Z" fill="none" stroke="' + P.ink + '" stroke-opacity=".18" stroke-width="2"/>';
    s += '<ellipse cx="100" cy="52" rx="28" ry="7" fill="' + P.paper + '"/>';
    s += '<ellipse cx="100" cy="74" rx="26" ry="6.5" fill="' + liq + '" opacity=".7"/>';
    // ice
    s += scatter(3, 100, 104, 2, 18, rand, function (x, y) {
      return '<rect x="' + (x - 8).toFixed(1) + '" y="' + (y - 8).toFixed(1) + '" width="16" height="16" rx="4" fill="' + P.paper + '" opacity=".38" transform="rotate(' + ((rand() * 60) | 0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
    });
    // straw
    s += '<rect x="108" y="30" width="7" height="52" rx="3.5" fill="' + P.red + '" transform="rotate(13 111 56)"/>';
    // mint
    s += '<ellipse cx="86" cy="50" rx="11" ry="7" fill="#4e7c4a" transform="rotate(-25 86 50)"/>';
    s += '<ellipse cx="94" cy="45" rx="9" ry="6" fill="#6b9350" transform="rotate(18 94 45)"/>';
    return s;
  };

  /* dessert — small sweets on a plate with a drizzle */
  KINDS.sweet = function (rand) {
    var s = plate(rand, P.red);
    var tones = ['#e6c07a', '#d98b6a', '#f0dcc0', '#c98a3f'];
    var n = 3 + ((rand() * 3) | 0), i;
    for (i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + rand() * .6;
      var x = 100 + Math.cos(a) * 26, y = 100 + Math.sin(a) * 26;
      var t = tones[(rand() * tones.length) | 0];
      if (rand() > .5) {
        s += '<rect x="' + (x - 16).toFixed(1) + '" y="' + (y - 13).toFixed(1) + '" width="32" height="26" rx="5" fill="' + t + '" transform="rotate(' + ((rand() * 40 - 20) | 0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
      } else {
        s += circle(x.toFixed(1), y.toFixed(1), 16, t);
      }
      s += circle(x.toFixed(1), (y - 2).toFixed(1), 4, '#8a4a2a');
    }
    // honey drizzle
    s += '<path d="M64 132 q18 -14 36 0 t36 0" fill="none" stroke="' + P.saffron + '" stroke-width="4" stroke-linecap="round" opacity=".75"/>';
    // crushed pistachio
    s += scatter(12, 100, 100, 10, 46, rand, function (x, y) {
      return circle(x.toFixed(1), y.toFixed(1), 2.4, '#6b9350');
    });
    return s;
  };

  /* sides & sauces — a small ramekin with a swirl */
  KINDS.sauce = function (rand) {
    var s = plate(rand, P.green);
    var tones = ['#c94f3b', '#e8dcc0', '#6b9350', '#d98b2b'];
    var t = tones[(rand() * tones.length) | 0];
    s += circle(100, 100, 44, P.paper);
    s += circle(100, 100, 44, 'none', ' stroke="' + P.ink + '" stroke-opacity=".12" stroke-width="2"');
    s += circle(100, 100, 36, t);
    // swirl
    var d = 'M100 100', a, r;
    for (var i = 0; i <= 40; i++) {
      a = (i / 40) * Math.PI * 4;
      r = (i / 40) * 30;
      d += ' L' + (100 + Math.cos(a) * r).toFixed(1) + ' ' + (100 + Math.sin(a) * r).toFixed(1);
    }
    s += '<path d="' + d + '" fill="none" stroke="' + P.paper + '" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>';
    s += scatter(7, 100, 100, 6, 28, rand, function (x, y) {
      return circle(x.toFixed(1), y.toFixed(1), 2.2, P.ink);
    });
    return s;
  };

  /* ------------------------------------------------------------------------
     Category -> composition
     ---------------------------------------------------------------------- */
  var KIND_BY_SECTION = {
    salaty:    'bowl',
    zupy:      'soup',
    dania:     'plate',
    piec:      'pastry',
    grill:     'skewer',
    parze:     'dumpling',
    zestawy:   'platter',
    chleb:     'bread',
    dodatki:   'sauce',
    desery:    'sweet',
    napoje:    'glass',
    herbaty:   'cup',
    mocktails: 'glass',
    specials:  'platter'
  };

  /* a handful of dishes read better as something other than their section
     default — plov is the obvious one, it is a main but wants the rice plate */
  var KIND_BY_NAME = [
    [/plow|plov|плов/i,            'plate'],
    [/lagman|szurpa|shurpa|mastawa|mastava|zupa/i, 'soup'],
    [/manty|manti|chuchwara|czuczwara|pelmeni/i,   'dumpling'],
    [/samsa|somsa/i,               'pastry'],
    [/szasz|shash|kebab|lula|grill/i, 'skewer'],
    [/lepio|non\b|chleb|patyr/i,   'bread'],
    [/herbat|kawa|czaj|chai/i,     'cup'],
    [/koktajl|mocktail|lemoniad|sok|cola|woda/i, 'glass']
  ];

  function kindFor(sectionId, name) {
    for (var i = 0; i < KIND_BY_NAME.length; i++) {
      if (KIND_BY_NAME[i][0].test(name)) return KIND_BY_NAME[i][1];
    }
    return KIND_BY_SECTION[sectionId] || 'plate';
  }

  /* ------------------------------------------------------------------------
     Public API
     ---------------------------------------------------------------------- */
  function dishArt(sectionId, name, opts) {
    opts = opts || {};
    var seed = hash(sectionId + '|' + name);
    var rand = rng(seed);
    var kind = opts.kind || kindFor(sectionId, name);
    var ground = GROUNDS[seed % GROUNDS.length];
    var draw = KINDS[kind] || KINDS.plate;

    var inner = '<rect width="200" height="200" fill="' + ground + '"/>';
    // faint rosette behind the plate, rotated per dish
    inner += '<g opacity=".07" transform="translate(100 100) rotate(' + ((seed % 90)) +
             ') scale(.19) translate(-500 -500)">' +
             '<use href="#gg-sil" fill="' + P.ink + '"/></g>';
    inner += draw(rand);

    return '<svg viewBox="0 0 200 200" role="img" aria-label="' + esc(name) +
           '" preserveAspectRatio="xMidYMid slice">' + inner + '</svg>';
  }

  global.GGArt = {
    dishArt: dishArt,
    kindFor: kindFor,
    palette: P
  };
})(window);

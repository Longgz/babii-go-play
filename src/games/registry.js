import caro from './caro/index.js';
import oan from './oan-tu-ti/index.js';
import noi from './noi-chu/index.js';
import choc from './choc-let/index.js';
import qa from './hoi-dap-anh/index.js';
import oaq from './o-an-quan/index.js';
import den from './tha-den/index.js';
import trip from './du-lich/index.js';
import tim from './tim-chu/index.js';
import ludo from './ludo/index.js';
import bm from './may-bay/index.js';
import bai4 from './bai4/index.js';
import meo from './meo/index.js';

// Game chưa làm: ready=false, hiện "Sắp ra mắt". room:true nghĩa là chỉ chơi trong phòng.
const soon = (id, name, icon, desc, min, max) => ({ id, name, icon, desc, min, max, ready: false });

export const games = [
  caro, oan, noi, choc, qa, oaq, den, tim, ludo, bm, bai4, meo,
  trip
];

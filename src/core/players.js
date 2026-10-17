import { store } from './store.js';
// Danh sách tên người chơi dùng chung; sửa tại chỗ để mọi nơi thấy giá trị mới
export const names = store.get('names', ['Người chơi 1', 'Người chơi 2']);
export function setName(k, v) { names[k] = v.trim() || 'Người chơi ' + (k + 1); store.set('names', names); }

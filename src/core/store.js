// Lưu cục bộ trên trình duyệt (localStorage), an toàn khi bị chặn
export const store = {
  get(k, d) { try { const v = localStorage.getItem('sd:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sd:' + k, JSON.stringify(v)); } catch {} }
};

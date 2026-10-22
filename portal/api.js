// Room API client. Same contract as online.js: the Worker validates every command.
export const SERVER = 'https://developer-v020-design.jazzywren11.chatgpt.site';
const apiRoot = location.hostname.endsWith('github.io') ? SERVER : '';

export const seatKey = code => 'developer-online-' + code;
export const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('');
export const validCode = code => /^[A-Z2-9]{8}$/.test(code || '');

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function request(path, { token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(apiRoot + '/api/rooms' + path, {
      method: body ? 'POST' : 'GET', headers, cache: 'no-store', signal: controller.signal,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) throw new ApiError(data.error || 'Сервер комнат не ответил', res.status);
    return data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(e.name === 'AbortError' ? 'Сервер отвечает слишком долго' : 'Нет связи с сервером комнат', 0);
  } finally { clearTimeout(timer); }
}

export const api = {
  create: (profile, token) => request('', { body: { ...profile, token } }),
  join: (code, profile, token) => request('/' + code + '/join', { body: { ...profile, token } }),
  room: (code, token) => request('/' + code, { token }),
  start: (code, token, revision) => request('/' + code + '/action', { token, body: { type: 'start', revision, requestId: newToken().slice(0, 32) } }),
  action: (code, token, revision, body) => request('/' + code + '/action', { token, body: { ...body, revision, requestId: newToken().slice(0, 32) } }),
};

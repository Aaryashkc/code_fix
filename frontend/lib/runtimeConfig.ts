export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

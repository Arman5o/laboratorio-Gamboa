import { API_URL } from './api';

export const fetchAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  // Si la URL es relativa (empieza con /), agregarle el API_URL base
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
  
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(fullUrl, { ...options, headers });
};

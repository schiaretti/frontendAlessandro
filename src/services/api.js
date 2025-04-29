/*import axios from 'axios'

const api = axios.create({
   baseURL:"https://backendalesandro-production.up.railway.app/",  

});

// Adicione no arquivo onde configura o Axios
axios.interceptors.request.use(config => {
  console.log('Enviando requisição para:', config.url);
  return config;
});

axios.interceptors.response.use(response => {
  console.log('Resposta recebida:', response.status, response.data);
  return response;
}, error => {
  console.error('Erro na requisição:', {
      url: error.config.url,
      status: error.response?.status,
      data: error.response?.data
  });
  return Promise.reject(error);
});

export default api */

import axios from "axios";

const api = axios.create({
  baseURL: "https://backendalesandro-production.up.railway.app/api",
});

// Adiciona o token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Trata erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
import axios from 'axios'

const api = axios.create({
   baseURL:"https://backendalesandro-production.up.railway.app/",  

});

// Adiciona o token automaticamente a cada requisição
api.interceptors.request.use(config => {
   const token = localStorage.getItem('token');
   if (token) {
     config.headers.Authorization = `Bearer ${token}`;
   }
   return config;
 });

export default api 
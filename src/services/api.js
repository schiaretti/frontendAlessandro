import axios from 'axios'

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

export default api 
import axios from 'axios'

const api = axios.create({
   baseURL:"https://apialessandro-production.up.railway.app/",

});

export default api 
import axios from 'axios'

const api = axios.create({
   baseURL:"https://backendalesandro-production.up.railway.app/",

});

export default api 
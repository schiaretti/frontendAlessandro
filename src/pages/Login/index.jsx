import { Link, useNavigate } from "react-router-dom";
import { useRef } from "react";
import api from "../../services/api"; // Ajuste para o caminho correto da API

function Login() {
  const emailRef = useRef(null); // Referência para o campo de email
  const senhaRef = useRef(null); // Referência para o campo de senha
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
  
    const email = emailRef.current?.value;
    const senha = senhaRef.current?.value;
  
    if (!email || !senha) {
      alert("Por favor, preencha todos os campos.");
      return;
    }
  
    try {
      // 1. Chamada para a API de login
      const response = await api.post("/api/login", { 
        email, 
        senha 
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      // 2. Tratamento da resposta
      if (!response.data.token) {
        throw new Error("Token não recebido na resposta");
      }
  
      const token = response.data.token;
  
      // 3. Armazenamento do token
      localStorage.setItem("token", token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log("Login bem-sucedido. Token:", token);
      
      // 4. Redirecionamento
      navigate("/cadastro");
  
    } catch (error) {
      console.error("Erro detalhado:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // Mensagens de erro específicas
      if (error.response?.status === 401) {
        alert("Credenciais inválidas!");
      } else if (error.response?.status === 404) {
        alert("Endpoint não encontrado. Verifique a URL!");
      } else {
        alert(`Erro ao fazer login: ${error.message}`);
      }
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 bg-slate-500 p-8 border border-slate-400 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Login</h2>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <input
          ref={emailRef}
          placeholder="Email"
          type="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none hover:bg-slate-200"
        />
        <input
          ref={senhaRef}
          placeholder="Senha"
          type="password"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none hover:bg-slate-200"
        />
        <button className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-400 font-bold">
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
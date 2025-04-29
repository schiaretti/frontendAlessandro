/*import { Link, useNavigate } from "react-router-dom";
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

export default Login;*/


import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import api from "../../services/api";

function Login() {
  const emailRef = useRef(null);
  const senhaRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const email = emailRef.current?.value;
    const senha = senhaRef.current?.value;

    try {
      const { data } = await api.post('/login', { email, senha });

      if (!data.success) {
        throw new Error(data.message || 'Erro no login');
      }

      // Armazena os dados de autenticação
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Configura o token padrão para todas as requisições
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      // Redirecionamento baseado no nível
      switch(data.user.nivel) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'cadastrador':
          navigate('/cadastro');
          break;
        default:
          navigate('/');
      }

    } catch (error) {
      console.error('Erro no login:', error);
      
      let errorMessage = 'Erro ao fazer login';
      if (error.response) {
        switch(error.response.data.code) {
          case 'MISSING_CREDENTIALS':
            errorMessage = 'Email e senha são obrigatórios';
            break;
          case 'USER_NOT_FOUND':
            errorMessage = 'Usuário não encontrado';
            break;
          case 'INVALID_CREDENTIALS':
            errorMessage = 'Credenciais inválidas';
            break;
          default:
            errorMessage = error.response.data.message || errorMessage;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Login</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              ref={emailRef}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              ref={senhaRef}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
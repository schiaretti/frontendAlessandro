import { Link, useNavigate } from "react-router-dom";
import { useRef } from "react";
import api from "../../services/api"; // Ajuste para o caminho correto da API

function Login() {
  const emailRef = useRef(null); // Referência para o campo de email
  const senhaRef = useRef(null); // Referência para o campo de senha
  const navigate = useNavigate();

  // Função para lidar com o envio do formulário
  async function handleSubmit(event) {
    event.preventDefault();

    const email = emailRef.current?.value;
    const senha = senhaRef.current?.value;

    console.log("Valor de emailRef:", email);
    console.log("Valor de senhaRef:", senha);

    // Verificando se os campos estão preenchidos
    if (!email || !senha) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    try {
      // Fazendo a requisição para o backend
      const { data } = await api.post("/api/login", { email, senha });

      // Verifica se o token foi recebido
      if (data.token) {
        // Armazena o token no localStorage
        localStorage.setItem("token", data.token);
        console.log("Token armazenado:", data.token);

        // Redireciona para a página de cadastro
        navigate("/cadastro");
      } else {
        console.error("Token não recebido na resposta:", data);
        alert("Erro ao fazer login. Tente novamente!");
      }
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      alert("Usuário ou senha inválidos!");
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
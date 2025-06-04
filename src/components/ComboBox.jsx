import React from "react";

const ComboBox = ({ 
  label, 
  options, 
  onChange, 
  className, 
  name, 
  autoComplete = "off",
  id = name, // Novo prop id que default para o valor de name
  value, // Novo prop para controlled component
  required // Novo prop para indicar campos obrigatórios
}) => {
  return (
    <div className={`flex flex-col text-center ${className}`}>
      {/* Label do ComboBox - agora associado corretamente via id */}
      {label && (
        <label 
          htmlFor={id} // Associando ao id do select
          className="mb-2 text-gray-700 font-extrabold"
        >
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      {/* Select (dropdown) com todos os atributos necessários */}
      <select
        id={id} // Adicionando id que corresponde ao htmlFor do label
        name={name}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        value={value} // Tornando o componente controlado
        required={required}
        className="p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        aria-required={required} // Acessibilidade
      >
        {/* Opção padrão (vazia) */}
        <option value="">Selecione uma opção</option>

        {/* Mapeia as opções passadas como prop */}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ComboBox;
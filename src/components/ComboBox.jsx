import React from "react";

const ComboBox = ({ label, options, onChange, className }) => {
  return (
    <div className={`flex flex-col text-center ${className}`}>
      {/* Label do ComboBox */}
      {label && (
        <label className="mb-2 text-gray-700 font-extrabold text-2xl">
          {label}
        </label>
      )}

      {/* Select (dropdown) */}
      <select
        onChange={(e) => onChange(e.target.value)}
        className="p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
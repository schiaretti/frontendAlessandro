import { useState } from 'react';
import {
  FiFilter, FiChevronDown, FiChevronUp, FiSearch, FiDownload,
  FiAlertCircle, FiCheckCircle, FiBarChart2, FiMapPin,
  FiZap, FiSun, FiCpu, FiLayers, FiTrendingUp, FiGrid
} from 'react-icons/fi';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function Relatorios() {
  const [filtros, setFiltros] = useState({
    tipoRelatorio: 'estatisticas',
    // Filtros básicos
    endereco: '', cidade: '', numeroIdentificacao: '', cep: '',
    // Componentes elétricos
    transformador: '', concentrador: '', telecom: '', medicao: '',
    // Iluminação
    tipoLampada: '', potenciaMin: '', potenciaMax: '', tipoReator: '', tipoComando: '',
    // Características físicas
    estruturaposte: '', tipoBraco: '', alturaposteMin: '', alturaposteMax: '',
    tamanhoBracoMin: '', tamanhoBracoMax: '', quantidadePontosMin: '', quantidadePontosMax: '',
    // Rede elétrica
    tipoRede: '', tipoCabo: '', numeroFases: '',
    // Infraestrutura
    tipoVia: '', hierarquiaVia: '', tipoPavimento: '', tipoPasseio: '', canteiroCentral: '',
    quantidadeFaixasMin: '', quantidadeFaixasMax: '', larguraCanteiroMin: '', larguraCanteiroMax: '',
    // Outros
    finalidadeInstalacao: '', especieArvore: '', distanciaEntrePostesMin: '', distanciaEntrePostesMax: '',
    // Coordenadas
    latitude: '', longitude: ''
  });

  const [resultados, setResultados] = useState({ data: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState(false);
  const [notificacao, setNotificacao] = useState({ mostrar: false, mensagem: '', tipo: '' });
  const [paginacao, setPaginacao] = useState({
    pagina: 1,
    itensPorPagina: 20,
    totalItens: 0
  });

  const mostrarNotificacao = (mensagem, tipo) => {
    setNotificacao({ mostrar: true, mensagem, tipo });
    setTimeout(() => setNotificacao(prev => ({ ...prev, mostrar: false })), 5000);
  };

  const handleRangeChange = (minField, maxField, value, isMin) => {
    setFiltros(prev => ({
      ...prev,
      [isMin ? minField : maxField]: value
    }));
  };

  const buscarDados = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filtros)
          .filter(([_, v]) => v !== '' && v !== null && v !== undefined)
          .map(([k, v]) => {
            if (['transformador', 'concentrador', 'telecom', 'medicao'].includes(k)) {
              if (v === true || v === 'true') return [k, "true"];
              if (v === false || v === 'false') return [k, "false"];
              return [k, undefined];
            }
             if (typeof v === 'string' && !isNaN(v) && v.trim() !== '') {
              const numValue = v.includes('.') ? parseFloat(v) : parseInt(v);
              return [k, isNaN(numValue) ? v : numValue];
            }

            return [k, v];
          })
          .filter(([_, v]) => v !== undefined)
      );

     

      const validarFaixasNumericas = () => {
        const campos = [
          { min: 'alturaposteMin', max: 'alturaposteMax' },
          { min: 'tamanhoBracoMin', max: 'tamanhoBracoMax' },
          { min: 'quantidadePontosMin', max: 'quantidadePontosMax' },
          { min: 'potenciaMin', max: 'potenciaMax' },
          { min: 'quantidadeFaixasMin', max: 'quantidadeFaixasMax' },
          { min: 'larguraCanteiroMin', max: 'larguraCanteiroMax' },
          { min: 'distanciaEntrePostesMin', max: 'distanciaEntrePostesMax' }
        ];

        for (const { min, max } of campos) {
          const minVal = parseFloat(filtros[min]);
          const maxVal = parseFloat(filtros[max]);

          if (!isNaN(minVal) && !isNaN(maxVal) && minVal > maxVal) {
            mostrarNotificacao(`Valor mínimo não pode ser maior que máximo para ${min.replace('Min', '')}`, 'erro');
            return false;
          }
        }
        return true;
      };

      if (!validarFaixasNumericas()) {
        setLoading(false);
        return;
      }

      const response = await api.get('/relatorios/postes', {
        params: {
          ...params,
          page: paginacao.pagina,
          per_page: paginacao.itensPorPagina
        },
        timeout: 30000
      });
      console.log('Resposta da API:', response.data);

      const responseData = response.data || {};
      const formattedData = {
        data: Array.isArray(responseData.data) ? responseData.data : [],
        meta: responseData.meta || {
          total: 0
        }
      };

      setResultados(formattedData);
      setPaginacao(prev => ({
        ...prev,
        totalItens: formattedData.meta.total || 0
      }));

      mostrarNotificacao('Relatório gerado com sucesso!', 'sucesso');
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      let errorMessage = 'Erro ao gerar relatório';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Tempo de requisição excedido';
      } else if (error.response) {
        errorMessage = error.response.data?.message ||
          error.response.data?.error ||
          `Erro ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = "Não foi possível conectar ao servidor";
      } else {
        errorMessage = error.message || "Erro desconhecido";
      }

      mostrarNotificacao(errorMessage, 'erro');
      setResultados({ data: [], meta: null });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (resultados.data.length === 0) {
      mostrarNotificacao('Nenhum dado para exportar', 'erro');
      return;
    }

    try {
      const dadosParaExportar = resultados.data.map(poste => ({
        'N° Poste': poste.numeroIdentificacao || '-',
        'Endereço': poste.endereco || '-',
        'Número': poste.numero || '-',
        'Cidade': poste.cidade || '-',
        'Latitude': poste.latitude || '-',
        'Longitude': poste.longitude || '-',
        'Transformador': poste.transformador ? 'Sim' : 'Não',
        'Concentrador': poste.concentrador ? 'Sim' : 'Não',
        'Lâmpada': poste.tipoLampada || '-',
        'Potência (W)': poste.potenciaLampada || '-',
        'Altura (m)': poste.alturaposte || '-',
        'Estrutura': poste.estruturaposte || '-',
        'Tipo de Braço': poste.tipoBraco || '-',
        'Tamanho Braço (m)': poste.tamanhoBraco || '-',
        'Qtd. Pontos': poste.quantidadePontos || '-',
        'Tipo Reator': poste.tipoReator || '-',
        'Tipo Comando': poste.tipoComando || '-',
        'Tipo Rede': poste.tipoRede || '-',
        'Tipo Cabo': poste.tipoCabo || '-',
        'N° Fases': poste.numeroFases || '-',
        'Tipo Via': poste.tipoVia || '-',
        'Hierarquia Via': poste.hierarquiaVia || '-',
        'Tipo Pavimento': poste.tipoPavimento || '-',
        'Qtd. Faixas': poste.quantidadeFaixas || '-',
        'Tipo Passeio': poste.tipoPasseio || '-',
        'Canteiro Central': poste.canteiroCentral ? 'Sim' : 'Não',
        'Largura Canteiro (m)': poste.larguraCanteiro || '-',
        'Finalidade': poste.finalidadeInstalacao || '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio_Postes');

      const date = new Date();
      const fileName = `Relatorio_Postes_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}.xlsx`;

      XLSX.writeFile(workbook, fileName);
      mostrarNotificacao('Exportação para Excel concluída!', 'sucesso');
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      mostrarNotificacao('Erro ao exportar para Excel', 'erro');
    }
  };

  const exportToPDF = () => {
    if (resultados.data.length === 0) {
      mostrarNotificacao('Nenhum dado para exportar', 'erro');
      return;
    }

    try {
      // Criar novo documento PDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm'
      });

      // Configurações do documento
      const title = 'Relatório de Postes';
      const date = new Date();
      const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      // Adicionar cabeçalho
      doc.setFontSize(16);
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${dateStr}`, 14, 22);
      doc.text(`Total de postes: ${resultados.meta.total}`, 14, 28);

      // Preparar dados para a tabela
      const columns = [
        { title: 'N° Poste', dataKey: 'numeroIdentificacao' },
        { title: 'Endereço', dataKey: 'endereco' },
        { title: 'Cidade', dataKey: 'cidade' },
        { title: 'Transformador', dataKey: 'transformador' },
        { title: 'Lâmpada', dataKey: 'tipoLampada' },
        { title: 'Potência (W)', dataKey: 'potenciaLampada' },
        { title: 'Altura (m)', dataKey: 'alturaposte' },
        { title: 'Tipo Rede', dataKey: 'tipoRede' }
      ];

      const rows = resultados.data.map(poste => ({
        numeroIdentificacao: poste.numeroIdentificacao || '-',
        endereco: poste.endereco || '-',
        cidade: poste.cidade || '-',
        transformador: poste.transformador ? 'Sim' : 'Não',
        tipoLampada: poste.tipoLampada || '-',
        potenciaLampada: poste.potenciaLampada || '-',
        alturaposte: poste.alturaposte ? `${poste.alturaposte}m` : '-',
        tipoRede: poste.tipoRede || '-'
      }));

      // Adicionar tabela ao PDF
      autoTable(doc, {
        head: [columns.map(col => col.title)],
        body: rows.map(row => columns.map(col => row[col.dataKey])),
        startY: 35,
        margin: { left: 14 },
        styles: {
          fontSize: 8,
          cellPadding: 1,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });

      // Adicionar número de páginas
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
      }

      // Salvar PDF
      doc.save(`Relatorio_Postes_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}.pdf`);

      mostrarNotificacao('Exportação para PDF concluída!', 'sucesso');
    } catch (error) {
      console.error('Erro ao exportar para PDF:', error);
      mostrarNotificacao('Erro ao exportar para PDF', 'erro');
    }
  };

  const RangeInput = ({ label, minField, maxField, unit = '', icon }) => (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 items-center gap-1">
        {icon && <span className="text-gray-500">{icon}</span>}
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder={`Mín ${unit}`}
          value={filtros[minField]}
          onChange={(e) => handleRangeChange(minField, maxField, e.target.value, true)}
          className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          type="number"
          placeholder={`Máx ${unit}`}
          value={filtros[maxField]}
          onChange={(e) => handleRangeChange(minField, maxField, e.target.value, false)}
          className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );

  const SelectInput = ({ field, label, options, icon }) => (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 items-center gap-1">
        {icon && <span className="text-gray-500">{icon}</span>}
        {label}
      </label>
      <select
        value={filtros[field]}
        onChange={(e) => setFiltros({ ...filtros, [field]: e.target.value })}
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Todos</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  const BooleanSelect = ({ field, label, icon }) => (
    <SelectInput
      field={field}
      label={label}
      icon={icon}
      options={[
        { value: "true", label: "Sim" },
        { value: "false", label: "Não" }
      ]}
    />
  );

  const StatCard = ({ title, value, description, icon, color = 'blue' }) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      amber: 'bg-amber-50 text-amber-600 border-amber-200'
    };

    return (
      <div className={`border p-4 rounded-lg ${colors[color]} flex flex-col h-full`}>
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-sm">{title}</h3>
          <span className="text-xl">{icon}</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          <div>
            <p className="text-2xl font-bold">{value}</p>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {notificacao.mostrar && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-xl flex items-center space-x-2
          ${notificacao.tipo === 'sucesso' ? 'bg-green-500' : 'bg-red-500'} text-white animate-fade-in`}>
          {notificacao.tipo === 'sucesso' ? <FiCheckCircle className="text-xl" /> : <FiAlertCircle className="text-xl" />}
          <span className="font-medium">{notificacao.mensagem}</span>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FiBarChart2 className="text-blue-600" />
        Relatórios de Postes
      </h1>

      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <label className="block mb-2 font-medium text-gray-700">Tipo de Relatório</label>
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={filtros.tipoRelatorio}
            onChange={(e) => setFiltros({ ...filtros, tipoRelatorio: e.target.value })}
            className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-auto"
          >
            <option value="estatisticas">Estatísticas Gerais</option>
            <option value="por-rua">Postes por Rua</option>
            <option value="filtro">Busca Avançada</option>
          </select>

          <button
            onClick={() => setMostrarFiltrosAvancados(!mostrarFiltrosAvancados)}
            className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 px-4 py-2 rounded-md"
          >
            {mostrarFiltrosAvancados ? <FiChevronUp /> : <FiChevronDown />}
            {mostrarFiltrosAvancados ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-white rounded-lg shadow-sm border">
        <div>
          <label className="block mb-1 font-medium text-gray-700 items-center gap-1">
            <FiMapPin className="text-gray-500" />
            Número de Identificação
          </label>
          <input
            type="text"
            value={filtros.numeroIdentificacao}
            onChange={(e) => setFiltros({ ...filtros, numeroIdentificacao: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Digite o número do poste"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">Cidade</label>
          <input
            type="text"
            value={filtros.cidade}
            onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">Endereço</label>
          <input
            type="text"
            value={filtros.endereco}
            onChange={(e) => setFiltros({ ...filtros, endereco: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: Avenida Paulista"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-white rounded-lg shadow-sm border">
        <div>
          <label className="block mb-1 font-medium text-gray-700">Latitude</label>
          <input
            type="number"
            value={filtros.latitude}
            onChange={(e) => setFiltros({ ...filtros, latitude: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: -23.5505"
            step="any"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">Longitude</label>
          <input
            type="number"
            value={filtros.longitude}
            onChange={(e) => setFiltros({ ...filtros, longitude: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: -46.6333"
            step="any"
          />
        </div>
      </div>

      {mostrarFiltrosAvancados && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <div className="space-y-3">
            <h3 className="font-medium border-b pb-1 flex items-center gap-2 text-gray-700">
              <FiZap className="text-yellow-500" />
              Componentes
            </h3>
            <BooleanSelect field="transformador" label="Transformador" icon={<FiZap />} />
            <BooleanSelect field="concentrador" label="Concentrador" icon={<FiGrid />} />
            <BooleanSelect field="telecom" label="Telecom" icon={<FiTrendingUp />} />
            <BooleanSelect field="medicao" label="Medição" icon={<FiCpu />} />
          </div>

          <div className="space-y-3">
            <h3 className="font-medium border-b pb-1 flex items-center gap-2 text-gray-700">
              <FiSun className="text-amber-500" />
              Iluminação
            </h3>
            <SelectInput
              field="tipoLampada"
              label="Tipo de Lâmpada"
              icon={<FiSun />}
              options={[
                { value: "Vapor de Sodio VS", label: "Vapor de Sodio VS" },
                { value: "Vapor de Mercúrio VM", label: "Vapor de Mercúrio VM" },
                { value: "Mista", label: "Mista" },
                { value: "Led", label: "Led" },
                { value: "Desconhecida", label: "Desconhecida" },
              ]}
            />
            <RangeInput
              label="Potência (W)"
              minField="potenciaMin"
              maxField="potenciaMax"
              icon={<FiZap />}
            />
            <SelectInput
              field="tipoReator"
              label="Tipo de Reator"
              icon={<FiLayers />}
              options={[
                { value: "Reator Externo", label: "Reator Externo" },
                { value: "Reator Integrado", label: "Reator Integrado" },
                { value: "Módulo", label: "Módulo" },
              ]}
            />
            <SelectInput
              field="tipoComando"
              label="Tipo de Comando"
              icon={<FiLayers />}
              options={[
                { value: "Individual", label: "Individual" },
                { value: "Coletivo", label: "Coletivo" },
              ]}
            />
          </div>

          <div className="space-y-3">
            <h3 className="font-medium border-b pb-1 flex items-center gap-2 text-gray-700">
              <FiLayers className="text-gray-500" />
              Estrutura
            </h3>
            <RangeInput
              label="Altura (m)"
              minField="alturaposteMin"
              maxField="alturaposteMax"
              unit="m"
              icon={<FiTrendingUp />}
            />
            <RangeInput
              label="Tamanho Braço (m)"
              minField="tamanhoBracoMin"
              maxField="tamanhoBracoMax"
              unit="m"
              icon={<FiLayers />}
            />
            <SelectInput
              field="tipoBraco"
              label="Tipo de Braço"
              icon={<FiLayers />}
              options={[
                { value: "Braço Curto", label: "Braço Curto" },
                { value: "Braço Médio", label: "Braço Médio" },
                { value: "Braço Longo", label: "Braço Longo" },
                { value: "Level 1", label: "Level 1" },
                { value: "Level 2", label: "Level 2" },
                { value: "Suporte com 1", label: "Suporte com 1" },
                { value: "Suporte com 2", label: "Suporte com 2" },
                { value: "Suporte com 3", label: "Suporte com 3" },
                { value: "Suporte com 4", label: "Suporte com 4" },
              ]}
            />
          </div>

          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-3">
              <h3 className="font-medium border-b pb-1 flex items-center gap-2 text-gray-700">
                <FiZap className="text-yellow-500" />
                Rede Elétrica
              </h3>
              <SelectInput
                field="tipoRede"
                label="Tipo de Rede"
                icon={<FiZap />}
                options={[
                  { value: "Aérea BT", label: "Aérea BT" },
                  { value: "Convencional", label: "Convencional" },
                  { value: "Subterrânea", label: "Subterrânea" },
                ]}
              />
              <SelectInput
                field="numeroFases"
                label="Número de Fases"
                icon={<FiZap />}
                options={[
                  { value: "Monofásico", label: "Monofásico" },
                  { value: "Bifásico", label: "Bifásico" },
                  { value: "Trifásico", label: "Trifásico" },
                ]}
              />
            </div>

            <div className="space-y-3">
              <h3 className="font-medium border-b pb-1 flex items-center gap-2 text-gray-700">
                <FiMapPin className="text-blue-500" />
                Infraestrutura
              </h3>
              <SelectInput
                field="tipoVia"
                label="Tipo de Via"
                icon={<FiMapPin />}
                options={[
                  { value: "Via Rápida", label: "Via Rápida" },
                  { value: "Via Local", label: "Via Local" },
                  { value: "Via Arterial", label: "Via Arterial" },
                  { value: "Via Coletora", label: "Via Coletora" },
                  { value: "Via Rural", label: "Via Rural" },
                ]}
              />
              <BooleanSelect
                field="canteiroCentral"
                label="Canteiro Central"
                icon={<FiMapPin />}
              />
              <SelectInput
                field="finalidadeInstalacao"
                label="Finalidade da Instalação"
                icon={<FiMapPin />}
                options={[
                  { value: "Viária", label: "Viária" },
                  { value: "Cemitério", label: "Cemitério" },
                  { value: "Praça", label: "Praça" },
                  { value: "Espaço municipal", label: "Espaço municipal" },
                  { value: "Ciclo via", label: "Ciclo via" },
                  { value: "Pista de caminhada", label: "Pista de caminhada" },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center mb-8">
        <button
          onClick={buscarDados}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-8 rounded-lg font-medium shadow-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Gerando Relatório...
            </>
          ) : (
            <>
              <FiSearch />
              Gerar Relatório
            </>
          )}
        </button>
      </div>

      {resultados.meta && (
        <div className="mt-8">
          {filtros.tipoRelatorio === 'estatisticas' ? (
            <div className="bg-white p-6 rounded-lg shadow border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FiBarChart2 className="text-blue-600" />
                Estatísticas Gerais
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
                <StatCard
                  title="Total Postes"
                  value={resultados.meta.total}
                  icon="📊"
                  color="blue"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden border">
              <div className="p-4 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-center gap-2">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FiMapPin />
                    {resultados.meta.total} Postes Encontrados
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-medium bg-green-50 px-3 py-1 rounded-md"
                  >
                    <FiDownload />
                    Exportar para Excel
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium bg-red-50 px-3 py-1 rounded-md"
                  >
                    <FiDownload />
                    Exportar para PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Poste</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endereço</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cidade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordenadas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transformador</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concentrador</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lâmpada</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Potência</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AlturaPoste</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estrutura</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TipoBraço</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TamanhoBraço</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTDPontos</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TipoReator</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TipoComando</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TipoRede</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TipoCabo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N°.Fases</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TipoVia</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hierarquia</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pavimento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTDFaixas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passeio</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CanteiroCentral</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LarguraCanteiro</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finalidade</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {resultados.data.length > 0 ? (
                      resultados.data.map((poste) => {
                        const posteData = {
                          numeroIdentificacao: poste.numeroIdentificacao || '-',
                          endereco: poste.endereco || '-',
                          numero: poste.numero || '',
                          cidade: poste.cidade || '-',
                          latitude: poste.latitude || null,
                          longitude: poste.longitude || null,
                          transformador: poste.transformador || false,
                          concentrador: poste.concentrador || false,
                          tipoLampada: poste.tipoLampada || '-',
                          potenciaLampada: poste.potenciaLampada || null,
                          alturaposte: poste.alturaposte || null,
                          estruturaposte: poste.estruturaposte || '-',
                          tipoBraco: poste.tipoBraco || '-',
                          tamanhoBraco: poste.tamanhoBraco || null,
                          quantidadePontos: poste.quantidadePontos || null,
                          tipoReator: poste.tipoReator || '-',
                          tipoComando: poste.tipoComando || '-',
                          tipoRede: poste.tipoRede || '-',
                          tipoCabo: poste.tipoCabo || '-',
                          numeroFases: poste.numeroFases || '-',
                          tipoVia: poste.tipoVia || '-',
                          hierarquiaVia: poste.hierarquiaVia || '-',
                          tipoPavimento: poste.tipoPavimento || '-',
                          quantidadeFaixas: poste.quantidadeFaixas || null,
                          tipoPasseio: poste.tipoPasseio || '-',
                          canteiroCentral: poste.canteiroCentral || false,
                          larguraCanteiro: poste.larguraCanteiro || null,
                          finalidadeInstalacao: poste.finalidadeInstalacao || '-'
                        };

                        return (
                          <tr key={poste.numeroIdentificacao || Math.random()} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {posteData.numeroIdentificacao}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.endereco}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.numero}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.cidade}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.latitude && posteData.longitude
                                ? `${posteData.latitude}, ${posteData.longitude}`
                                : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {posteData.transformador ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Sim
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  Não
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {posteData.concentrador ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Sim
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  Não
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.tipoLampada}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.potenciaLampada ? `${posteData.potenciaLampada}W` : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.alturaposte ? `${posteData.alturaposte}m` : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.estruturaposte}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.tipoBraco}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.tamanhoBraco ? `${posteData.tamanhoBraco}m` : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.quantidadePontos || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.tipoReator}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.tipoComando}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.tipoRede}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.tipoCabo}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.numeroFases}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.tipoVia}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.hierarquiaVia}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.tipoPavimento}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.quantidadeFaixas || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.tipoPasseio}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {posteData.canteiroCentral ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Sim
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  Não
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.larguraCanteiro ? `${posteData.larguraCanteiro}m` : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {posteData.finalidadeInstalacao}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="27" className="px-4 py-6 text-center text-gray-500">
                          Nenhum poste encontrado com os filtros selecionados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {resultados.meta.total > paginacao.itensPorPagina && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{(paginacao.pagina - 1) * paginacao.itensPorPagina + 1}</span> a{' '}
                      <span className="font-medium">{Math.min(paginacao.pagina * paginacao.itensPorPagina, resultados.meta.total)}</span> de{' '}
                      <span className="font-medium">{resultados.meta.total}</span> resultados
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setPaginacao(prev => ({ ...prev, pagina: Math.max(1, prev.pagina - 1) }));
                        buscarDados();
                      }}
                      disabled={paginacao.pagina === 1}
                      className="px-3 py-1 border rounded-md text-sm font-medium disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => {
                        setPaginacao(prev => ({ ...prev, pagina: prev.pagina + 1 }));
                        buscarDados();
                      }}
                      disabled={paginacao.pagina * paginacao.itensPorPagina >= resultados.meta.total}
                      className="px-3 py-1 border rounded-md text-sm font-medium disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Relatorios;
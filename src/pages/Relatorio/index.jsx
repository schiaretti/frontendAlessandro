import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const Relatorio = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    data: [],
    meta: {
      total: 0,
      componentes: {
        transformador: 0,
        concentrador: 0,
        telecom: 0,
        medicao: 0
      },
      iluminacao: {
        lampadas70w: 0,
        lampadas100w: 0,
        lampadas150w: 0
      }
    }
  });
  const [reportType, setReportType] = useState('estatisticas');
  const [includePhotos, setIncludePhotos] = useState(false);
  const [photoType, setPhotoType] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0
  });

  // Filtros
  const [filters, setFilters] = useState({
    numeroIdentificacao: '',
    endereco: '',
    cidade: '',
    numero: '',
    cep: '',
    localizacao: '',
    transformador: '',
    concentrador: '',
    telecom: '',
    medicao: '',
    tipoLampada: '',
    tipoRede: '',
    estruturaposte: '',
    tipoBraco: '',
  });

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = {
        tipoRelatorio: reportType,
        incluirFotos: includePhotos.toString(),
        ...(photoType && { tipoFoto: photoType }),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
        page: pagination.page,
        per_page: pagination.per_page
      };

      console.log('Chamando API com parâmetros:', params);
      
      // Usando URL completo do backend
    const response = await axios.get('/api/relatorios/postes', { params });

      console.log('Resposta da API:', response.data);
      
      setReportData(prev => ({
        data: response.data?.data || prev.data,
        meta: {
          total: response.data?.meta?.total || prev.meta.total,
          componentes: {
            transformador: response.data?.meta?.componentes?.transformador || prev.meta.componentes.transformador,
            concentrador: response.data?.meta?.componentes?.concentrador || prev.meta.componentes.concentrador,
            telecom: response.data?.meta?.componentes?.telecom || prev.meta.componentes.telecom,
            medicao: response.data?.meta?.componentes?.medicao || prev.meta.componentes.medicao
          },
          iluminacao: {
            lampadas70w: response.data?.meta?.iluminacao?.lampadas70w || prev.meta.iluminacao.lampadas70w,
            lampadas100w: response.data?.meta?.iluminacao?.lampadas100w || prev.meta.iluminacao.lampadas100w,
            lampadas150w: response.data?.meta?.iluminacao?.lampadas150w || prev.meta.iluminacao.lampadas150w
          }
        }
      }));

      setPagination(prev => ({
        ...prev,
        total: response.data?.meta?.total || prev.total,
        total_pages: Math.ceil((response.data?.meta?.total || prev.total) / pagination.per_page)
      }));
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      alert('Erro ao carregar relatório: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Não executar automaticamente na primeira renderização
    // para evitar chamadas desnecessárias
    if (Object.values(filters).some(value => value !== '') || reportType !== 'estatisticas') {
      fetchReportData();
    }
  }, [reportType, includePhotos, photoType, pagination.page, pagination.per_page]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 })); // Reset para primeira página
    fetchReportData();
  };

  const prepareStatsForExcel = () => {
    const stats = [];
    
    // Componentes
    stats.push({ 
      Categoria: 'Componentes', 
      Item: 'Transformadores', 
      Quantidade: reportData.meta?.componentes?.transformador || 0 
    });
    
    stats.push({ 
      Categoria: 'Componentes', 
      Item: 'Concentradores', 
      Quantidade: reportData.meta?.componentes?.concentrador || 0 
    });
    
    stats.push({ 
      Categoria: 'Componentes', 
      Item: 'Telecom', 
      Quantidade: reportData.meta?.componentes?.telecom || 0 
    });
    
    stats.push({ 
      Categoria: 'Componentes', 
      Item: 'Medição', 
      Quantidade: reportData.meta?.componentes?.medicao || 0 
    });
    
    // Iluminação
    stats.push({ 
      Categoria: 'Iluminação', 
      Item: 'Lâmpadas 70W', 
      Quantidade: reportData.meta?.iluminacao?.lampadas70w || 0 
    });
    
    stats.push({ 
      Categoria: 'Iluminação', 
      Item: 'Lâmpadas 100W', 
      Quantidade: reportData.meta?.iluminacao?.lampadas100w || 0 
    });
    
    stats.push({ 
      Categoria: 'Iluminação', 
      Item: 'Lâmpadas 150W', 
      Quantidade: reportData.meta?.iluminacao?.lampadas150w || 0 
    });
    
    return stats;
  };

  const exportToExcel = () => {
    if (!reportData?.data && reportType !== 'estatisticas') {
      alert('Nenhum dado disponível para exportar');
      return;
    }

    const dataToExport = reportType === 'estatisticas' 
      ? prepareStatsForExcel() 
      : reportData.data?.map(item => {
          // Remover as fotos do Excel
          const { fotos, ...rest } = item;
          return rest;
        }) || [];

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório de Postes");
    
    XLSX.writeFile(wb, "relatorio_postes.xlsx");
  };

  const exportToPDF = async () => {
    if (!reportData?.data && reportType !== 'estatisticas') {
      alert('Nenhum dado disponível para exportar');
      return;
    }

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Relatório de Postes', 105, 15, { align: 'center' });
    
    if (reportType === 'estatisticas') {
      // Estatísticas
      doc.setFontSize(12);
      let y = 30;
      
      doc.text('Componentes:', 14, y);
      y += 7;
      doc.text(`- Transformadores: ${reportData.meta?.componentes?.transformador || 0}`, 20, y);
      y += 7;
      doc.text(`- Concentradores: ${reportData.meta?.componentes?.concentrador || 0}`, 20, y);
      y += 7;
      doc.text(`- Telecom: ${reportData.meta?.componentes?.telecom || 0}`, 20, y);
      y += 7;
      doc.text(`- Medição: ${reportData.meta?.componentes?.medicao || 0}`, 20, y);
      y += 10;
      
      doc.text('Iluminação:', 14, y);
      y += 7;
      doc.text(`- Lâmpadas 70W: ${reportData.meta?.iluminacao?.lampadas70w || 0}`, 20, y);
      y += 7;
      doc.text(`- Lâmpadas 100W: ${reportData.meta?.iluminacao?.lampadas100w || 0}`, 20, y);
      y += 7;
      doc.text(`- Lâmpadas 150W: ${reportData.meta?.iluminacao?.lampadas150w || 0}`, 20, y);
    } else {
      // Tabela de dados
      const tableData = reportData.data?.map(item => [
        item.id || '',
        item.numeroIdentificacao || '',
        item.endereco || '',
        item.cidade || ''
      ]) || [];

      doc.autoTable({
        head: [['ID', 'Número', 'Endereço', 'Cidade']],
        body: tableData,
        startY: 30
      });

      // Adicionar fotos se solicitado
      if (includePhotos) {
        let y = doc.lastAutoTable.finalY + 20;
        
        doc.text('Fotos dos Postes:', 14, y);
        y += 10;
        
        // Processar cada poste com suas fotos
        for (const poste of reportData.data) {
          if (poste.fotos && poste.fotos.length > 0) {
            // Verificar se precisa adicionar nova página
            if (y > 250) {
              doc.addPage();
              y = 20;
            }
            
            doc.text(`Poste ${poste.numeroIdentificacao}:`, 14, y);
            y += 10;
            
            // Adicionar informações sobre as fotos
            doc.setFontSize(10);
            for (const foto of poste.fotos) {
              doc.text(`- Tipo: ${foto.tipo}, URL: ${foto.url}`, 20, y);
              y += 7;
              
              // Verificar se precisa adicionar nova página
              if (y > 270) {
                doc.addPage();
                y = 20;
              }
            }
            doc.setFontSize(12);
            y += 5;
          }
        }
      }
    }

    doc.save('relatorio_postes.pdf');
  };

  // Opções para selects
  const tiposLampada = ['LED', 'Vapor de Sódio', 'Vapor de Mercúrio', 'Metálica', 'Outro'];
  const tiposRede = ['Aérea', 'Subterrânea', 'Mista'];
  const tiposEstrutura = ['Concreto', 'Metálico', 'Madeira', 'Fibra', 'Outro'];
  const tiposBraco = ['Curto', 'Médio', 'Longo', 'Duplo', 'Outro'];

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Relatório de Postes</h1>
          <p className="text-gray-500">Visualize e exporte dados sobre postes e seus componentes</p>
        </div>
        
        {/* Filtros e Controles */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Filtros e Opções</h2>
          
          <form onSubmit={handleSearch}>
            {/* Pesquisa por Número de Identificação - Destacado */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="block text-sm font-medium text-blue-700 mb-2">Busca por Número de Identificação</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  name="numeroIdentificacao"
                  className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.numeroIdentificacao}
                  onChange={handleFilterChange}
                  placeholder="Digite o número de identificação do poste"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar
                </button>
              </div>
              <p className="mt-1 text-xs text-blue-600">Busque um poste específico pelo seu número de identificação</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
              {/* Tipo de Relatório */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Relatório</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="estatisticas">Estatísticas</option>
                  <option value="detalhado">Detalhado</option>
                  <option value="por-rua">Por Rua</option>
                </select>
              </div>

              {/* Cidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input
                  type="text"
                  name="cidade"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.cidade}
                  onChange={handleFilterChange}
                  placeholder="Digite a cidade"
                />
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input
                  type="text"
                  name="endereco"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.endereco}
                  onChange={handleFilterChange}
                  placeholder="Digite o endereço"
                />
              </div>

              {/* Número */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input
                  type="text"
                  name="numero"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.numero}
                  onChange={handleFilterChange}
                  placeholder="Digite o número"
                />
              </div>

              {/* CEP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <input
                  type="text"
                  name="cep"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.cep}
                  onChange={handleFilterChange}
                  placeholder="Digite o CEP"
                />
              </div>

              {/* Localização */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
                <input
                  type="text"
                  name="localizacao"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.localizacao}
                  onChange={handleFilterChange}
                  placeholder="Digite a localização"
                />
              </div>
              
              {/* Tipo de Lâmpada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Lâmpada</label>
                <select
                  name="tipoLampada"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.tipoLampada}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  {tiposLampada.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
              
              {/* Tipo de Rede */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Rede</label>
                <select
                  name="tipoRede"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.tipoRede}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  {tiposRede.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
              
              {/* Estrutura do Poste */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estrutura do Poste</label>
                <select
                  name="estruturaposte"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.estruturaposte}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  {tiposEstrutura.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
              
              {/* Tipo de Braço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Braço</label>
                <select
                  name="tipoBraco"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.tipoBraco}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  {tiposBraco.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
              
              {/* Transformador */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transformador</label>
                <select
                  name="transformador"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.transformador}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
              
              {/* Concentrador */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concentrador</label>
                <select
                  name="concentrador"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.concentrador}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>

              {/* Incluir Fotos */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includePhotos"
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={includePhotos}
                  onChange={(e) => setIncludePhotos(e.target.checked)}
                />
                <label htmlFor="includePhotos" className="text-sm font-medium text-gray-700">
                  Incluir Fotos
                </label>
              </div>

              {/* Tipo de Foto (condicional) */}
              {includePhotos && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Foto</label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={photoType}
                    onChange={(e) => setPhotoType(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="PANORAMICA">Panorâmica</option>
                    <option value="ARVORE">Árvore</option>
                    <option value="LUMINARIA">Luminária</option>
                    <option value="TELECOM">Telecom</option>
                    <option value="LAMPADA">Lâmpada</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
              )}
            </div>
            
            {/* Botões de Ação */}
            <div className="flex flex-wrap gap-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Pesquisar
              </button>

              <button
                type="button"
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center gap-2 shadow-sm"
                disabled={!reportData || loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar Excel
              </button>

              <button
                type="button"
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center gap-2 shadow-sm"
                disabled={!reportData || loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Exportar PDF
              </button>
            </div>
          </form>
        </div>
        
        {/* Conteúdo do Relatório */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-600">Carregando dados do relatório...</p>
              </div>
            </div>
          ) : reportData && (
            <div>
              {reportType === 'estatisticas' ? (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Estatísticas Gerais</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* Card de Total */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-sm border border-blue-200">
                      <h3 className="text-lg font-medium text-blue-800 mb-4">Total de Postes</h3>
                      <div className="flex items-end">
                        <span className="text-4xl font-bold text-blue-700">{reportData.meta.total}</span>
                        <span className="ml-2 text-blue-600 font-medium">unidades</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Componentes */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                        Componentes
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Transformadores</span>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold text-gray-800">{reportData.meta.componentes.transformador}</span>
                            <span className="ml-1 text-gray-500 text-sm">un</span>
                          </div>
                        </div>
                        
                        <div className="h-px bg-gray-200"></div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Concentradores</span>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold text-gray-800">{reportData.meta.componentes.concentrador}</span>
                            <span className="ml-1 text-gray-500 text-sm">un</span>
                          </div>
                        </div>
                        
                        <div className="h-px bg-gray-200"></div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Telecom</span>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold text-gray-800">{reportData.meta.componentes.telecom}</span>
                            <span className="ml-1 text-gray-500 text-sm">un</span>
                          </div>
                        </div>
                        
                        <div className="h-px bg-gray-200"></div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Medição</span>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold text-gray-800">{reportData.meta.componentes.medicao}</span>
                            <span className="ml-1 text-gray-500 text-sm">un</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Iluminação */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Iluminação
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Lâmpadas 70W</span>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold text-gray-800">{reportData.meta.iluminacao.lampadas70w}</span>
                            <span className="ml-1 text-gray-500 text-sm">un</span>
                          </div>
                        </div>
                        
                        <div className="h-px bg-gray-200"></div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Lâmpadas 100W</span>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold text-gray-800">{reportData.meta.iluminacao.lampadas100w}</span>
                            <span className="ml-1 text-gray-500 text-sm">un</span>
                          </div>
                        </div>
                        
                        <div className="h-px bg-gray-200"></div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Lâmpadas 150W</span>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold text-gray-800">{reportData.meta.iluminacao.lampadas150w}</span>
                            <span className="ml-1 text-gray-500 text-sm">un</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Listagem de Postes</h2>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endereço</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cidade</th>
                          {includePhotos && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fotos</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.data && reportData.data.length > 0 ? (
                          reportData.data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.id}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.numeroIdentificacao}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.endereco}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.cidade}</td>
                              {includePhotos && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.fotos?.length > 0 ? (
                                    <div className="flex space-x-2">
                                      {item.fotos.map((foto) => (
                                        <a 
                                          key={foto.id} 
                                          href={foto.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 flex items-center"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                        </a>
                                      ))}
                                    </div>
                                  ) : 'Nenhuma foto'}
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={includePhotos ? 5 : 4} className="px-6 py-10 text-center text-gray-500">
                              {reportType !== 'estatisticas' ? 'Nenhum dado encontrado' : 'Selecione filtros e clique em Pesquisar'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação */}
                  {reportData.data && reportData.data.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                      <div className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{(pagination.page - 1) * pagination.per_page + 1}</span> a{' '}
                        <span className="font-medium">
                          {Math.min(pagination.page * pagination.per_page, pagination.total)}
                        </span>{' '}
                        de <span className="font-medium">{pagination.total}</span> resultados
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          disabled={pagination.page === 1}
                          className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Anterior
                        </button>
                        
                        <div className="flex items-center">
                          <span className="px-3 py-2 bg-blue-50 text-blue-700 font-medium rounded-md border border-blue-200">
                            {pagination.page}
                          </span>
                          <span className="mx-2 text-gray-500">de</span>
                          <span className="text-gray-700">{pagination.total_pages}</span>
                        </div>
                        
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          disabled={pagination.page >= pagination.total_pages}
                          className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      </div>
    </div>
  );
};

export default Relatorio;

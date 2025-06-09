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
    try {
      // =============================================
      // 1. VERIFICAÇÃO INICIAL DE DADOS
      // =============================================

      if (!reportData?.data && reportType !== 'estatisticas') {
        throw new Error('Nenhum dado disponível para exportar');
      }

      // =============================================
      // 2. CONFIGURAÇÃO DO DOCUMENTO (AGORA EM RETRATO)
      // =============================================
      const doc = new jsPDF({
        orientation: 'portrait', // Alterado para landscape
        unit: 'mm',
        format: 'a4'
      });

      // =============================================
      // 3. FUNÇÕES AUXILIARES
      // =============================================
      // Função para carregar imagens
      const loadImage = (url) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`));
          img.src = url;
        });
      };

      // Função para calcular dimensões (ajustada para retrato)
      const calculateDimensions = (img, maxWidth, maxHeight) => {
        let width = img.width;
        let height = img.height;

        // Reduzir o tamanho máximo para fotos menores em retrato
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio * 0.9; // Reduz um pouco mais para retrato
        height = height * ratio * 0.9;

        return { width, height };
      };

      // =============================================
      // 4. ESTILOS DO DOCUMENTO (AJUSTADOS PARA RETRATO)
      // =============================================
      const styles = {
        title: { fontSize: 12, color: '#2c3e50', align: 'center' }, // Reduzido para retrato
        subtitle: { fontSize: 10, color: '#34495e' }, // Reduzido
        text: { fontSize: 6, color: '#7f8c8d' }, // Reduzido
        tableHeader: { fillColor: '#3498db', textColor: '#ffffff', fontSize: 6 }, // Reduzido
        photoLabel: { fontSize: 6, color: '#95a5a6', fontStyle: 'italic' } // Reduzido
      };

      // =============================================
      // 5. CABEÇALHO (AJUSTADO PARA RETRATO)
      // =============================================
      const addHeader = () => {
        doc.setFontSize(styles.title.fontSize);
        doc.setTextColor(styles.title.color);
        doc.text('RELATÓRIO DE POSTES', 105, 15, { align: 'center' }); // Centralizado em retrato (105mm)


        // Data e hora da geração
        doc.setFontSize(styles.text.fontSize);
        doc.setTextColor(styles.text.color);
        const date = new Date().toLocaleString('pt-BR');
        doc.text(`Gerado em: ${date}`, 105, 20, { align: 'center' });

        // Linha divisória (largura ajustada para retrato)
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 23, 190, 23); // Largura menor para retrato
      };

      addHeader();

      // =============================================
      // 6. SEÇÃO DE ESTATÍSTICAS (AJUSTADA PARA RETRATO)
      // =============================================

      if (reportType === 'estatisticas') {
       
        let y = 30;

        doc.setFontSize(styles.subtitle.fontSize);
        doc.setTextColor(styles.subtitle.color);
        doc.text('ESTATÍSTICAS GERAIS', 105, y, { align: 'center' });
        y += 10;

        // Componentes
        doc.setFontSize(8);
        doc.setTextColor('#2c3e50');
        doc.text('COMPONENTES INSTALADOS:', 20, y);
        y += 6;

        const components = [
          { label: 'Transformadores', value: reportData.meta?.componentes?.transformador || 0 },
          { label: 'Concentradores', value: reportData.meta?.componentes?.concentrador || 0 },
          { label: 'Equipamentos Telecom', value: reportData.meta?.componentes?.telecom || 0 },
          { label: 'Medição', value: reportData.meta?.componentes?.medicao || 0 }
        ];

          // Layout em duas colunas para economizar espaço
      components.forEach((comp, index) => {
        const x = index % 2 === 0 ? 25 : 100; // Coluna esquerda ou direita
        if (index % 2 === 0 && index !== 0) y += 6; // Nova linha a cada 2 itens
        
        doc.text(`• ${comp.label}:`, x, y);
        doc.setTextColor('#3498db');
        doc.text(`${comp.value}`, x + 40, y);
        doc.setTextColor('#2c3e50');
        
        if (index % 2 !== 0) y += 6;
      });

      y += 10;

        // Iluminação
        doc.text('ILUMINAÇÃO PÚBLICA:', 20, y);
        y += 6;

        const lighting = [
          { label: 'Lâmpadas 70W', value: reportData.meta?.iluminacao?.lampadas70w || 0 },
          { label: 'Lâmpadas 100W', value: reportData.meta?.iluminacao?.lampadas100w || 0 },
          { label: 'Lâmpadas 150W', value: reportData.meta?.iluminacao?.lampadas150w || 0 }
        ];

        // Layout em duas colunas
      lighting.forEach((light, index) => {
        const x = index % 2 === 0 ? 25 : 100;
        if (index % 2 === 0 && index !== 0) y += 6;
        
        doc.text(`• ${light.label}:`, x, y);
        doc.setTextColor('#e74c3c');
        doc.text(`${light.value}`, x + 30, y);
        doc.setTextColor('#2c3e50');
        
        if (index % 2 !== 0) y += 6;
      });

      } else {
        // Seção de dados detalhados (ajustada para landscape)
        const tableData = reportData.data?.map(item => [
          item.numeroIdentificacao || 'N/A',
          item.endereco || 'N/A',
          item.cidade || 'N/A'
        ]) || [];

        doc.autoTable({
        head: [['Número', 'Endereço', 'Cidade']],
        body: tableData,
        startY: 30,
        theme: 'grid',
        headStyles: styles.tableHeader,
        alternateRowStyles: { fillColor: '#f8f9fa' },
        margin: { top: 20 },
        styles: { 
          fontSize: 6, // Fonte menor
          cellPadding: 2, // Padding reduzido
          overflow: 'linebreak' // Quebra de linha para textos longos
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Coluna número mais estreita
          1: { cellWidth: 'auto' }, // Endereço ocupa espaço disponível
          2: { cellWidth: 30 } // Coluna cidade mais estreita
        }
      });

        // Adicionar fotos se solicitado (com layout lado a lado)
        if (includePhotos) {
          let y = doc.lastAutoTable.finalY + 15;

          doc.setFontSize(styles.subtitle.fontSize);
          doc.setTextColor(styles.subtitle.color);
          doc.text('REGISTRO FOTOGRÁFICO', 105, y, { align: 'center' });
          y += 8;

          // Processar cada poste com suas fotos
          for (const poste of reportData.data) {
            if (poste.fotos && poste.fotos.length > 0) {
              // Verificar espaço para o título do poste
              if (y > 250) { // Deixar margem de segurança
                doc.addPage('portrait');
                addHeader();
                y = 30;
              }

              doc.setFontSize(10);
              doc.setTextColor('#2c3e50');
              doc.text(`Poste: ${poste.numeroIdentificacao || 'N/A'}`, 20, y);
              y += 7;

              // Processar fotos em pares (lado a lado)
              for (let i = 0; i < poste.fotos.length; i += 2) {
                const foto1 = poste.fotos[i];
                const foto2 = poste.fotos[i + 1];

                // Calcular altura necessária para este par de fotos
                let requiredHeight = 0;

                try {
                  // Calcular dimensões da primeira foto
                  const img1 = await loadImage(foto1.url);
                  const maxWidth = 60;
                  const maxHeight = 60;
                  const dim1 = calculateDimensions(img1, maxWidth, maxHeight);

                  // Calcular dimensões da segunda foto (se existir)
                  let dim2 = { height: 0 };
                  if (foto2) {
                    const img2 = await loadImage(foto2.url);
                    dim2 = calculateDimensions(img2, maxWidth, maxHeight);
                  }

                  // Altura necessária = altura da foto mais alta + espaço para labels e margem
                  requiredHeight = Math.max(dim1.height, dim2.height) + 15;

                  // Verificar se há espaço suficiente na página atual
                  if (y + requiredHeight > 280) { // Margem de segurança de 10mm
                    doc.addPage('portrait');
                    addHeader();
                    y = 30;

                    // Re-adicionar o título do poste na nova página
                    doc.setFontSize(10);
                    doc.setTextColor('#2c3e50');
                    doc.text(`Poste: ${poste.numeroIdentificacao || 'N/A'} (continuação)`, 20, y);
                    y += 5;
                  }

                  // Adicionar label da foto 1
                  doc.setFontSize(styles.photoLabel.fontSize);
                  doc.setTextColor(styles.photoLabel.color);
                  doc.text(`Foto ${i + 1} (${foto1.tipo || 'Sem tipo'}):`, 20, y);

                  // Adicionar primeira imagem
                  doc.addImage(img1, 'JPEG', 20, y + 5, dim1.width, dim1.height);

                  // Se existir segunda foto, adicionar ao lado
                  if (foto2) {
                    // Adicionar label da foto 2
                    doc.text(`Foto ${i + 2} (${foto2.tipo || 'Sem tipo'}):`, 120, y);

                    // Adicionar segunda imagem
                    const img2 = await loadImage(foto2.url);
                    doc.addImage(img2, 'JPEG', 120, y + 5, dim2.width, dim2.height);
                  }

                  y += requiredHeight;

                } catch (error) {
                  console.error('Erro ao adicionar foto:', error);
                  doc.setFontSize(8);
                  doc.setTextColor('#e74c3c');
                  doc.text(`[Erro: Foto não carregada]`, 20, y);
                  y += 8;
                  doc.setTextColor(0, 0, 0);
                }
              }
              y += 6; // Espaço entre postes
            }
          }
        }
      }

      // Adicionar rodapé profissional (ajustado para landscape)
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor('#7f8c8d');
        doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' }); // Posição Y ajustada
        doc.text(`© ${new Date().getFullYear()} - SeuApp - Todos os direitos reservados`, 105, 290, { align: 'center' });
      }

      // Salvar o documento
      doc.save(`Relatorio_Postes_${new Date().toISOString().slice(0, 10)}.pdf`);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert(`Erro ao gerar PDF: ${error.message}`);
    }
  };


  // Opções para selects
  const tiposLampada = ['Led', 'Vapor de Sodio VS', 'Vapor de Mercúrio VM', 'Mista', 'Outro'];
  const tiposRede = ['Aérea BT', 'Subterrânea', 'Convencional', 'Outro'];
  const tiposEstrutura = ['Unilateral', 'Bilateral', 'Canteiro central', 'Praça', 'Em frente ao oposto', 'Outro'];
  const tiposBraco = ['Curto', 'Médio', 'Longo', 'Leve 1', 'Leve 2', 'Suporte c/ 1', 'Suporte c/ 2', 'Suporte c/ 3', 'Suporte c/ 4', 'Outro'];

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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Poste</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latitude</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Longitude</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cidade</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endereço</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CEP</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bairro</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">localizado em</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transformador</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medição</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telecom</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concentrador</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poste de</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Altura</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estrutura</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Braço</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamanho do Braço</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTD de Pontos</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Lâmpada</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Potência</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Reator</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Comando</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Rede</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Cabo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fase</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Via</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pavimento</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTD Faixas</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passeio</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canteiro Central</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Largura Canteiro</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distância entre Postes</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finalidade Instalação</th>
                          {includePhotos && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fotos</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.data && reportData.data.length > 0 ? (
                          reportData.data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.numeroIdentificacao}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.latitude}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.longitude}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.cidade}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.endereco}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.numero}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.cep}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.localizacao}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.emFrente}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.transformador ? 'Sim' : 'Não'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.medicao ? 'Sim' : 'Não'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.telecom ? 'Sim' : 'Não'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.concentrador ? 'Sim' : 'Não'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.poste}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.alturaposte} m</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.estruturaposte}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tipoBraco}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tamanhoBraco} m</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantidadePontos}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tipoLampada}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.potenciaLampada} W</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tipoReator}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tipoComando}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tipoRede}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tipoCabo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.numeroFases}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tipoVia}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tipoPavimento}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantidadeFaixas}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tipoPasseio ? 'Sim' : 'Não'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.canteiroCentral ? 'Sim' : 'Não'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.larguraCanteiro} m</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.distanciaEntrePostes} m</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.finalidadeInstalacao}</td>
                              {includePhotos && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.fotos && item.fotos.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                      {item.fotos.map((foto, idx) => (
                                        <div key={idx} style={{ textAlign: 'center' }}>
                                          <img
                                            src={foto.url}
                                            alt={`Foto ${foto.tipo || 'Poste'}`}
                                            style={{ width: '80px', height: '80px', objectFit: 'cover', border: '1px solid #ddd' }}
                                            onError={(e) => {
                                              e.target.onerror = null; // Evita loop infinito de erro
                                              e.target.src = 'URL_DA_IMAGEM_PADRAO_DE_ERRO'; // Imagem de placeholder
                                              console.error(`Erro ao carregar imagem na tabela: ${foto.url}`);
                                            }}
                                          />
                                          <p style={{ fontSize: '0.7em', margin: '2px 0 0' }}>{foto.tipo || 'Foto'}</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span>Nenhuma Foto</span>
                                  )}
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

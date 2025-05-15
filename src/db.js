// /src/db.js
import { openDB } from 'idb';
import axios from 'axios';

// Configuração do banco de dados
const DB_NAME = 'AllIluminacaoDB';
const DB_VERSION = 2; // Versão 2 para adicionar armazenamento de fotos

// Inicializa o banco de dados
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    // Cria a store para cadastros (se não existir)
    if (!db.objectStoreNames.contains('cadastros')) {
      const cadastrosStore = db.createObjectStore('cadastros', { 
        keyPath: 'id',
        autoIncrement: true 
      });
      
      // Índices para busca rápida
      cadastrosStore.createIndex('porStatus', 'statusSincronizacao');
      cadastrosStore.createIndex('porData', 'dataCriacao');
    }

    // Adiciona store para fotos na versão 2
    if (oldVersion < 2 && !db.objectStoreNames.contains('fotos')) {
      const fotosStore = db.createObjectStore('fotos', {
        keyPath: 'id',
        autoIncrement: true
      });
      
      fotosStore.createIndex('porCadastro', 'cadastroId');
    }
  },
});

// ==============================================
// FUNÇÕES PARA CADASTROS
// ==============================================

export async function salvarCadastroOffline(cadastroData, fotos = []) {
  const db = await dbPromise;
  const tx = db.transaction(['cadastros', 'fotos'], 'readwrite');

  try {
    // 1. Salva os dados principais
    const cadastroId = await tx.objectStore('cadastros').add({
      ...cadastroData,
      statusSincronizacao: 'pendente',
      dataCriacao: new Date().toISOString(),
    });

    // 2. Salva as fotos associadas (se houver)
    if (fotos.length > 0) {
      for (const foto of fotos) {
        await tx.objectStore('fotos').add({
          cadastroId,
          tipo: foto.tipo,
          arquivo: foto.arquivo,
          especie: foto.especie || null,
          coords: foto.coords || null,
          statusSincronizacao: 'pendente',
        });
      }
    }

    await tx.done;
    return cadastroId;
  } catch (error) {
    console.error('Erro ao salvar offline:', error);
    throw error;
  }
}

export async function listarCadastrosPendentes() {
  const db = await dbPromise;
  return db.getAllFromIndex('cadastros', 'porStatus', 'pendente');
}

export async function obterFotosDoCadastro(cadastroId) {
  const db = await dbPromise;
  return db.getAllFromIndex('fotos', 'porCadastro', cadastroId);
}

// ==============================================
// FUNÇÕES PARA SINCRONIZAÇÃO
// ==============================================

export async function sincronizarComBackend(token) {
  const db = await dbPromise;
  const cadastrosPendentes = await listarCadastrosPendentes();

  for (const cadastro of cadastrosPendentes) {
    const fotos = await obterFotosDoCadastro(cadastro.id);
    
    try {
      // Prepara FormData igual ao seu código atual
      const formData = new FormData();
      
      // Adiciona campos do cadastro
      for (const [key, value] of Object.entries(cadastro)) {
        if (key !== 'id' && value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      }

      // Adiciona fotos
      fotos.forEach((foto) => {
        formData.append('fotos', foto.arquivo);
        formData.append('tipos', foto.tipo);
        if (foto.especie) formData.append('especies', foto.especie);
        if (foto.coords) {
          formData.append('latitudes', foto.coords[0].toString());
          formData.append('longitudes', foto.coords[1].toString());
        }
      });

      // Envia para o backend (substitua pela sua URL)
      const response = await axios.post(
        'https://backendalesandro-production.up.railway.app/api/postes',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Se sucesso, marca como sincronizado
      if (response.data.success) {
        const tx = db.transaction(['cadastros', 'fotos'], 'readwrite');
        await tx.objectStore('cadastros').put({
          ...cadastro,
          statusSincronizacao: 'sincronizado',
          idBackend: response.data.id // Salva o ID do backend
        });

        // Marca fotos como sincronizadas
        for (const foto of fotos) {
          await tx.objectStore('fotos').put({
            ...foto,
            statusSincronizacao: 'sincronizado'
          });
        }

        await tx.done;
      }
    } catch (error) {
      console.error(`Erro ao sincronizar cadastro ${cadastro.id}:`, error);
      // Não interrompe a sincronização dos demais
    }
  }
}

// ==============================================
// FUNÇÕES AUXILIARES
// ==============================================

export async function limparDadosSincronizados() {
  const db = await dbPromise;
  const tx = db.transaction(['cadastros', 'fotos'], 'readwrite');

  // Remove cadastros já sincronizados
  const cadastrosSincronizados = await tx.objectStore('cadastros')
    .index('porStatus')
    .getAll('sincronizado');

  for (const cadastro of cadastrosSincronizados) {
    await tx.objectStore('cadastros').delete(cadastro.id);
  }

  // Remove fotos já sincronizadas
  const fotosSincronizadas = await tx.objectStore('fotos')
    .index('porStatus')
    .getAll('sincronizado');

  for (const foto of fotosSincronizadas) {
    await tx.objectStore('fotos').delete(foto.id);
  }

  await tx.done;
}
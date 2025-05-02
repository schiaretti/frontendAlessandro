import { useState, useRef, useEffect } from 'react';
import { FaRedo, FaTimes, FaRuler } from 'react-icons/fa';
import BotaoCamera from './botaoCamera';

export default function MedidorCamera({ onFinish, onCancel }) {
    const [foto, setFoto] = useState(null);
    const [passo, setPasso] = useState('instrucoes'); // 'instrucoes', 'tirarFoto', 'marcarReferencia', 'marcarCanteiro'
    const [pontos, setPontos] = useState({ referencia: [], canteiro: [] });
    const canvasRef = useRef(null);
    const imgRef = useRef(null);

    // Efeito para desenhar os pontos no canvas
    useEffect(() => {
        if (!foto || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Limpa o canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Desenha todos os pontos
        [...pontos.referencia, ...pontos.canteiro].forEach((ponto, index) => {
            ctx.fillStyle = index < pontos.referencia.length ? '#3B82F6' : '#10B981';
            ctx.beginPath();
            ctx.arc(ponto.x, ponto.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Conecta os pontos com linhas
        if (pontos.referencia.length === 2) {
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pontos.referencia[0].x, pontos.referencia[0].y);
            ctx.lineTo(pontos.referencia[1].x, pontos.referencia[1].y);
            ctx.stroke();
        }

        if (pontos.canteiro.length === 2) {
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pontos.canteiro[0].x, pontos.canteiro[0].y);
            ctx.lineTo(pontos.canteiro[1].x, pontos.canteiro[1].y);
            ctx.stroke();
        }
    }, [pontos, foto]);

    const handleFotoTirada = (fotoCapturada) => {
        const img = new Image();
        img.onload = () => {
            setFoto(URL.createObjectURL(fotoCapturada));
            setPasso('marcarReferencia');
            
            // Ajusta o canvas ao tamanho da imagem
            if (canvasRef.current) {
                canvasRef.current.width = img.width;
                canvasRef.current.height = img.height;
            }
        };
        img.src = URL.createObjectURL(fotoCapturada);
    };

    const calcularDistancia = (pontoA, pontoB) => {
        return Math.sqrt(Math.pow(pontoB.x - pontoA.x, 2) + Math.pow(pontoB.y - pontoA.y, 2));
    };

    const finalizarMedicao = () => {
        if (pontos.referencia.length === 2 && pontos.canteiro.length === 2) {
            const pxReferencia = calcularDistancia(pontos.referencia[0], pontos.referencia[1]);
            const pxCanteiro = calcularDistancia(pontos.canteiro[0], pontos.canteiro[1]);
            const medida = (pxCanteiro / pxReferencia).toFixed(2); // Assumindo que a referência é 1 metro
            onFinish(medida);
        }
    };

    const reiniciarProcesso = () => {
        setFoto(null);
        setPontos({ referencia: [], canteiro: [] });
        setPasso('instrucoes');
    };

    return (
        <div className="space-y-4">
            {passo === 'instrucoes' && (
                <div className="text-center space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-800 mb-2">Como medir:</h4>
                        <ol className="list-decimal text-left pl-5 space-y-1 text-sm text-blue-700">
                            <li>Coloque um objeto de referência (ex: trena de 1m) no canteiro</li>
                            <li>Posicione a câmera paralela ao solo</li>
                            <li>Enquadre toda a largura a ser medida</li>
                        </ol>
                    </div>

                    <button
                        onClick={() => setPasso('tirarFoto')}
                        className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                    >
                        Continuar
                    </button>

                    <button
                        onClick={onCancel}
                        className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center justify-center"
                    >
                        <FaTimes className="mr-2" /> Cancelar
                    </button>
                </div>
            )}

            {passo === 'tirarFoto' && (
                <div className="text-center space-y-4">
                    <BotaoCamera
                        onFotoCapturada={handleFotoTirada}
                        label="Tirar Foto para Medição"
                    />
                    <button
                        onClick={() => setPasso('instrucoes')}
                        className="w-full py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
                    >
                        Voltar
                    </button>
                </div>
            )}

            {(passo === 'marcarReferencia' || passo === 'marcarCanteiro') && (
                <div>
                    <div className="mb-3 p-2 bg-gray-100 rounded-md">
                        <p className="font-medium text-gray-800">
                            {passo === 'marcarReferencia'
                                ? "Marque os pontos da referência (ex: trena de 1m)"
                                : "Marque a largura do canteiro"}
                        </p>
                    </div>

                    <div className="relative border-2 border-gray-300 rounded-md overflow-hidden">
                        <img
                            ref={imgRef}
                            src={foto}
                            alt="Medição"
                            className="w-full"
                        />
                        <canvas
                            ref={canvasRef}
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const y = e.clientY - rect.top;

                                if (passo === 'marcarReferencia' && pontos.referencia.length < 2) {
                                    setPontos(prev => ({ ...prev, referencia: [...prev.referencia, { x, y }] }));
                                    if (pontos.referencia.length === 1) setPasso('marcarCanteiro');
                                } else if (passo === 'marcarCanteiro' && pontos.canteiro.length < 2) {
                                    setPontos(prev => ({ ...prev, canteiro: [...prev.canteiro, { x, y }] }));
                                }
                            }}
                            className="absolute inset-0 w-full h-full cursor-crosshair"
                        />
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={reiniciarProcesso}
                            className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md flex items-center justify-center"
                        >
                            <FaRedo className="mr-2" /> Refazer
                        </button>

                        {pontos.canteiro.length === 2 && (
                            <button
                                onClick={finalizarMedicao}
                                className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md flex items-center justify-center"
                            >
                                <FaRuler className="mr-2" /> Finalizar
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
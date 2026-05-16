from pydantic import BaseModel, Field

class PacoteConfiguracao(BaseModel):
    """
    Pacote 1: Configuração Inicial
    Enviado pelo Micromouse na largada para preparar a interface web.
    """
    id_corrida: int = Field(..., description="ID da corrida gerado pelo Micromouse")
    timestamp_ms: int = Field(..., description="Timestamp relativo ao início da corrida em milissegundos")
    dimensao: int = Field(..., description="Tamanho do labirinto (4, 8 ou 16)")
    tentativa: int = Field(..., description="Número da tentativa (1, 2 ou 3)")
    bateria: int = Field(..., description="Porcentagem de bateria inicial (0 a 100)")

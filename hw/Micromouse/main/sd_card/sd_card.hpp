#ifndef SD_CARD_HPP
#define SD_CARD_HPP

#define FILA_SD_SIZE 100
#define ARQUIVO_LOG "/sdcard/dados_mouse.csv"

struct RegistroRobo {
    unsigned long tempo;        // Tempo em milissegundos
    int infravermelho[4];       
    long encoderEsq;            
    long encoderDir;            
    float acel[3];              
    float giro[3];              
};

// Adiciona um registro à fila de gravação. Retorna true se enfileirou
bool adicionarRegistroSD(const RegistroRobo& registro);
bool estaCartaoSDOk(void);
void sdCardInit(void);

#endif // SD_CARD_HPP

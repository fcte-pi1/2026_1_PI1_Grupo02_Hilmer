#include <Arduino.h>
#include "FS.h"
#include "SD.h"
#include "SPI.h"

// Pinos
#define SD_SCK  -1  // Pino de Clock
#define SD_MISO -1  // Pino MISO
#define SD_MOSI -1  // Pino MOSI
#define SD_CS   -1  // Pino Chip Select

struct RegistroRobo {
    unsigned long tempo;        // Tempo em milissegundos
    int infravermelho[4];       
    long encoderEsq;            
    long encoderDir;            
    float acel[3];              
    float giro[3];              
};

QueueHandle_t filaSD;

void tarefaCartaoSD(void *parametros) {
    RegistroRobo dadosRecebidos;
    
    File arquivo = SD.open("/dados_mouse.csv", FILE_APPEND);

    for (;;) {
        // Fica esperando um dado chegar na fila
        if (xQueueReceive(filaSD, &dadosRecebidos, portMAX_DELAY)) {
            if (arquivo) {
                arquivo.printf("%lu,%d,%d,%d,%d,", 
                               dadosRecebidos.tempo, 
                               dadosRecebidos.infravermelho[0], dadosRecebidos.infravermelho[1], 
                               dadosRecebidos.infravermelho[2], dadosRecebidos.infravermelho[3]);

                arquivo.printf("%ld,%ld,", dadosRecebidos.encoderEsq, dadosRecebidos.encoderDir);

                arquivo.printf("%.2f,%.2f,%.2f,%.2f,%.2f,%.2f\n", 
                               dadosRecebidos.acel[0], dadosRecebidos.acel[1], dadosRecebidos.acel[2],
                               dadosRecebidos.giro[0], dadosRecebidos.giro[1], dadosRecebidos.giro[2]);
                
                // Força a gravação no cartão
                arquivo.flush();
            }
        }
    }
}

void setup() {
    Serial.begin(115200);

    // Inicializa os fios do barramento SPI
    SPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

    // Tenta ligar o módulo SD
    if (!SD.begin(SD_CS)) {
        Serial.println("Erro ao iniciar o Cartão SD.");
        return;
    }

    filaSD = xQueueCreate(100, sizeof(RegistroRobo));

    // Cria a tarefa paralela no Core 0
    xTaskCreatePinnedToCore(
        tarefaCartaoSD,    // Função que será executada
        "Tarefa_SD",       // Nome da tarefa
        8192,              // Memória reservada
        NULL,              // Parâmetros extras
        1,                 // Prioridade
        NULL,              // Identificador da tarefa
        0                  // Roda no Núcleo 0
    );
}
#include "sd_card.hpp"
#include <stdio.h>
#include "esp_vfs_fat.h"
#include "driver/sdspi_host.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"

// Pinos
#define SD_SCK  -1  // Pino de Clock
#define SD_MISO -1  // Pino MISO
#define SD_MOSI -1  // Pino MOSI
#define SD_CS   -1  // Pino Chip Select
#define SD_MOUNT_POINT "/sdcard"


static QueueHandle_t filaSD = NULL;

static bool sdCartaoOk = false;

void inicializarArquivoLog(void) {
    FILE *arquivo = fopen(ARQUIVO_LOG, "r");
    if (arquivo == NULL) {
        arquivo = fopen(ARQUIVO_LOG, "w");
        if (arquivo) {
            fprintf(arquivo, "tempo_ms,ir0,ir1,ir2,ir3,encoder_esq,encoder_dir,acel_x,acel_y,acel_z,giro_x,giro_y,giro_z\n");
            fclose(arquivo);
            printf("Arquivo de log criado com cabecalho\n");
        } else {
            printf("Erro ao criar arquivo de log\n");
        }
    } else {
        fclose(arquivo);
    }
}

void tarefaCartaoSD(void *parametros) {
    RegistroRobo dadosRecebidos;
    vTaskDelay(pdMS_TO_TICKS(500));  // Aguarda inicialização do SD
    
    for (;;) {
        if (xQueueReceive(filaSD, &dadosRecebidos, portMAX_DELAY)) {
            if (!sdCartaoOk) {
                printf("Erro: Cartao SD nao esta disponivel\n");
                continue;
            }
            
            FILE *arquivo = fopen(ARQUIVO_LOG, "a");
            if (!arquivo) {
                printf("Erro ao abrir arquivo de log\n");
                continue;
            }
            
            fprintf(arquivo, "%lu,%d,%d,%d,%d,", 
                           dadosRecebidos.tempo, 
                           dadosRecebidos.infravermelho[0], dadosRecebidos.infravermelho[1], 
                           dadosRecebidos.infravermelho[2], dadosRecebidos.infravermelho[3]);

            fprintf(arquivo, "%ld,%ld,", dadosRecebidos.encoderEsq, dadosRecebidos.encoderDir);

            fprintf(arquivo, "%.2f,%.2f,%.2f,%.2f,%.2f,%.2f\n", 
                           dadosRecebidos.acel[0], dadosRecebidos.acel[1], dadosRecebidos.acel[2],
                           dadosRecebidos.giro[0], dadosRecebidos.giro[1], dadosRecebidos.giro[2]);
            
            if (ferror(arquivo)) {
                printf("Erro ao escrever no arquivo\n");
            }
            fclose(arquivo);
        }
    }
}

bool adicionarRegistroSD(const RegistroRobo& registro) {
    if (filaSD == NULL || !sdCartaoOk) {
        return false;
    }
    return xQueueSend(filaSD, &registro, pdMS_TO_TICKS(10)) == pdTRUE;
}

bool estaCartaoSDOk(void) {
    return sdCartaoOk;
}

void sdCardInit(void) {
    esp_vfs_fat_sdmmc_mount_config_t mount_config = {
        .format_if_mount_failed = false,
        .max_files = 5,
        .allocation_unit_size = 0,
        .disk_status_check_enable = false,
        .use_one_fat = false
    };
    
    sdmmc_host_t host = SDSPI_HOST_DEFAULT();
    sdspi_device_config_t slot_config = SDSPI_DEVICE_CONFIG_DEFAULT();
    slot_config.gpio_cs = (gpio_num_t)SD_CS;
    slot_config.host_id = (spi_host_device_t)host.slot;
    
    esp_err_t ret = esp_vfs_fat_sdspi_mount(SD_MOUNT_POINT, &host, &slot_config, &mount_config, NULL);
    
    if (ret != ESP_OK) {
        printf("Erro ao iniciar o Cartao SD.\n");
        sdCartaoOk = false;
        return;
    }

    sdCartaoOk = true;
    printf("Cartao SD inicializado com sucesso\n");
    
    inicializarArquivoLog();

    filaSD = xQueueCreate(FILA_SD_SIZE, sizeof(RegistroRobo));
    if (filaSD == NULL) {
        printf("Erro ao criar fila do SD\n");
        sdCartaoOk = false;
        return;
    }

    BaseType_t resultado = xTaskCreatePinnedToCore(
        tarefaCartaoSD,
        "Tarefa_SD",
        8192,
        NULL,
        1,
        NULL,
        0
    );
    
    if (resultado != pdPASS) {
        printf("Erro ao criar tarefa do SD\n");
        sdCartaoOk = false;
    }
}
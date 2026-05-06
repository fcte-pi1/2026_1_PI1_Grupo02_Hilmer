#include "sd_card.hpp"
#include <stdio.h>
#include "esp_vfs_fat.h"
#include "driver/sdspi_host.h"
#include "driver/spi_master.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"

// Pinos
#include "../pins.hpp"
#define SD_SCK  SD_SCK_PIN  // Pino de Clock
#define SD_MISO SD_MISO_PIN // Pino MISO
#define SD_MOSI SD_MOSI_PIN // Pino MOSI
#define SD_CS   SD_CS_PIN   // Pino Chip Select
#define SD_MOUNT_POINT "/sdcard"


static QueueHandle_t g_data_queue = NULL;
static bool sdCartaoOk = false;

void inicializarArquivoLog(void) {
    FILE *arquivo = fopen(ARQUIVO_LOG, "r");
    if (arquivo == NULL) {
        arquivo = fopen(ARQUIVO_LOG, "w");
        if (arquivo) {
            fprintf(arquivo, "tempo_ms,tof0,tof1,tof2,tof3,bateria_v,bateria_i,bateria_potencia,bateria_soc,encoder_esq,encoder_dir,acel_x,acel_y,acel_z,giro_x,giro_y,giro_z,temp_imu\n");
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
    RobotData dadosRecebidos;
    vTaskDelay(pdMS_TO_TICKS(500));  // Aguarda inicialização do SD
    
    for (;;) {
        if (xQueueReceive(g_data_queue, &dadosRecebidos, portMAX_DELAY) == pdTRUE) {
            if (!sdCartaoOk) {
                printf("Erro: Cartao SD nao esta disponivel\n");
                continue;
            }
            
            FILE *arquivo = fopen(ARQUIVO_LOG, "a");
            if (!arquivo) {
                printf("Erro ao abrir arquivo de log\n");
                continue;
            }
            
            // Grava os dados da estrutura RobotData em formato CSV
            fprintf(arquivo, "%lu,%d,%d,%d,%d,", dadosRecebidos.timestamp_ms,
                           dadosRecebidos.distancia_tof[0], dadosRecebidos.distancia_tof[1],
                           dadosRecebidos.distancia_tof[2], dadosRecebidos.distancia_tof[3]);
            fprintf(arquivo, "%.2f,%.2f,%.2f,%.2f,",
                           dadosRecebidos.battery_v, dadosRecebidos.battery_i,
                           dadosRecebidos.battery_power, dadosRecebidos.battery_soc);
            fprintf(arquivo, "%d,%d,", dadosRecebidos.encoder_left, dadosRecebidos.encoder_right);
            fprintf(arquivo, "%.2f,%.2f,%.2f,%.2f,%.2f,%.2f,%.2f\n", 
                           dadosRecebidos.accel_x, dadosRecebidos.accel_y, dadosRecebidos.accel_z,
                           dadosRecebidos.gyro_x, dadosRecebidos.gyro_y, dadosRecebidos.gyro_z,
                           dadosRecebidos.imu_temp);
            
            if (ferror(arquivo)) {
                printf("Erro ao escrever no arquivo\n");
            }
            fclose(arquivo);
        }
    }
}



bool estaCartaoSDOk(void) {
    return sdCartaoOk;
}

void sdCardInit(QueueHandle_t queue) {
    if (queue == NULL) {
        printf("Erro: Fila invalida fornecida para sdCardInit\n");
        sdCartaoOk = false;
        return;
    }

    g_data_queue = queue;

    esp_vfs_fat_sdmmc_mount_config_t mount_config = {
        .format_if_mount_failed = false,
        .max_files = 5,
        .allocation_unit_size = 0,
        .disk_status_check_enable = false,
        .use_one_fat = false
    };
    
    sdmmc_host_t host = SDSPI_HOST_DEFAULT();
    spi_bus_config_t bus_cfg = {};
    bus_cfg.mosi_io_num = SD_MOSI;
    bus_cfg.miso_io_num = SD_MISO;
    bus_cfg.sclk_io_num = SD_SCK;
    bus_cfg.quadwp_io_num = GPIO_NUM_NC;
    bus_cfg.quadhd_io_num = GPIO_NUM_NC;
    bus_cfg.max_transfer_sz = 4000;

    esp_err_t ret = spi_bus_initialize((spi_host_device_t)host.slot, &bus_cfg, SDSPI_DEFAULT_DMA);
    if (ret != ESP_OK) {
        printf("Erro ao inicializar barramento SPI do SD.\n");
        sdCartaoOk = false;
        return;
    }

    sdspi_device_config_t slot_config = SDSPI_DEVICE_CONFIG_DEFAULT();
    slot_config.gpio_cs = (gpio_num_t)SD_CS;
    slot_config.host_id = (spi_host_device_t)host.slot;
    
    ret = esp_vfs_fat_sdspi_mount(SD_MOUNT_POINT, &host, &slot_config, &mount_config, NULL);
    
    if (ret != ESP_OK) {
        printf("Erro ao iniciar o Cartao SD.\n");
        sdCartaoOk = false;
        return;
    }

    sdCartaoOk = true;
    printf("Cartao SD inicializado com sucesso\n");
    
    inicializarArquivoLog();

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
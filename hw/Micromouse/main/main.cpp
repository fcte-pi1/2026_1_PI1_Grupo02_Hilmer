#include <stdio.h>
#include "ina226.hpp"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/ledc.h"
#include "motor.hpp"

extern "C" void app_main(void) {
    printf("Projeto base em C++ pronto!\n");

    /*
    // Configura o Timer do PWM uma unica vez para todos os motores
    ledc_timer_config_t ledc_timer = {};
    ledc_timer.speed_mode = LEDC_LOW_SPEED_MODE;
    ledc_timer.timer_num = LEDC_TIMER_0;
    ledc_timer.duty_resolution = LEDC_TIMER_10_BIT;
    ledc_timer.freq_hz = 20000;
    ledc_timer.clk_cfg = LEDC_AUTO_CLK;
    ledc_timer_config(&ledc_timer);

    // Motor Esquerdo: PWM=18, IN1=19, IN2=21, STBY=22, ENCA=32, ENCB=33, Canal PWM 0
    Motor motorEsquerdo(18, 19, 21, 22, 32, 33, LEDC_CHANNEL_0);
    // Motor Direito: PWM=23, IN1=27, IN2=14, STBY=22, ENCA=25, ENCB=26, Canal PWM 1
    Motor motorDireito(23, 27, 14, 22, 25, 26, LEDC_CHANNEL_1);

    motorEsquerdo.begin();
    motorDireito.begin();

    // Acelera os dois motores para a frente (~50% da velocidade)
    motorEsquerdo.setSpeed(500);
    motorDireito.setSpeed(500);

    while (true) {
        int pulsosEsq = motorEsquerdo.getEncoderCount();
        int pulsosDir = motorDireito.getEncoderCount();

        printf("Pulsos -> Esq: %d | Dir: %d\n", pulsosEsq, pulsosDir);
        vTaskDelay(pdMS_TO_TICKS(100));
    }
    */
}
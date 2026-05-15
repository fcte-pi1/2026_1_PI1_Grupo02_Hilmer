/**
 * motor_hbridge_test.cpp
 *
 * Teste do Motor A (TB6612FNG) com Encoders nos pinos D34 e D39(VN).
 */

#include <cstdio>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/ledc.h"
#include "driver/pulse_cnt.h"
#include "esp_log.h"
#include "pins.hpp"

// Configuração apontando para o Motor Esquerdo
#define PIN_STBY    MOTOR_STBY_PIN
#define PIN_PWMA    MOTOR_LEFT_PWM_PIN
#define PIN_AI1     MOTOR_LEFT_IN1_PIN
#define PIN_AI2     MOTOR_LEFT_IN2_PIN
#define PIN_ENC_A   MOTOR_LEFT_ENC_A_PIN // D34
#define PIN_ENC_B   MOTOR_LEFT_ENC_B_PIN // D39

#define PWM_MAX     1023
static const char *TAG = "MotorTest";

static pcnt_unit_handle_t s_pcnt_unit = NULL;
static volatile int32_t   s_enc_total = 0;
static volatile int16_t   s_enc_last  = 0;

static int32_t encoder_read(void) {
    int raw = 0;
    pcnt_unit_get_count(s_pcnt_unit, &raw);
    int16_t current    = (int16_t)raw;
    int16_t delta      = current - s_enc_last;
    s_enc_last         = current;
    s_enc_total       += delta;
    return s_enc_total;
}

static void encoder_reset(void) {
    pcnt_unit_clear_count(s_pcnt_unit);
    s_enc_total = 0;
    s_enc_last  = 0;
}

static void pwm_set(uint32_t duty) {
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, duty);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
}

static void motor_frente(uint32_t duty) {
    gpio_set_level(PIN_AI1, 1);
    gpio_set_level(PIN_AI2, 0);
    pwm_set(duty);
}

static void motor_re(uint32_t duty) {
    gpio_set_level(PIN_AI1, 0);
    gpio_set_level(PIN_AI2, 1);
    pwm_set(duty);
}

static void motor_para(void) {
    pwm_set(0);
    gpio_set_level(PIN_AI1, 0);
    gpio_set_level(PIN_AI2, 0);
}

static void encoder_task(void *arg) {
    TickType_t last_wake = xTaskGetTickCount();
    int32_t prev = 0;
    while (true) {
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(100));
        int32_t total  = encoder_read();
        int32_t delta  = total - prev;
        prev           = total;
        ESP_LOGI(TAG, "Encoder | Total: %ld | Vel: %ld pps", (long)total, (long)delta * 10);
    }
}

static bool hw_init(void) {
    // Pinos de Direção e Standby
    gpio_config_t cfg = {};
    cfg.mode = GPIO_MODE_OUTPUT;
    cfg.pin_bit_mask = (1ULL << PIN_STBY) | (1ULL << PIN_AI1) | (1ULL << PIN_AI2);
    cfg.pull_down_en = GPIO_PULLDOWN_DISABLE;
    cfg.pull_up_en   = GPIO_PULLUP_DISABLE;
    gpio_config(&cfg);

    gpio_set_level(PIN_STBY, 0);
    gpio_set_level(PIN_AI1, 0);
    gpio_set_level(PIN_AI2, 0);

    // PWM via LEDC
    ledc_timer_config_t t = {};
    t.speed_mode = LEDC_LOW_SPEED_MODE;
    t.timer_num = LEDC_TIMER_0;
    t.duty_resolution = LEDC_TIMER_10_BIT;
    t.freq_hz = 20000;
    t.clk_cfg = LEDC_AUTO_CLK;
    ledc_timer_config(&t);

    ledc_channel_config_t ch = {};
    ch.speed_mode = LEDC_LOW_SPEED_MODE;
    ch.channel = LEDC_CHANNEL_0;
    ch.timer_sel = LEDC_TIMER_0;
    ch.gpio_num = PIN_PWMA;
    ch.duty = 0;
    ledc_channel_config(&ch);

    // Configuração do PCNT (Encoder)
    gpio_config_t enc_cfg = {};
    enc_cfg.pin_bit_mask = (1ULL << PIN_ENC_A) | (1ULL << PIN_ENC_B);
    enc_cfg.mode = GPIO_MODE_INPUT;
    // Forçado a desativar pull-up pois pinos 34-39 não suportam via hardware
    enc_cfg.pull_up_en = GPIO_PULLUP_DISABLE; 
    gpio_config(&enc_cfg);

    pcnt_unit_config_t unit_cfg = {};
    unit_cfg.high_limit = 30000;
    unit_cfg.low_limit = -30000;
    pcnt_new_unit(&unit_cfg, &s_pcnt_unit);

    pcnt_glitch_filter_config_t filter_cfg = { .max_glitch_ns = 1000 };
    pcnt_unit_set_glitch_filter(s_pcnt_unit, &filter_cfg);

    pcnt_chan_config_t chan_a_cfg = {}; // Inicializa tudo com zero (incluindo as flags ocultas)
    chan_a_cfg.edge_gpio_num = PIN_ENC_A;
    chan_a_cfg.level_gpio_num = PIN_ENC_B;
    pcnt_channel_handle_t chan_a = NULL;
    pcnt_new_channel(s_pcnt_unit, &chan_a_cfg, &chan_a);
    pcnt_channel_set_edge_action(chan_a, PCNT_CHANNEL_EDGE_ACTION_DECREASE, PCNT_CHANNEL_EDGE_ACTION_INCREASE);
    pcnt_channel_set_level_action(chan_a, PCNT_CHANNEL_LEVEL_ACTION_KEEP, PCNT_CHANNEL_LEVEL_ACTION_INVERSE);

    pcnt_chan_config_t chan_b_cfg = {}; // Inicializa tudo com zero (incluindo as flags ocultas)
    chan_b_cfg.edge_gpio_num = PIN_ENC_B;
    chan_b_cfg.level_gpio_num = PIN_ENC_A;
    pcnt_channel_handle_t chan_b = NULL;
    pcnt_new_channel(s_pcnt_unit, &chan_b_cfg, &chan_b);
    pcnt_channel_set_edge_action(chan_b, PCNT_CHANNEL_EDGE_ACTION_INCREASE, PCNT_CHANNEL_EDGE_ACTION_DECREASE);
    pcnt_channel_set_level_action(chan_b, PCNT_CHANNEL_LEVEL_ACTION_KEEP, PCNT_CHANNEL_LEVEL_ACTION_INVERSE);

    pcnt_unit_enable(s_pcnt_unit);
    pcnt_unit_clear_count(s_pcnt_unit);
    pcnt_unit_start(s_pcnt_unit);

    gpio_set_level(PIN_STBY, 1); // Acorda a Ponte H
    
    return true;
}

extern "C" void app_main(void) {
    vTaskDelay(pdMS_TO_TICKS(500));
    ESP_LOGI(TAG, "=== Micromouse | Motor A & Encoder C1 (D34/39) ===");

    if (!hw_init()) {
        ESP_LOGE(TAG, "Erro fatal: falha no hardware.");
        return;
    }

    xTaskCreatePinnedToCore(encoder_task, "enc_task", 4096, NULL, 5, NULL, 1);

    ESP_LOGI(TAG, ">>> Fase 0: Gire o pneu com a mão. Observe os pulsos (5 segs)...");
    encoder_reset();
    vTaskDelay(pdMS_TO_TICKS(5000));
    ESP_LOGI(TAG, ">>> Pulsos lidos manualmente: %ld", (long)encoder_read());

    ESP_LOGI(TAG, ">>> Fase 1: Motor Frente (50%%)");
    encoder_reset();
    motor_frente(PWM_MAX / 2);
    vTaskDelay(pdMS_TO_TICKS(3000));
    motor_para();
    ESP_LOGI(TAG, "    Pulsos gerados pelo motor: %ld", (long)encoder_read());
    vTaskDelay(pdMS_TO_TICKS(1000));

    ESP_LOGI(TAG, ">>> Fase 2: Motor Ré (50%%)");
    encoder_reset();
    motor_re(PWM_MAX / 2);
    vTaskDelay(pdMS_TO_TICKS(3000));
    motor_para();
    ESP_LOGI(TAG, "    Pulsos gerados pelo motor: %ld", (long)encoder_read());

    ESP_LOGI(TAG, "=== Fim do Teste ===");
    while (true) { vTaskDelay(pdMS_TO_TICKS(1000)); }
}
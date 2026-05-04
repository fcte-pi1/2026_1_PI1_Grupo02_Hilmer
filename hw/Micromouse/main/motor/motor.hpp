#pragma once

#include "driver/gpio.h"
#include "driver/ledc.h"
#include "driver/pulse_cnt.h"

// Classe do Motor (ponte H + encoder)
class Motor {
private:
    gpio_num_t pwm_pin;
    gpio_num_t ain1_pin;
    gpio_num_t ain2_pin;
    gpio_num_t stby_pin;
    gpio_num_t enc_a_pin;
    gpio_num_t enc_b_pin;

    ledc_channel_t pwm_channel;
    pcnt_unit_handle_t pcnt_unit;

public:
    Motor(int pwm, int ain1, int ain2, int stby, int enc_a, int enc_b, ledc_channel_t channel);

    void begin();
    void setSpeed(int speed);
    int getEncoderCount();
};

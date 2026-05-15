#include "motor/motor.hpp"

Motor::Motor(int pwm, int ain1, int ain2, int stby, int enc_a, int enc_b, ledc_channel_t channel)
    : pwm_pin((gpio_num_t)pwm),
      ain1_pin((gpio_num_t)ain1),
      ain2_pin((gpio_num_t)ain2),
      stby_pin((gpio_num_t)stby),
      enc_a_pin((gpio_num_t)enc_a),
      enc_b_pin((gpio_num_t)enc_b),
      pwm_channel(channel),
      pcnt_unit(NULL) {}

void Motor::begin() {
    // 1) Pinos digitais (direcao e standby)
    gpio_config_t io_conf = {};
    io_conf.pin_bit_mask = (1ULL << ain1_pin) | (1ULL << ain2_pin) | (1ULL << stby_pin);
    io_conf.mode = GPIO_MODE_OUTPUT;
    io_conf.pull_up_en = GPIO_PULLUP_DISABLE;
    io_conf.pull_down_en = GPIO_PULLDOWN_DISABLE;
    io_conf.intr_type = GPIO_INTR_DISABLE;
    gpio_config(&io_conf);

    // Sai do modo de economia do driver
    gpio_set_level(stby_pin, 1);

    // 2) Canal PWM
    ledc_channel_config_t ledc_channel_cfg = {};
    ledc_channel_cfg.speed_mode = LEDC_LOW_SPEED_MODE;
    ledc_channel_cfg.channel = pwm_channel;
    ledc_channel_cfg.timer_sel = LEDC_TIMER_0; // Compartilha o mesmo timer
    ledc_channel_cfg.intr_type = LEDC_INTR_DISABLE;
    ledc_channel_cfg.gpio_num = pwm_pin;
    ledc_channel_cfg.duty = 0;
    ledc_channel_cfg.hpoint = 0;
    ledc_channel_config(&ledc_channel_cfg);

    // 3) Hardware do encoder (PCNT)
    pcnt_unit_config_t unit_config = {};
    unit_config.high_limit = 30000;
    unit_config.low_limit = -30000;
    pcnt_new_unit(&unit_config, &pcnt_unit);

    pcnt_glitch_filter_config_t filter_config = {};
    filter_config.max_glitch_ns = 1000;
    pcnt_unit_set_glitch_filter(pcnt_unit, &filter_config);

    pcnt_chan_config_t chan_a_config = {};
    chan_a_config.edge_gpio_num = enc_a_pin;
    chan_a_config.level_gpio_num = enc_b_pin;
    pcnt_channel_handle_t pcnt_chan_a = NULL;
    pcnt_new_channel(pcnt_unit, &chan_a_config, &pcnt_chan_a);

    pcnt_chan_config_t chan_b_config = {};
    chan_b_config.edge_gpio_num = enc_b_pin;
    chan_b_config.level_gpio_num = enc_a_pin;
    pcnt_channel_handle_t pcnt_chan_b = NULL;
    pcnt_new_channel(pcnt_unit, &chan_b_config, &pcnt_chan_b);

    pcnt_channel_set_edge_action(
        pcnt_chan_a,
        PCNT_CHANNEL_EDGE_ACTION_DECREASE,
        PCNT_CHANNEL_EDGE_ACTION_INCREASE
    );
    pcnt_channel_set_level_action(
        pcnt_chan_a,
        PCNT_CHANNEL_LEVEL_ACTION_KEEP,
        PCNT_CHANNEL_LEVEL_ACTION_INVERSE
    );

    pcnt_channel_set_edge_action(
        pcnt_chan_b,
        PCNT_CHANNEL_EDGE_ACTION_INCREASE,
        PCNT_CHANNEL_EDGE_ACTION_DECREASE
    );
    pcnt_channel_set_level_action(
        pcnt_chan_b,
        PCNT_CHANNEL_LEVEL_ACTION_KEEP,
        PCNT_CHANNEL_LEVEL_ACTION_INVERSE
    );

    pcnt_unit_enable(pcnt_unit);
    pcnt_unit_clear_count(pcnt_unit);
    pcnt_unit_start(pcnt_unit);
}

void Motor::setSpeed(int speed) {
    if (speed > 0) {
        gpio_set_level(ain1_pin, 1);
        gpio_set_level(ain2_pin, 0);
    } else if (speed < 0) {
        gpio_set_level(ain1_pin, 0);
        gpio_set_level(ain2_pin, 1);
        speed = -speed; // Converte para positivo
    } else {
        // Freio (brake)
        gpio_set_level(ain1_pin, 1);
        gpio_set_level(ain2_pin, 1);
    }

    if (speed > 1023) speed = 1023;

    ledc_set_duty(LEDC_LOW_SPEED_MODE, pwm_channel, speed);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, pwm_channel);
}

int Motor::getEncoderCount() {
    int count = 0;
    pcnt_unit_get_count(pcnt_unit, &count);
    return count;
}
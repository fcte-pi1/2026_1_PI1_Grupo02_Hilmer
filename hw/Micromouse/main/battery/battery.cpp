#include "battery/battery.hpp"
#include "esp_log.h"
#include "esp_timer.h"
#include <system_error>
#include <cmath>
#include <cstring>

#include "i2c_manager.hpp"
#define I2C_TIMEOUT_MS      50


#define BATTERY_CAPACITY_AH     2.0f
#define BATTERY_CAPACITY_AS     (BATTERY_CAPACITY_AH * 3600.0f)
#define BATTERY_VOLTAGE_MAX     8.4f
#define BATTERY_VOLTAGE_MIN     6.6f
#define BATTERY_REST_CURRENT_A  0.05f
#define VOLTAGE_CORRECTION_ALPHA 0.01f


static bool i2c_write_cb(uint8_t /*dev_addr*/, const uint8_t *data, size_t len) {
    return i2c_manager_write(I2C_ADDR_INA226_DEFAULT, data, len, I2C_TIMEOUT_MS);
}

static bool i2c_read_register_cb(uint8_t /*dev_addr*/, uint8_t reg_addr,
                                  uint8_t *data, size_t len) {
    return i2c_manager_read_register(I2C_ADDR_INA226_DEFAULT, reg_addr,
                                     data, len, I2C_TIMEOUT_MS);
}


Battery::Battery()
        : ina_sensor(nullptr),
        soc_(50.0f),
        last_update_us_(0),
        capacity_as_(BATTERY_CAPACITY_AS)
{
    memset(filters_, 0, sizeof(filters_));
}

bool Battery::init() {
    // Inicializa o barramento I2C compartilhado via manager.
    if (!i2c_manager_init()) {
        ESP_LOGE("Battery", "Failed to init shared I2C bus");
        return false;
    }

    if (!i2c_manager_register_device(I2C_ADDR_INA226_DEFAULT)) {
        ESP_LOGE("Battery", "Failed to register INA226 on I2C bus");
        return false;
    }

    // Configura o INA226 com callbacks de I2C e parametros do shunt.
    espp::Ina226::Config config{};
    config.device_address        = I2C_ADDR_INA226_DEFAULT;
    config.write                 = i2c_write_cb;
    config.read_register         = i2c_read_register_cb;
    config.current_lsb           = 0.0001f;
    config.shunt_resistance_ohms = 0.0333333f; // Físico: 3 resistores de 0.1 ohm em paralelo
    ina_sensor = new espp::Ina226(config);

    const float v0 = getVoltage();
    const float i0 = getCurrent();
    const float p0 = getPower();
    const float seeds[FILTER_COUNT] = {i0, v0, p0};

    for (int f = 0; f < FILTER_COUNT; ++f) {
        for (int i = 0; i < FILTER_SIZE; ++i)
            filters_[f].buf[i] = seeds[f];
        filters_[f].count = FILTER_SIZE;
        filters_[f].lpf   = seeds[f];
    }

    soc_            = voltageToSOC(v0);
    last_update_us_ = esp_timer_get_time();
    return true;
}

void Battery::update() {
    const int64_t now_us = esp_timer_get_time();
    const float delta_s  = static_cast<float>(now_us - last_update_us_) / 1e6f;
    last_update_us_ = now_us;

    const float current = getCurrent();
    const float voltage = getVoltage();

    soc_ += (current * delta_s / capacity_as_) * 100.0f;

    // Filtro complementar: corrige SOC pela tensao quando a bateria esta em repouso.
    if (fabsf(current) < BATTERY_REST_CURRENT_A)
        soc_ += VOLTAGE_CORRECTION_ALPHA * (voltageToSOC(voltage) - soc_);

    if (soc_ > 100.0f) soc_ = 100.0f;
    if (soc_ <   0.0f) soc_ =   0.0f;
}

float Battery::getVoltage() {
    if (!ina_sensor) return 0.0f;
    std::error_code ec;
    return ina_sensor->bus_voltage_volts(ec);
}

float Battery::getCurrent() {
    if (!ina_sensor) return 0.0f;
    std::error_code ec;
    return ina_sensor->current_amps(ec);
}

float Battery::getPower() {
    if (!ina_sensor) return 0.0f;
    std::error_code ec;
    return ina_sensor->power_watts(ec);
}

float Battery::getSOC() {
    return soc_;
}

float Battery::applyFilter(Filter f, float raw) {
    FilterState &s = filters_[f];

    s.buf[s.idx] = raw;
    s.idx = (s.idx + 1) % FILTER_SIZE;
    if (s.count < FILTER_SIZE) ++s.count;

    float sum = 0.0f;
    for (uint8_t i = 0; i < s.count; ++i) sum += s.buf[i];

    s.lpf = FILTER_ALPHA * (sum / s.count) + (1.0f - FILTER_ALPHA) * s.lpf;
    return s.lpf;
}

float Battery::getCurrentFiltered() { return applyFilter(CURRENT, getCurrent()); }
float Battery::getVoltageFiltered() { return applyFilter(VOLTAGE, getVoltage()); }
float Battery::getPowerFiltered()   { return applyFilter(POWER,   getPower());   }

float Battery::voltageToSOC(float voltage) {
    if (voltage <= BATTERY_VOLTAGE_MIN) return 0.0f;
    if (voltage >= BATTERY_VOLTAGE_MAX) return 100.0f;
    return ((voltage - BATTERY_VOLTAGE_MIN) /
            (BATTERY_VOLTAGE_MAX - BATTERY_VOLTAGE_MIN)) * 100.0f;
}
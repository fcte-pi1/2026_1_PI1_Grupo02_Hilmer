#include "battery/battery.hpp"
#include "driver/i2c_master.h"
#include "esp_timer.h"
#include <system_error>
#include <cmath>
#include <cstring>


#define I2C_MASTER_PORT     I2C_NUM_0
#define I2C_SDA_PIN         GPIO_NUM_1
#define I2C_SCL_PIN         GPIO_NUM_2
#define I2C_SPEED_HZ        100000
#define I2C_TIMEOUT_MS      50


#define BATTERY_CAPACITY_AH     2.0f
#define BATTERY_CAPACITY_AS     (BATTERY_CAPACITY_AH * 3600.0f)
#define BATTERY_VOLTAGE_MAX     8.4f
#define BATTERY_VOLTAGE_MIN     6.6f
#define BATTERY_REST_CURRENT_A  0.05f
#define VOLTAGE_CORRECTION_ALPHA 0.01f


static i2c_master_bus_handle_t s_bus_handle = nullptr;
static i2c_master_dev_handle_t s_dev_handle = nullptr;


static bool i2c_write_cb(uint8_t /*dev_addr*/, const uint8_t *data, size_t len) {
    if (!s_dev_handle) return false;
    return i2c_master_transmit(s_dev_handle, data, len, I2C_TIMEOUT_MS) == ESP_OK;
}

static bool i2c_read_register_cb(uint8_t /*dev_addr*/, uint8_t reg_addr,
                                  uint8_t *data, size_t len) {
    if (!s_dev_handle) return false;
    return i2c_master_transmit_receive(
        s_dev_handle, &reg_addr, 1, data, len, I2C_TIMEOUT_MS
    ) == ESP_OK;
}


Battery::Battery()
        : ina_sensor(nullptr),
        soc_(50.0f),
        last_update_us_(0),
        capacity_as_(BATTERY_CAPACITY_AS)
{
    memset(filters_, 0, sizeof(filters_));
}

void Battery::init() {
    // Configuração do barramento I2C
    i2c_master_bus_config_t bus_cfg = {};
    bus_cfg.i2c_port                     = I2C_MASTER_PORT;
    bus_cfg.sda_io_num                   = I2C_SDA_PIN;
    bus_cfg.scl_io_num                   = I2C_SCL_PIN;
    bus_cfg.clk_source                   = I2C_CLK_SRC_DEFAULT;
    bus_cfg.glitch_ignore_cnt            = 7;   // Filtra ruídos rápidos na linha I2C
    bus_cfg.flags.enable_internal_pullup = true;
    ESP_ERROR_CHECK(i2c_new_master_bus(&bus_cfg, &s_bus_handle));

    i2c_device_config_t dev_cfg = {};
    dev_cfg.dev_addr_length = I2C_ADDR_BIT_LEN_7;
    dev_cfg.device_address  = espp::Ina226::DEFAULT_ADDRESS;
    dev_cfg.scl_speed_hz    = I2C_SPEED_HZ;
    ESP_ERROR_CHECK(i2c_master_bus_add_device(s_bus_handle, &dev_cfg, &s_dev_handle));

    // Configuração do sensor INA226
    espp::Ina226::Config config{};
    config.device_address        = espp::Ina226::DEFAULT_ADDRESS;
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
}

void Battery::update() {
    const int64_t now_us = esp_timer_get_time();
    const float delta_s  = static_cast<float>(now_us - last_update_us_) / 1e6f;
    last_update_us_ = now_us;

    const float current = getCurrent();
    const float voltage = getVoltage();

    soc_ += (current * delta_s / capacity_as_) * 100.0f;

    // Filtro Complementar: usa a tensão para corrigir o SOC apenas se a bateria
    // estiver em repouso, contornando falsas quedas de tensão.
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
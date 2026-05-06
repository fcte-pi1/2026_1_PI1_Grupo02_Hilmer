#include "vl53l0x/IV_Vl53l0x.hpp"
#include "pins.hpp"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "i2c_manager.hpp"

IV_Vl53l0x::IV_Vl53l0x()
    : logger_({.tag = "IV_Vl53l0x", .level = espp::Logger::Verbosity::INFO}) {}

bool IV_Vl53l0x::init() {
    if (initialized_) {
        return true;
    }

    if (!i2c_manager_init()) {
        logger_.error("Failed to init shared I2C bus");
        return false;
    }

    auto bus = i2c_manager_get_bus();
    if (!bus) {
        logger_.error("Shared I2C bus is null");
        return false;
    }

    i2c_device_config_t dev_cfg = {};
    dev_cfg.dev_addr_length = I2C_ADDR_BIT_LEN_7;
    dev_cfg.device_address = kAddress;
    dev_cfg.scl_speed_hz = kI2cClockHz;
    if (i2c_master_bus_add_device(bus, &dev_cfg, &dev_handle_) != ESP_OK) {
        logger_.error("Failed to add VL53L0X device to I2C bus");
        return false;
    }

    auto write_cb = [this](uint8_t /*dev_addr*/, const uint8_t *data, size_t len) -> bool {
        return dev_handle_ && i2c_master_transmit(dev_handle_, data, len, 50) == ESP_OK;
    };

    auto read_cb = [this](uint8_t /*dev_addr*/, uint8_t *data, size_t len) -> bool {
        return dev_handle_ && i2c_master_receive(dev_handle_, data, len, 50) == ESP_OK;
    };

    sensor_ = std::make_unique<espp::Vl53l>(espp::Vl53l::Config{
        .device_address = kAddress,
        .write = write_cb,
        .read = read_cb,
        .log_level = espp::Logger::Verbosity::WARN,
    });

    initialized_ = setupSensor();
    return initialized_;
}

bool IV_Vl53l0x::setupSensor() {
    if (!sensor_) {
        return false;
    }

    std::error_code ec;
    if (!sensor_->set_timing_budget_ms(10, ec)) {
        logger_.error("Failed to set timing budget: {}", ec.message());
        return false;
    }

    if (!sensor_->set_inter_measurement_period_ms(0, ec)) {
        logger_.error("Failed to set inter-measurement period: {}", ec.message());
        return false;
    }

    if (!sensor_->start_ranging(ec)) {
        logger_.error("Failed to start ranging: {}", ec.message());
        return false;
    }

    return true;
}

bool IV_Vl53l0x::startRanging() {
    if (!sensor_) {
        return false;
    }

    std::error_code ec;
    if (!sensor_->start_ranging(ec)) {
        logger_.error("Failed to start ranging: {}", ec.message());
        return false;
    }

    return true;
}

bool IV_Vl53l0x::stopRanging() {
    if (!sensor_) {
        return false;
    }

    std::error_code ec;
    if (!sensor_->stop_ranging(ec)) {
        logger_.error("Failed to stop ranging: {}", ec.message());
        return false;
    }

    return true;
}

bool IV_Vl53l0x::isDataReady() {
    if (!sensor_) {
        return false;
    }

    std::error_code ec;
    bool ready = sensor_->is_data_ready(ec);
    if (ec) {
        logger_.error("Failed to check data ready: {}", ec.message());
    }
    return ready;
}

bool IV_Vl53l0x::clearInterrupt() {
    if (!sensor_) {
        return false;
    }

    std::error_code ec;
    if (!sensor_->clear_interrupt(ec)) {
        logger_.error("Failed to clear interrupt: {}", ec.message());
        return false;
    }

    return true;
}

float IV_Vl53l0x::readDistanceMm() {
    if (!sensor_) {
        return -1.0f;
    }

    std::error_code ec;
    while (!sensor_->is_data_ready(ec)) {
        if (ec) {
            logger_.error("Failed while waiting for data: {}", ec.message());
            return -1.0f;
        }
        vTaskDelay(pdMS_TO_TICKS(1));
    }

    if (!sensor_->clear_interrupt(ec)) {
        logger_.error("Failed to clear interrupt: {}", ec.message());
        return -1.0f;
    }

    float meters = sensor_->get_distance_meters(ec);
    if (ec) {
        logger_.error("Failed to read distance: {}", ec.message());
        return -1.0f;
    }

    return meters * 1000.0f;
}

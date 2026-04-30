#pragma once
#include "ina226.hpp"

#define FILTER_SIZE  30
#define FILTER_ALPHA 0.1f

class Battery {
public:
    Battery();
    void init();
    void update();
    float getVoltage();
    float getCurrent();
    float getPower();
    float getSOC();
    float getCurrentFiltered();
    float getVoltageFiltered();
    float getPowerFiltered();

private:
    struct FilterState {
        float   buf[FILTER_SIZE];
        uint8_t idx;
        uint8_t count;
        float   lpf;
    };

    enum Filter { CURRENT = 0, VOLTAGE, POWER, FILTER_COUNT };

    espp::Ina226* ina_sensor;
    float   soc_;
    int64_t last_update_us_;
    float   capacity_as_;

    FilterState filters_[FILTER_COUNT];

    float applyFilter(Filter f, float raw);
    float voltageToSOC(float voltage);
};
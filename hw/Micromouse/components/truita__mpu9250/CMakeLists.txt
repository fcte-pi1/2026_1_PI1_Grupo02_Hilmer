file(GLOB SOURCES src/*.c)

idf_component_register(SRCS ${SOURCES}
                    INCLUDE_DIRS "include"
                    REQUIRES esp_driver_i2c)

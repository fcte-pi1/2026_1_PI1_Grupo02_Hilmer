#pragma once

#include "driver/gpio.h"

// Barramento I2C compartilhado
#define I2C_SDA_PIN GPIO_NUM_21
#define I2C_SCL_PIN GPIO_NUM_22

// Controle da Ponte H
#define MOTOR_STBY_PIN        GPIO_NUM_2 

<<<<<<< Updated upstream
#define MOTOR_RIGHT_PWM_PIN  GPIO_NUM_23
#define MOTOR_RIGHT_IN1_PIN  GPIO_NUM_27
#define MOTOR_RIGHT_IN2_PIN  GPIO_NUM_16
#define MOTOR_RIGHT_ENC_A_PIN GPIO_NUM_25
#define MOTOR_RIGHT_ENC_B_PIN GPIO_NUM_17
=======
// Motor Esquerdo (Lado A)
#define MOTOR_LEFT_PWM_PIN    GPIO_NUM_32
#define MOTOR_LEFT_IN1_PIN    GPIO_NUM_33
#define MOTOR_LEFT_IN2_PIN    GPIO_NUM_16
// Conector C1
#define MOTOR_LEFT_ENC_A_PIN  GPIO_NUM_34 // C1-01
#define MOTOR_LEFT_ENC_B_PIN  GPIO_NUM_39 // C1-02 (Pino VN)

// Motor Direito (Lado B)
#define MOTOR_RIGHT_PWM_PIN   GPIO_NUM_4
#define MOTOR_RIGHT_IN1_PIN   GPIO_NUM_17
#define MOTOR_RIGHT_IN2_PIN   GPIO_NUM_13
// Conector C2
#define MOTOR_RIGHT_ENC_A_PIN GPIO_NUM_35 // C2-01
#define MOTOR_RIGHT_ENC_B_PIN GPIO_NUM_36 // C2-02 (Pino VP)

// SD Card (SPI)
#define SD_CS_PIN             GPIO_NUM_5
#define SD_SCK_PIN            GPIO_NUM_18
#define SD_MOSI_PIN           GPIO_NUM_23
#define SD_MISO_PIN           GPIO_NUM_19
>>>>>>> Stashed changes

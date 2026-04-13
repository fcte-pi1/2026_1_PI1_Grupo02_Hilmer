# _Firmware_
Esta pasta deverá armazenar arquivos referentes a:

- Código-fonte para microcontroladores e SOCs: [Arduino](https://www.arduino.cc/), [ESP32](https://www.espressif.com/), [Raspberry Pi](https://www.raspberrypi.com/), dentre outros.
- Projetos de organização destes códigos, caso utilize IDEs: [Arduino IDE](https://www.arduino.cc/en/software/), [Visual Studio](https://visualstudio.microsoft.com/pt-br/downloads/) etc.
- Arquivos de configuração: ```CMakeLists.txt``` se for usar [CMake](https://cmake.org/download/), ```Makefile``` se for usar [make](https://www.cs.colby.edu/maxwell/courses/tutorials/maketutor/) etc.

Evite incluir:
- Artefatos de compilação: os arquivos de saída compilados (binários, arquivos objeto, .hex, .elf) devem ser gerados pelo processo de compilação e não incluídos no repositório.
- Arquivos temporários/específicos do sistema operacional: Arquivos como .DS_Store (macOS) ou arquivos de configuração do editor (a menos que esteja usando uma configuração compartilhada como .editorconfig).
- Configurações pessoais: Arquivos de configuração locais específicos da máquina do desenvolvedor.

> [!WARNING]
> **Não acrescente arquivos referentes a _hardware_ nesta pasta.** Eles deverão ser armazenados na pasta [hw](https://github.com/fcte-pi1/template/tree/main/hw) deste repositório.
